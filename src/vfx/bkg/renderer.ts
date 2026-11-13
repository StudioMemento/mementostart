import {
  BufferAttribute, BufferGeometry, Camera, CustomBlending, DynamicDrawUsage, GLSL3, HalfFloatType, InstancedBufferAttribute,
  InstancedBufferGeometry, LinearFilter, LinearMipmapLinearFilter, Mesh, NearestFilter, OneFactor, RawShaderMaterial, RGBAFormat,
  Scene, Sphere, UnsignedByteType, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget, ZeroFactor, type IUniform, type TextureDataType,
} from 'three';
import { VFX } from '../config';
import { hexTaps, plateSetFor, scrollFocus, springStep, tapCount, viewHalf, type BkgQuality, type PlateSetName } from './math';
import { disposePlate, frontAt, loadManifest, loadPlateSet, type Manifest, type PlateSet } from './plate';
import {
  BKG_COMPOSITE_FRAG, BKG_ENERGY_FRAG, BKG_ENERGY_VERT, BKG_FS_VERT, BKG_GATHER_FRAG, BKG_GLINT_FRAG, BKG_GLINT_VERT,
  BKG_MOTE_FRAG, BKG_MOTE_VERT, BKG_NEIGH_FRAG, BKG_PREP_FRAG, BKG_TILE_FRAG,
} from './shaders';

type Uniforms = Record<string, IUniform>;

/** What the engine tells the background every frame. */
export interface BkgInput {
  dt: number;
  time: number;
  /** Pointer in client px, whether it is on the page, its filtered speed and how long it has been still (s). */
  x: number; y: number; present: boolean; touch: boolean; speed: number;
  /** The pointer is over a title or a card: the background goes out of focus behind the content. */
  defocus: boolean;
  /** Page progress 0..1. */
  scroll: number;
  /** Loading progress of the engine (the sheet joins in the same six phases). */
  load: number;
  reduced: boolean;
}

interface BlurSet {
  scale: number;
  prep: WebGLRenderTarget[];
  gather: WebGLRenderTarget[];
  tile: WebGLRenderTarget;
  neigh: WebGLRenderTarget;
  at: number;
}

const QUAD = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
/** Positions are resolved in the shaders: a fixed sphere keeps three from deriving bounds it cannot use (2D attributes). */
const unbounded = <T extends BufferGeometry>(g: T) => { g.boundingSphere = new Sphere(new Vector3(), 1e6); return g; };

/**
 * The background: the obsidian world as three pre-rendered depth planes, recomposed every frame with a real depth of field.
 * It draws into the engine's frame (same context, same loop); bloom, streak and grade stay the engine's.
 *
 *  - Depth of field in plate space (resizes never recompute it), hexagonal bokeh, re-blurred only while the focus moves:
 *    at half the resolution while it travels, once at full when it lands.
 *  - Focus: the midground at rest; the surface under the pointer (dwell + hysteresis, slow spring); everything soft
 *    behind a title or a card; on touch the scroll racks it through the planes.
 *  - Glow: low at rest and breathing; the background chain reaction lights the cracks cell by cell (energy map).
 */
export class BkgRenderer {
  manifest: Manifest | null = null;
  plate: PlateSet | null = null;
  private base: string;
  private quality: BkgQuality;
  private scene = new Scene();
  private sprites = new Scene();
  private energyScene = new Scene();
  private cam = new Camera();
  private quad: Mesh<BufferGeometry, RawShaderMaterial>;
  private fine: BlurSet | null = null;
  private fast: BlurSet | null = null;
  private mPrep: RawShaderMaterial; private mTile: RawShaderMaterial; private mNeigh: RawShaderMaterial;
  private mGather: RawShaderMaterial; private mComp: RawShaderMaterial;
  private motes: Mesh<InstancedBufferGeometry, RawShaderMaterial> | null = null;
  private glints: Mesh<InstancedBufferGeometry, RawShaderMaterial> | null = null;
  private moteData = new Float32Array(0); private moteVel = new Float32Array(0);
  private energyRT: WebGLRenderTarget;
  private energyMesh: Mesh<BufferGeometry, RawShaderMaterial>;
  private energyClear = true;
  private loading: Promise<void> | null = null;
  private wanted: PlateSetName | null = null;
  private sets = new Map<PlateSetName, Promise<PlateSet>>();

  // state
  private viewPx = new Vector2(1, 1);
  private viewCss = new Vector2(1, 1);
  private half = new Vector2(VFX.bkg.viewLongHalf, 0.3);
  private cursor = new Vector2();
  private cursorS = new Vector2();
  private w = 0; private v = 0; private target = 0;
  private candidate = 0; private candidateSince = 0;
  private warm = 0;
  private reveal = 0;
  private readyAt = -1;
  private dirty = true;
  private type: TextureDataType;
  stats = { blurMs: 0, blurs: 0 };

  constructor(private renderer: WebGLRenderer, quality: BkgQuality, base = new URL(VFX.bkg.base, document.baseURI).href.replace(/\/$/, '')) {
    this.base = base;
    this.quality = quality;
    const ext = renderer.extensions;
    this.type = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float') ? HalfFloatType : UnsignedByteType;
    const g = unbounded(new BufferGeometry());
    g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new Mesh(g, undefined as unknown as RawShaderMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const encC = { value: 0.6 };
    this.mPrep = this.raw(BKG_PREP_FRAG, {
      uEncC: encC, tKGA: { value: null }, tDepth: { value: null }, uLayer: { value: 0 }, uSrcTexel: { value: new Vector2() },
      uDown: { value: 2 }, uFocusW: { value: 0 }, uCocK: { value: 1 }, uMaxCoc: { value: 16 },
    });
    this.mTile = this.raw(BKG_TILE_FRAG, { t0: { value: null }, t1: { value: null }, t2: { value: null }, uSrcSize: { value: new Vector2() } });
    this.mNeigh = this.raw(BKG_NEIGH_FRAG, { tTile: { value: null } });
    this.mGather = this.raw(BKG_GATHER_FRAG, {
      tPrep: { value: null }, tNeigh: { value: null }, uLayer: { value: 0 }, uTaps: { value: 1 }, uRings: { value: 1 },
      uOff: { value: hexTaps(6) }, uTexel: { value: new Vector2() },
    });
    const B = VFX.bkg;
    this.energyRT = new WebGLRenderTarget(4, 4, { type: this.type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    this.mComp = this.raw(BKG_COMPOSITE_FRAG, {
      uEncC: encC,
      tKGA0: { value: null }, tKGA1: { value: null }, tKGA2: { value: null },
      tBlur0: { value: null }, tBlur1: { value: null }, tBlur2: { value: null },
      tDepth: { value: null }, tEnergy: { value: this.energyRT.texture },
      uHalf: { value: this.half }, uPlateExt: { value: new Vector2(0.56, 0.42) },
      uDolly: { value: new Vector3(1, 1, 1) }, uShiftY: { value: new Vector3() },
      uCursor: { value: this.cursorS }, uCursorR: { value: B.lift.radius }, uLift: { value: new Vector3() },
      uFocusW: { value: 0 }, uCocKBlur: { value: 1 },
      uKeyLayer: { value: new Vector3(...B.key.layer) }, uGlowLayer: { value: new Vector3(...B.glowLayer) },
      uKeyGain: { value: B.key.gain }, uGlowGain: { value: B.glow.rest }, uEnergyGain: { value: B.glow.energy },
      uKeyTint: { value: new Vector3(...B.key.tint) }, uReveal: { value: 0 }, uEmissive: { value: 0 }, uTransparent: { value: 0 },
    });
    // the energy map: the background chain reaction rasterised (client px -> a small screen-space texture)
    this.energyMesh = new Mesh(unbounded(new BufferGeometry()), new RawShaderMaterial({
      glslVersion: GLSL3, vertexShader: BKG_ENERGY_VERT, fragmentShader: BKG_ENERGY_FRAG,
      uniforms: { uView: { value: this.viewCss } }, depthTest: false, depthWrite: false,
    }));
    this.energyMesh.frustumCulled = false;
    this.energyScene.add(this.energyMesh);
    this.setQuality(quality);
  }

  private raw(frag: string, uniforms: Uniforms) {
    return new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: BKG_FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  }

  private rt(w: number, h: number, mip = false, nearest = false) {
    return new WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: this.type, format: RGBAFormat, depthBuffer: false, generateMipmaps: mip,
      minFilter: mip ? LinearMipmapLinearFilter : nearest ? NearestFilter : LinearFilter, magFilter: nearest ? NearestFilter : LinearFilter,
    });
  }

  private blurSet(scale: number): BlurSet {
    const p = this.plate!.info;
    const bw = Math.max(8, Math.round(p.w * scale)), bh = Math.max(8, Math.round(p.h * scale));
    return {
      scale,
      prep: [0, 1, 2].map(() => this.rt(bw, bh, true)),
      gather: [0, 1, 2].map(() => this.rt(bw, bh)),
      tile: this.rt(Math.ceil(bw / 8), Math.ceil(bh / 8), false, true),
      neigh: this.rt(Math.ceil(bw / 8), Math.ceil(bh / 8)),
      at: -99,
    };
  }

  private static drop(b: BlurSet | null) {
    if (b) [...b.prep, ...b.gather, b.tile, b.neigh].forEach(t => t.dispose());
  }

  /* ------------------------------------------------------------------ loading */

  /** Starts loading the manifest and the plate for the current viewport. Resolves when the first plate is on the GPU. */
  load(): Promise<void> {
    this.loading ??= (async () => {
      this.manifest = await loadManifest(this.base);
      this.mComp.uniforms.uEncC.value = this.manifest.encC;   // shared with the prep pass
      await this.ensureSet();
    })();
    return this.loading;
  }

  get ready() { return !!this.plate; }

  private getSet(name: PlateSetName) {
    if (!this.sets.has(name)) this.sets.set(name, loadPlateSet(this.base, name, this.manifest!.sets[name]));
    return this.sets.get(name)!;
  }

  /** Picks the plate for the viewport: only an orientation change (or a quality step) swaps it. */
  private async ensureSet() {
    if (!this.manifest) return;
    const name = plateSetFor(this.viewCss.x, this.viewCss.y, this.quality);
    if (this.plate?.name === name || this.wanted === name) return;
    this.wanted = name;
    const set = await this.getSet(name);
    if (this.wanted !== name) return;
    const old = this.plate;
    this.plate = set;
    if (old && old !== set) { disposePlate(old); this.sets.delete(old.name); }
    this.applyPlate();
    if (this.readyAt < 0) this.readyAt = performance.now() / 1000;
  }

  private applyPlate() {
    const p = this.plate!, q = VFX.bkg.quality[this.quality];
    BkgRenderer.drop(this.fine); BkgRenderer.drop(this.fast);
    this.fine = this.blurSet(q.blurScale);
    this.fast = q.blurScale >= 0.5 ? this.blurSet(q.blurScale / 2) : null;
    const u = this.mComp.uniforms;
    u.tKGA0.value = p.kga[0]; u.tKGA1.value = p.kga[1]; u.tKGA2.value = p.kga[2]; u.tDepth.value = p.depth;
    (u.uPlateExt.value as Vector2).set(...p.info.ext);
    this.mGather.uniforms.uTaps.value = tapCount(q.rings);
    this.mGather.uniforms.uRings.value = q.rings;
    this.buildMotes();
    this.buildGlints();
    if (this.w === 0) this.w = this.target = VFX.bkg.focus.defocusW;
    this.dirty = true;
  }

  setQuality(q: BkgQuality) {
    if (q === this.quality && (this.fine || !this.plate)) return;
    this.quality = q;
    if (this.plate) { this.applyPlate(); void this.ensureSet(); }
  }

  /* ------------------------------------------------------------------ layout */

  /** Drawing buffer and CSS size of the frame. Cheap: no content is re-rendered. */
  viewport(pxW: number, pxH: number, cssW: number, cssH: number) {
    this.viewPx.set(pxW, pxH);
    this.viewCss.set(cssW, cssH);
    this.half.set(...viewHalf(cssW, cssH, VFX.bkg.viewLongHalf, VFX.bkg.viewShortCap));
    const s = VFX.bkg.energy.scale;
    this.energyRT.setSize(Math.max(2, Math.round(pxW * s)), Math.max(2, Math.round(pxH * s)));
    this.energyClear = true;
    this.dirty = true;
    void this.ensureSet();
  }

  /** The background chain reaction's cells (client px) and their energy attribute, written by the engine. */
  setEnergyNetwork(position: Float32Array, energy: BufferAttribute) {
    const g = unbounded(new BufferGeometry());
    g.setAttribute('position', new BufferAttribute(position, 2));
    g.setAttribute('energy', energy);
    this.energyMesh.geometry.dispose();
    this.energyMesh.geometry = g;
    this.energyClear = true;
  }

  /** Redraws the energy map (only while the reaction is lit, once more when it goes out). */
  drawEnergy(active: boolean) {
    const r = this.renderer;
    if (!active && !this.energyClear) return;
    r.setRenderTarget(this.energyRT);
    r.clear();
    if (active) r.render(this.energyScene, this.cam);
    this.energyClear = active;
  }

  /* ------------------------------------------------------------------ frame */

  private cocScales(scale: number) {
    const long = Math.max(this.viewPx.x, this.viewPx.y), C = VFX.bkg.coc;
    const kScreen = C.relPerW * long, maxScreen = C.maxRel * long;
    const info = this.plate!.info;
    const ratio = info.w / (2 * info.ext[0]) / (this.viewPx.x / (2 * this.half.x));
    return { kScreen, maxScreen, kBlur: kScreen * ratio * scale, maxBlur: maxScreen * ratio * scale };
  }

  /** True while something changes frame to frame (focus travelling, loading): the engine keeps drawing. */
  get animating() {
    // `dirty`: a plate just arrived or the frame changed: draw at least once, even when nothing else moves (reduced motion)
    return !!this.plate && (this.dirty || this.reveal < 1 || Math.abs(this.v) > 0.004 || Math.abs(this.w - this.target) > 0.002 || this.warm > 0.01);
  }

  update(inp: BkgInput) {
    const p = this.plate, m = this.manifest;
    if (!p || !m) return;
    const B = VFX.bkg, F = B.focus, P = m.planes, dt = Math.min(inp.dt, 0.05), t = inp.time;
    // the sheet joins with the page: cracks (the lattice) first, then the faces, while the focus racks in
    const own = this.readyAt < 0 ? 0 : (performance.now() / 1000 - this.readyAt) / VFX.loading.duration;
    this.reveal = inp.reduced ? 1 : Math.min(1, inp.load, Math.max(0, own));

    // scroll: each plane its own dolly and drift; the focus slides deeper
    const s = inp.scroll, u = this.mComp.uniforms;
    (u.uDolly.value as Vector3).set(1 + s * B.scroll.dolly[0], 1 + s * B.scroll.dolly[1], 1 + s * B.scroll.dolly[2]);
    (u.uShiftY.value as Vector3).set(-s * B.scroll.shift[0], -s * B.scroll.shift[1], -s * B.scroll.shift[2]);
    const wRest = P.mg + (P.bg - P.mg) * B.scroll.focusDeeper * s;

    // pointer, in tan
    const cw = this.viewCss.x, ch = this.viewCss.y;
    this.cursor.set(((inp.x / cw) * 2 - 1) * this.half.x, (1 - (inp.y / ch) * 2) * this.half.y);
    this.cursorS.lerp(this.cursor, 1 - Math.exp(-dt * 10));
    const on = inp.present ? Math.min(1, 0.35 + inp.speed / 900) : 0;
    this.warm += (on - this.warm) * (1 - Math.exp(-dt * 3));

    // focus
    let target = wRest;
    if (this.reveal < 0.2) target = F.defocusW;
    else if (inp.touch) target = scrollFocus(s, P);
    else if (inp.defocus) target = F.defocusW;
    else if (inp.present) {
      const dz = (u.uDolly.value as Vector3).y, sy = (u.uShiftY.value as Vector3).y, ext = p.info.ext;
      const c = frontAt(p, this.cursor.x / dz / (2 * ext[0]) + 0.5, (this.cursor.y / dz + sy) / (2 * ext[1]) + 0.5);
      if (c > 0) {
        if (Math.abs(c - this.candidate) > F.hysteresis) { this.candidate = c; this.candidateSince = t; }
        target = t - this.candidateSince > F.dwell || Math.abs(this.candidate - this.target) < F.hysteresis ? this.candidate : this.target;
      }
    }
    this.target = target;
    if (inp.reduced) { this.w = target; this.v = 0; }
    else [this.w, this.v] = springStep(this.w, this.v, target, dt, F.period, F.damping);

    // glow at rest, breathing slowly; the shards near the pointer lift a little
    const br = B.glow.breathe;
    const breathe = inp.reduced ? 0 : br[0] * Math.sin((2 * Math.PI * t) / br[1]) + br[2] * Math.sin((2 * Math.PI * t) / br[3] + 1.3);
    u.uGlowGain.value = B.glow.rest * (1 + breathe);
    const lift = inp.reduced || inp.touch ? 0 : this.warm;
    (u.uLift.value as Vector3).set(B.lift.amount[0] * lift, B.lift.amount[1] * lift, B.lift.amount[2] * lift);
    u.uFocusW.value = this.w;
    u.uReveal.value = this.reveal;

    // motes drift upward, slowly
    if (!inp.reduced && this.motes) {
      const ext = p.info.ext, d = this.moteData, n = d.length / 4;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        d[o] += (this.moteVel[i * 2] + 0.0015 * Math.sin(t * 0.3 + i)) * dt;
        d[o + 1] += this.moteVel[i * 2 + 1] * dt;
        if (d[o + 1] > ext[1]) d[o + 1] = -ext[1];
        if (d[o] > ext[0]) d[o] = -ext[0];
        if (d[o] < -ext[0]) d[o] = ext[0];
      }
      (this.motes.geometry.getAttribute('iPos') as InstancedBufferAttribute).needsUpdate = true;
    }
    const { kScreen, maxScreen } = this.cocScales(this.fine!.scale);
    for (const mesh of [this.motes, this.glints]) {
      if (!mesh) continue;
      const mu = mesh.material.uniforms;
      mu.uFocusW.value = this.w; mu.uCocKPx.value = kScreen; mu.uTime.value = t; mu.uReveal.value = this.reveal;
      if (mu.uMaxCocPx) mu.uMaxCocPx.value = maxScreen;
      if (mu.uDollyAmt) mu.uDollyAmt.value = s * 0.08;
    }
  }

  private pass(m: RawShaderMaterial, target: WebGLRenderTarget | null) {
    this.quad.material = m;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.cam);
  }

  private blur(b: BlurSet) {
    const t0 = performance.now(), p = this.plate!;
    const { kBlur, maxBlur } = this.cocScales(b.scale);
    const up = this.mPrep.uniforms;
    up.tDepth.value = p.depth;
    (up.uSrcTexel.value as Vector2).set(1 / p.info.w, 1 / p.info.h);
    up.uDown.value = 1 / b.scale; up.uFocusW.value = this.w; up.uCocK.value = kBlur; up.uMaxCoc.value = maxBlur;
    for (let L = 0; L < 3; L++) { up.tKGA.value = p.kga[L]; up.uLayer.value = L; this.pass(this.mPrep, b.prep[L]); }
    const ut = this.mTile.uniforms;
    ut.t0.value = b.prep[0].texture; ut.t1.value = b.prep[1].texture; ut.t2.value = b.prep[2].texture;
    (ut.uSrcSize.value as Vector2).set(b.prep[0].width, b.prep[0].height);
    this.pass(this.mTile, b.tile);
    this.mNeigh.uniforms.tTile.value = b.tile.texture;
    this.pass(this.mNeigh, b.neigh);
    const ug = this.mGather.uniforms;
    ug.tNeigh.value = b.neigh.texture;
    (ug.uTexel.value as Vector2).set(1 / b.prep[0].width, 1 / b.prep[0].height);
    for (let L = 0; L < 3; L++) { ug.tPrep.value = b.prep[L].texture; ug.uLayer.value = L; this.pass(this.mGather, b.gather[L]); }
    b.at = this.w;
    this.stats.blurMs = performance.now() - t0; this.stats.blurs++;
  }

  /** Re-blurs if the focus moved enough to change a CoC by a fraction of a texel; picks the set the composite reads. */
  private prepare() {
    const fine = this.fine!, fast = this.fast;
    if (this.dirty) { fine.at = -99; if (fast) fast.at = -99; this.dirty = false; }
    const moving = Math.abs(this.v) > 0.01 || Math.abs(this.w - this.target) > 0.004;
    let set = fine;
    if (moving && fast) {
      if (Math.abs(this.w - fast.at) * this.cocScales(fast.scale).kBlur > 0.15) this.blur(fast);
      set = fast;
    } else if (Math.abs(this.w - fine.at) * this.cocScales(fine.scale).kBlur > 0.2) this.blur(fine);
    const u = this.mComp.uniforms;
    u.tBlur0.value = set.gather[0].texture; u.tBlur1.value = set.gather[1].texture; u.tBlur2.value = set.gather[2].texture;
    u.uCocKBlur.value = this.cocScales(set.scale).kBlur;
  }

  /**
   * Draws the sheet into the engine's frame target (replacing its content), then the motes and glints over it.
   * With `emissive` only what the chain reaction emits is drawn (the bloom pass). Leaves the renderer on `target`.
   */
  render(target: WebGLRenderTarget, opts: { emissive?: boolean; transparent?: boolean } = {}) {
    const r = this.renderer;
    if (!this.plate) { r.setRenderTarget(target); return; }
    const auto = r.autoClear;
    r.autoClear = false;
    if (!opts.emissive) this.prepare();
    const u = this.mComp.uniforms;
    u.uEmissive.value = opts.emissive ? 1 : 0;
    u.uTransparent.value = opts.transparent ? 1 : 0;
    this.pass(this.mComp, target);
    r.render(this.sprites, this.cam);
    r.autoClear = auto;
  }

  /* ------------------------------------------------------------------ motes and glints */

  private sprite(vertex: string, fragment: string, uniforms: Uniforms, count: number, pos: Float32Array, vary: Float32Array) {
    const geo = unbounded(new InstancedBufferGeometry());
    geo.setAttribute('position', new BufferAttribute(QUAD, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('iPos', new InstancedBufferAttribute(pos, 4).setUsage(DynamicDrawUsage));
    geo.setAttribute('iVar', new InstancedBufferAttribute(vary, 4));
    geo.instanceCount = count;
    const m = new RawShaderMaterial({
      glslVersion: GLSL3, vertexShader: vertex, fragmentShader: fragment, uniforms,
      transparent: true, depthTest: false, depthWrite: false, blending: CustomBlending,
      blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor,
    });
    const mesh = new Mesh(geo, m);
    mesh.frustumCulled = false;
    this.sprites.add(mesh);
    return mesh;
  }

  private dropSprite(mesh: Mesh<InstancedBufferGeometry, RawShaderMaterial> | null) {
    if (!mesh) return;
    this.sprites.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose();
  }

  private buildMotes() {
    this.dropSprite(this.motes);
    const p = this.plate!, P = this.manifest!.planes, ext = p.info.ext, n = VFX.bkg.motes[this.quality];
    const pos = new Float32Array(n * 4), vr = new Float32Array(n * 4);
    this.moteVel = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const near = Math.random() < 0.75;
      pos.set([(Math.random() * 2 - 1) * ext[0], (Math.random() * 2 - 1) * ext[1],
        near ? P.mg + (P.fg + 0.25 - P.mg) * Math.random() : P.bg + (P.mg - P.bg) * Math.random(), 1.4 + Math.random() * 1.8], i * 4);
      vr.set([0.35 + Math.random() ** 2 * 2.6, Math.random(), 0.6 + Math.random() * 1.8, Math.random() < 0.2 ? 1 : 0], i * 4);
      this.moteVel[i * 2] = (Math.random() - 0.5) * 0.004;
      this.moteVel[i * 2 + 1] = 0.002 + Math.random() * 0.006;
    }
    this.moteData = pos;
    this.motes = this.sprite(BKG_MOTE_VERT, BKG_MOTE_FRAG, {
      uHalf: { value: this.half }, uViewPx: { value: this.viewPx }, uFocusW: { value: 0 }, uCocKPx: { value: 1 }, uMaxCocPx: { value: 30 },
      uTime: { value: 0 }, uDollyAmt: { value: 0 }, tDepth: { value: p.depth }, tKGA1: { value: p.kga[1] }, tKGA2: { value: p.kga[2] },
      uPlateExt: { value: new Vector2(...ext) }, uRot: { value: VFX.bkg.motes.rot }, uReveal: { value: 0 },
    }, n, pos, vr);
  }

  private buildGlints() {
    this.dropSprite(this.glints);
    const gl = this.plate!.glints, n = gl.length;
    const pos = new Float32Array(n * 4), vr = new Float32Array(n * 4);
    gl.forEach((g, i) => {
      pos.set([g.x, g.y, g.w, g.layer], i * 4);
      vr.set([g.s * (0.6 + Math.random() * 0.8), Math.random(), 3.5 + Math.random() * 8, 5 + Math.random() * 9], i * 4);
    });
    const u = this.mComp.uniforms;
    this.glints = this.sprite(BKG_GLINT_VERT, BKG_GLINT_FRAG, {
      uHalf: { value: this.half }, uViewPx: { value: this.viewPx }, uFocusW: { value: 0 }, uCocKPx: { value: 1 }, uTime: { value: 0 },
      uDolly: u.uDolly, uShiftY: u.uShiftY, tEnergy: { value: this.energyRT.texture }, uEnergyBoost: { value: VFX.bkg.glints.energyBoost },
      uReveal: { value: 0 },
    }, n, pos, vr);
  }

  /* ------------------------------------------------------------------ */

  get focus() { return { w: this.w, target: this.target }; }

  dispose() {
    BkgRenderer.drop(this.fine); BkgRenderer.drop(this.fast);
    this.dropSprite(this.motes); this.dropSprite(this.glints);
    disposePlate(this.plate);
    [this.mPrep, this.mTile, this.mNeigh, this.mGather, this.mComp, this.energyMesh.material].forEach(m => m.dispose());
    this.energyMesh.geometry.dispose(); this.quad.geometry.dispose(); this.energyRT.dispose();
  }
}
