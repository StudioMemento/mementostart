import gsap from 'gsap';
import {
  BufferAttribute, BufferGeometry, CanvasTexture, DataTexture, DoubleSide, DynamicDrawUsage, GLSL3, InstancedBufferGeometry,
  InstancedInterleavedBuffer, InterleavedBufferAttribute, LinearFilter, Mesh, NoColorSpace, PerspectiveCamera,
  RawShaderMaterial, RedFormat, Scene, Sphere, Texture, UnsignedByteType, Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget, type IUniform,
} from 'three';
import { BorderLight, outline } from './border';
import { ChainField } from './chain';
import { VFX, gradientRange, hexToRgb, type ChainProfile, type QualityName } from './config';
import { buildArch, buildNetwork, hashString, type Arch, type SurfaceNetwork } from './geometry';
import { PointerField } from './input';
import { GPU_STRIDE, Particles } from './particles';
import { collect, distanceField, imageFit, paint } from './raster';
import type { SurfaceOptions, SurfaceRegistry } from './registry';
import { ScrollState } from './scroll';
import {
  BG_FRAG, BG_VERT, BLUR_FRAG, COMPOSITE_FRAG, FS_VERT, OVERLAY_CARD_FRAG, OVERLAY_TITLE_FRAG, OVERLAY_VERT,
  PART_FRAG, PART_VERT, SURFACE_FRAG, SURFACE_VERT,
} from './shaders';
import { loadingDelay } from './structure';

type Uniforms = Record<string, IUniform>;

interface Surface {
  el: HTMLElement;
  opt: SurfaceOptions;
  index: number;
  u: Uniforms;
  content: Mesh<BufferGeometry, RawShaderMaterial>;
  overlay: Mesh<BufferGeometry, RawShaderMaterial>;
  x: number; y: number; w: number; h: number;        // document px
  cellKey: string; netKey: string;
  net: SurfaceNetwork | null; chain: ChainField | null; energy: BufferAttribute | null;
  border: BorderLight | null; edgeCells: { cell: number; s: number; w: number }[];
  born: Uint8Array | null; delays: Float32Array | null;
  canvas: HTMLCanvasElement;
  ink: CanvasTexture | null;
  dist: DataTexture | null;
  img: Texture | null; imgSrc: string;
  alpha: { alpha: Uint8Array; aw: number; ah: number; ascale: number } | null;
  fontSize: number;
  hover: number; inside: boolean; debt: number; budget: number; hot: boolean;
  version: number;
  ready: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const root = () => document.documentElement;
/** Positions are resolved in the shaders: a fixed sphere keeps three from deriving bounds it cannot use. */
const unbounded = <T extends BufferGeometry>(g: T) => { g.boundingSphere = new Sphere(new Vector3(), 1e6); return g; };
const BARY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const barycentric = (triangles: number) => {
  const a = new Float32Array(triangles * 9);
  for (let i = 0; i < a.length; i++) a[i] = BARY[i % 9];
  return a;
};
const tmp = new Vector3();

/**
 * VFX engine: one persistent WebGL context, one update loop (the GSAP ticker).
 *
 * One material, one energy. The background is a 3D graphite surface seen in perspective; every surface of the page
 * (titles, cards with their photographs and labels) has a monochrome representation for structure and an overlay for
 * energy. Energy is the same thing everywhere: amber light carried by a chain reaction across a network of cells,
 * started by pointer, touch, focus and loading, ending on its own. Scroll moves the structure, never the light.
 *
 * The DOM stays the source of truth for layout, semantics and input. While the GPU representation is live
 * (`html.vfx-live`) the DOM paint of registered surfaces is switched off, so nothing is drawn twice.
 */
export class VfxEngine {
  static create(canvas: HTMLCanvasElement, registry: SurfaceRegistry): VfxEngine | null {
    try {
      return new VfxEngine(canvas, registry);
    } catch (error) {
      console.warn('Memento VFX disabled:', error);
      root().classList.remove('vfx-boot', 'vfx-live');
      root().classList.add('vfx-off');
      return null;
    }
  }

  private renderer: WebGLRenderer;
  private scene = new Scene();
  private post = new Scene();
  private camera = new PerspectiveCamera(VFX.background.fov, 1, 0.02, 400);
  private globals: Uniforms;
  private bg: Mesh<BufferGeometry, RawShaderMaterial>;
  private arch: Arch | null = null;
  private bgChain: ChainField | null = null;
  private bgEnergy: BufferAttribute | null = null;
  private lastScroll = 0;
  private bgKey = ''; private bgDebt = 0; private bgHot = false; private bgStage = 0;
  private still = 0;
  private parts = new Particles();
  private partGeo = new InstancedBufferGeometry();
  private partBuf: InstancedInterleavedBuffer;
  private partMesh: Mesh;
  private rtE: WebGLRenderTarget; private rtA: WebGLRenderTarget; private rtB: WebGLRenderTarget;
  private blur: RawShaderMaterial; private composite: RawShaderMaterial; private fsMesh: Mesh<BufferGeometry, RawShaderMaterial>;

  private surfaces = new Map<HTMLElement, Surface>();
  private byIndex: Surface[] = [];
  private input = new PointerField();
  private scroll: ScrollState;
  private hovered: Surface | null = null;
  private viewH = 1;
  private clock = 0; private frame = 0;
  private load = { value: 0 };
  private loadTween: gsap.core.Tween | null = null;
  private live = false; private loaded = false; private lost = false; private destroyed = false;
  private layoutDirty = true; private renderDirty = true;
  private quality: QualityName = 'high'; private pinned = false;
  private slow = 0; private frames = 0;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly abort = new AbortController();
  private cleanups: (() => void)[] = [];
  private nextIndex = 0;

  private constructor(private canvas: HTMLCanvasElement, private registry: SurfaceRegistry) {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, depth: true, stencil: false, powerPreference: 'high-performance' });
    if (!renderer.capabilities.isWebGL2) { renderer.dispose(); throw new Error('WebGL2 unavailable'); }
    this.renderer = renderer;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) this.quality = 'low';
    else if (matchMedia('(pointer: coarse)').matches) this.quality = 'medium';
    // ?vfx=high|medium|low pins a quality profile (useful when comparing devices)
    const pin = new URLSearchParams(location.search).get('vfx');
    if (pin && pin in VFX.quality) { this.quality = pin as QualityName; this.pinned = true; }

    const A = VFX.color.amber;
    this.globals = {
      uTime: { value: 0 }, uMotion: { value: this.reduced ? 0 : 1 },
      uAmb: { value: [...hexToRgb(A.deep), ...hexToRgb(A.mid), ...hexToRgb(A.hot), ...hexToRgb(A.core)] },
      uEmissive: { value: 0 },
      uView: { value: new Vector2(1, 1) }, uScroll: { value: 0 },
      uBand: { value: 120 }, uBandK: { value: new Vector2(0, 0) }, uLoad: { value: 0 },
      uDrift: { value: new Vector3(0, VFX.scroll.drift, VFX.scroll.fade) },
    };

    // background: a real 3D surface with depth, drawn first
    this.bg = new Mesh(unbounded(new BufferGeometry()), new RawShaderMaterial({
      glslVersion: GLSL3, vertexShader: BG_VERT, fragmentShader: BG_FRAG, side: DoubleSide,
      depthTest: true, depthWrite: true, transparent: false,
      uniforms: {
        ...this.globals, uBase: { value: [...VFX.color.base] }, uZ: { value: new Vector2(1, 10) }, uFog: { value: VFX.background.fog }, uAlpha: { value: 0 },
        uLight: { value: new Float32Array(VFX.background.lights.flat()) }, uShade: { value: new Vector4(...VFX.background.shade) }, uFall: { value: VFX.background.falloff }, uGloss: { value: new Vector3(...VFX.background.gloss) },
        uBand: { value: new Vector3(1, 0.4, VFX.background.centre) },
      },
    }));
    this.bg.frustumCulled = false; this.bg.renderOrder = 0;
    this.scene.add(this.bg);

    // particles
    const corner = new Float32Array([0, -1, 0.9, 0.62, -0.9, 0.62]);
    this.partGeo.setAttribute('corner', new BufferAttribute(corner, 2));
    this.partGeo.setAttribute('cbary', new BufferAttribute(new Float32Array(BARY), 3));
    this.partBuf = new InstancedInterleavedBuffer(this.parts.gpu, GPU_STRIDE);
    this.partBuf.setUsage(DynamicDrawUsage);
    this.partGeo.setAttribute('aP', new InterleavedBufferAttribute(this.partBuf, 4, 0));
    this.partGeo.setAttribute('aL', new InterleavedBufferAttribute(this.partBuf, 3, 4));
    this.partGeo.instanceCount = 0; unbounded(this.partGeo);
    this.partMesh = new Mesh(this.partGeo, this.material(PART_VERT, PART_FRAG, {}));
    this.partMesh.renderOrder = 1000; this.partMesh.frustumCulled = false;
    this.scene.add(this.partMesh);

    // selective bloom: only the emission pass is blurred and added back
    const rt = (depth: boolean) => new WebGLRenderTarget(4, 4, { depthBuffer: depth, minFilter: LinearFilter, magFilter: LinearFilter });
    this.rtE = rt(true); this.rtA = rt(false); this.rtB = rt(false);
    const fs = unbounded(new BufferGeometry());
    fs.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 3, -1, -1, 3]), 2));
    const raw = (frag: string, uniforms: Uniforms) => new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.blur = raw(BLUR_FRAG, { uTex: { value: null }, uStep: { value: new Vector2() } });
    this.composite = raw(COMPOSITE_FRAG, { uTex: { value: null }, uStrength: { value: VFX.bloom.strength } });
    this.composite.transparent = true; this.composite.premultipliedAlpha = true;
    this.fsMesh = new Mesh(fs, this.blur);
    this.fsMesh.frustumCulled = false;
    this.post.add(this.fsMesh);

    root().classList.add('vfx-ready');
    this.scroll = new ScrollState(() => { this.renderDirty = true; });
    this.listen();
    if (import.meta.env.DEV) Object.assign(window, { __vfx: this, __VFX: VFX });
    gsap.ticker.add(this.tick);
    void this.start();
  }

  private material(vertexShader: string, fragmentShader: string, own: Uniforms) {
    return new RawShaderMaterial({
      glslVersion: GLSL3, vertexShader, fragmentShader, uniforms: { ...this.globals, ...own },
      transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false, side: DoubleSide,
    });
  }

  destroy() {
    this.destroyed = true;
    gsap.ticker.remove(this.tick);
    this.loadTween?.kill();
    this.abort.abort();
    this.cleanups.forEach(f => f());
    this.scroll.destroy();
    this.surfaces.forEach(s => this.dropSurface(s));
    this.surfaces.clear();
    this.bg.geometry.dispose(); this.bg.material.dispose();
    this.partGeo.dispose(); (this.partMesh.material as RawShaderMaterial).dispose();
    this.fsMesh.geometry.dispose(); this.blur.dispose(); this.composite.dispose();
    this.rtE.dispose(); this.rtA.dispose(); this.rtB.dispose();
    this.renderer.dispose();
    root().classList.remove('vfx-live', 'vfx-boot', 'vfx-ready');
  }

  /* ------------------------------------------------------------------ lifecycle */

  /** GPU representation goes live only when fonts, measures and the first textures are ready. */
  private async start() {
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    await Promise.race([document.fonts.ready, wait(1500)]);
    if (this.destroyed) return;
    this.layout();
    const first = [...this.surfaces.values()].filter(s => s.y < scrollY + this.viewH * 1.2 && s.y + s.h > scrollY - 100);
    const images = first.map(s => s.el.querySelector<HTMLImageElement>('img.is-active, img')).filter((i): i is HTMLImageElement => !!i && !i.complete);
    await Promise.race([Promise.all([...images.map(i => i.decode().catch(() => {})), this.whenPainted(first)]), wait(1400)]);
    if (this.destroyed) return;
    this.layout();
    await Promise.race([this.whenPainted(first), wait(400)]);
    if (this.destroyed || this.lost) return;
    this.goLive();
    if (this.reduced) { this.load.value = 1; this.loaded = true; return; }
    // Cellule > Unione > Assestamento > Presente. Any interaction shortens it; nothing is queued behind it.
    this.loadTween = gsap.to(this.load, {
      value: 1, duration: VFX.loading.duration, ease: 'power1.inOut',
      onComplete: () => { this.loaded = true; this.loadTween = null; },
    });
    const hurry = () => this.loadTween?.timeScale(VFX.loading.hurry);
    for (const type of ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const) addEventListener(type, hurry, { once: true, passive: true, signal: this.abort.signal });
  }

  private whenPainted(list: Surface[]) {
    return new Promise<void>(resolve => {
      const check = () => (this.destroyed || list.every(s => s.ready) ? resolve() : setTimeout(check, 30));
      check();
    });
  }

  private goLive() { this.live = true; root().classList.add('vfx-live'); root().classList.remove('vfx-boot'); this.renderDirty = true; }
  /** Any failure returns the page to its plain DOM rendering at once. */
  private goDom() { this.live = false; root().classList.remove('vfx-live', 'vfx-boot'); }

  private listen() {
    const signal = this.abort.signal, passive = { passive: true, signal } as const;
    const input = this.input;
    addEventListener('pointermove', e => input.move(e.clientX, e.clientY, e.pointerType === 'touch'), passive);
    addEventListener('pointerdown', e => {
      input.move(e.clientX, e.clientY, e.pointerType === 'touch');
      if (e.pointerType !== 'mouse') this.pulseAt(e.clientX, e.clientY + scrollY, 0.9, 4);
    }, passive);
    // a lifted finger leaves one local impulse that travels and decays; a cancelled gesture leaves none
    addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { this.pulseAt(e.clientX, e.clientY + scrollY, 1, 5); input.leave(); } }, passive);
    addEventListener('pointercancel', () => { input.cancel(); this.surfaces.forEach(s => s.chain?.quench()); this.bgChain?.quench(); }, passive);
    addEventListener('blur', () => input.leave(), passive);
    root().addEventListener('mouseleave', () => input.leave(), passive);
    document.addEventListener('pointerover', e => { if ((e.target as Element)?.tagName === 'IFRAME') input.leave(); }, passive);
    // keyboard: a short accent where focus lands; the neutral focus ring is the DOM's own
    document.addEventListener('focusin', e => {
      const el = e.target as Element;
      if (!el.matches?.(':focus-visible')) return;
      const r = el.getBoundingClientRect();
      this.pulseAt(r.left + r.width / 2, r.top + r.height / 2 + scrollY, 0.7, 3);
    }, passive);
    addEventListener('resize', () => { this.layoutDirty = true; }, passive);
    document.fonts.addEventListener?.('loadingdone', () => { this.layoutDirty = true; }, { signal });
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.goDom(); }, { signal });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.surfaces.forEach(s => { if (s.ink) s.ink.needsUpdate = true; if (s.dist) s.dist.needsUpdate = true; if (s.img) s.img.needsUpdate = true; });
      this.layoutDirty = true;
      if (this.loaded) this.goLive();
    }, { signal });

    const observer = new ResizeObserver(() => { this.layoutDirty = true; });
    observer.observe(root());
    const main = document.querySelector('main');
    if (main) observer.observe(main);
    this.cleanups.push(() => observer.disconnect());
    this.cleanups.push(this.registry.subscribe((_reason, target, strength) => {
      this.layoutDirty = true;
      if (target && strength) {
        const r = target.getBoundingClientRect();
        this.pulseAt(r.left + r.width * 0.3, r.top + r.height * 0.45 + scrollY, strength, 6, Math.min(r.width, r.height) * 0.3);
      }
    }));
    // lazy images arrive later: their texture is created when they do
    document.addEventListener('load', e => { if ((e.target as Element)?.tagName === 'IMG') this.layoutDirty = true; }, { capture: true, signal });
  }

  /** One local impulse (touch, focus, accordion): lights cells under a document point; the chain does the rest. */
  private pulseAt(x: number, y: number, strength: number, count: number, spread = 40) {
    for (const s of this.surfaces.values()) {
      if (!s.chain || x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) continue;
      for (let i = 0; i < count; i++) s.chain.igniteAt(x - s.x, y - s.y, spread, strength * rand(0.8, 1));
      return;
    }
  }

  /* ------------------------------------------------------------------ layout and surfaces */

  private profile() { return VFX.quality[this.quality]; }

  private layout() {
    this.layoutDirty = false; this.renderDirty = true;
    const w = root().clientWidth, h = innerHeight;
    this.viewH = h;
    const q = this.profile();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.dpr));
    this.renderer.setSize(w, h, false);
    const bw = Math.max(2, Math.round(w * VFX.bloom.scale)), bh = Math.max(2, Math.round(h * VFX.bloom.scale));
    this.rtE.setSize(bw, bh); this.rtA.setSize(bw, bh); this.rtB.setSize(bw, bh);
    this.parts.limit = Math.round(VFX.particles.pool * q.particles);
    this.scroll.measure(h);
    (this.globals.uView.value as Vector2).set(w, h);
    this.globals.uBand.value = this.scroll.bandPx;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const bgKey = `${Math.round((w / h) * 50)}|${Math.round(h / 40)}|${this.quality}`;
    if (bgKey !== this.bgKey) { this.bgKey = bgKey; this.buildBackground(w / h, h); }
    const column = document.querySelector('.content-width')?.getBoundingClientRect();
    const bu = this.bg.material.uniforms.uBand.value as Vector3;
    bu.set(this.renderer.getContext().drawingBufferWidth, column ? Math.min(0.5, column.width / 2 / w) : 0.4, VFX.background.centre);

    // DOM colours and opacities are read in their normal state, then the GPU representation takes over again
    const live = this.live;
    if (live) root().classList.remove('vfx-live');
    const sx = scrollX, sy = scrollY;
    const seen = new Set<HTMLElement>();
    this.registry.surfaces.forEach((opt, el) => {
      seen.add(el);
      const r = el.getBoundingClientRect();
      let s = this.surfaces.get(el);
      if (!s) { s = this.addSurface(el, opt); this.surfaces.set(el, s); }
      s.opt = opt;
      s.x = r.left + sx; s.y = r.top + sy; s.w = r.width; s.h = r.height;
      if (r.width < 2 || r.height < 2) { s.content.visible = false; return; }
      this.measureSurface(s);
    });
    if (live) root().classList.add('vfx-live');
    this.surfaces.forEach((s, el) => { if (!seen.has(el)) { this.dropSurface(s); this.surfaces.delete(el); } });
    this.byIndex = [];
    this.surfaces.forEach(s => { this.byIndex[s.index] = s; });
    this.bg.material.uniforms.uAlpha.value = root().dataset.mementoSurface === 'transparent' ? 1 : 0;
  }

  private buildBackground(aspect: number, viewH: number) {
    const t = buildArch(aspect, viewH, undefined, this.profile().cellScale);
    const g = unbounded(new BufferGeometry());
    g.setAttribute('position', new BufferAttribute(t.position, 3));
    g.setAttribute('bary', new BufferAttribute(barycentric(t.faces), 3));
    g.setAttribute('face', new BufferAttribute(t.face, 4));
    g.setAttribute('edge', new BufferAttribute(t.edge, 3));
    const energy = new BufferAttribute(new Float32Array(t.faces * 6), 2);
    energy.setUsage(DynamicDrawUsage);
    g.setAttribute('energy', energy);
    this.bg.geometry.dispose();
    this.bg.geometry = g;
    (this.bg.material.uniforms.uZ.value as Vector2).set(t.zNear, t.zFar);
    this.arch = t; this.bgEnergy = energy;
    this.bgChain = new ChainField(t, VFX.chain.background);
    this.projectBackground();
  }

  private addSurface(el: HTMLElement, opt: SurfaceOptions): Surface {
    const title = opt.kind === 'title';
    const u: Uniforms = {
      uOrigin: { value: new Vector2() }, uSize: { value: new Vector2(1, 1) }, uPush: { value: 30 },
      uPanel: { value: title ? 0 : 1 }, uCut: { value: new Vector2() }, uPanelCol: { value: new Vector4(...VFX.color.panel) },
      uInk: { value: null }, uHasInk: { value: 0 },
      uImg: { value: null }, uHasImg: { value: 0 }, uImgBox: { value: new Vector4(0, 0, 1, 1) }, uImgFit: { value: new Vector4(0, 0, 1, 1) }, uImgStyle: { value: [1, 0, 0] },
      uHover: { value: 0 }, uGain: { value: 1 }, uBins: { value: new Float32Array(VFX.border.bins) },
      uGray: { value: new Vector2(...gradientRange()) }, uMicro: { value: 12 },
      uDist: { value: null }, uRange: { value: 24 }, uEm: { value: 16 },
      uSolid: { value: opt.solid ? 1 : 0 }, uPointer: { value: new Vector3(-1e4, -1e4, opt.panel ? 0 : 1) },
    };
    const index = this.nextIndex++;
    const content = new Mesh(unbounded(new BufferGeometry()), this.material(SURFACE_VERT, SURFACE_FRAG, u));
    content.frustumCulled = false; content.renderOrder = 10 + index * 2; content.visible = false;
    const overlay = new Mesh(unbounded(new BufferGeometry()), this.material(OVERLAY_VERT, title ? OVERLAY_TITLE_FRAG : OVERLAY_CARD_FRAG, u));
    overlay.frustumCulled = false; overlay.renderOrder = 11 + index * 2; overlay.visible = false;
    this.scene.add(content, overlay);
    return { el, opt, index, u, content, overlay, x: 0, y: 0, w: 0, h: 0, cellKey: '', netKey: '',
      net: null, chain: null, energy: null, border: title ? null : new BorderLight(), edgeCells: [], born: null, delays: null,
      canvas: document.createElement('canvas'), ink: null, dist: null, img: null, imgSrc: '', alpha: null, fontSize: 16,
      hover: 0, inside: false, debt: 0, budget: 0, hot: false, version: 0, ready: false };
  }

  private dropSurface(s: Surface) {
    this.scene.remove(s.content, s.overlay);
    s.content.geometry.dispose(); s.content.material.dispose();
    s.overlay.geometry.dispose(); s.overlay.material.dispose();
    s.ink?.dispose(); s.dist?.dispose(); s.img?.dispose();
    s.version = -1;
  }

  private measureSurface(s: Surface) {
    const { el, u } = s, q = this.profile();
    const found = collect(el);
    s.fontSize = found.fontSize || 16;
    const title = s.opt.kind === 'title';
    const id = hashString(el.id || el.className || el.tagName) + s.index;
    const cell = (title ? clamp(s.fontSize * VFX.cells.titleEm, 9, 26) : VFX.cells.card) * q.cellScale;
    u.uPush.value = title ? clamp(s.fontSize * 0.16, 14, 34) : 30;
    u.uEm.value = s.fontSize;
    u.uRange.value = clamp(s.fontSize * VFX.chain.title.marginEm, 10, 46) * 0.95;
    u.uMicro.value = clamp(s.fontSize * VFX.chain.title.microEm, 6, 18);

    // structural cells: stable, rebuilt only when the surface changes size
    const key = `${Math.round(s.w)}x${Math.round(s.h)}@${cell.toFixed(1)}`;
    if (key !== s.cellKey) {
      s.cellKey = key;
      // an irregular network without margin: the silhouette stays exact, the cells differ in size
      const m = buildNetwork(s.w, s.h, cell, 0, 200, id ^ 0x51ed);
      const centre = new Float32Array(m.faces * 6), seed = new Float32Array(m.faces * 3);
      for (let f = 0; f < m.faces; f++) for (let k = 0; k < 3; k++) {
        centre[(f * 3 + k) * 2] = m.cx[f]; centre[(f * 3 + k) * 2 + 1] = m.cy[f]; seed[f * 3 + k] = m.seed[f];
      }
      const g = unbounded(new BufferGeometry());
      g.setAttribute('position', new BufferAttribute(m.position, 2));
      g.setAttribute('cellCenter', new BufferAttribute(centre, 2));
      g.setAttribute('seed', new BufferAttribute(seed, 1));
      g.setAttribute('bary', new BufferAttribute(barycentric(m.faces), 3));
      s.content.geometry.dispose();
      s.content.geometry = g;
    }
    this.ensureNetwork(s, id);
    (u.uOrigin.value as Vector2).set(s.x, s.y);
    (u.uSize.value as Vector2).set(s.w, s.h);
    if (!title) {
      const cut = s.opt.cut === 'none' ? 0 : parseFloat(getComputedStyle(el).getPropertyValue('--cut')) || 16;
      (u.uCut.value as Vector2).set(cut, s.opt.cut === 'tl' ? 0 : cut);
    }

    // photograph: the element's own <img>, with its fit, position and opacity
    const img = el.querySelector<HTMLImageElement>('img.is-active') ?? el.querySelector<HTMLImageElement>('img');
    if (img && img.complete && img.naturalWidth) {
      const src = img.currentSrc || img.src;
      if (src !== s.imgSrc) {
        s.img?.dispose();
        const t = new Texture(img);
        t.colorSpace = NoColorSpace; t.flipY = false; t.generateMipmaps = true; t.needsUpdate = true;
        s.img = t; s.imgSrc = src;
      }
      const cs = getComputedStyle(img), r = img.getBoundingClientRect();
      (u.uImgBox.value as Vector4).set(r.left + scrollX - s.x, r.top + scrollY - s.y, Math.max(1, r.width), Math.max(1, r.height));
      (u.uImgFit.value as Vector4).set(...imageFit(img, cs, r.width, r.height));
      u.uImgStyle.value = [parseFloat(cs.opacity) || (img.classList.contains('is-active') ? 1 : 0.9), img.closest('.faq-visual') ? 1 : 0, el.querySelector('.card-legibility') ? 1 : 0];
      u.uImg.value = s.img; u.uHasImg.value = 1;
    } else if (!img) u.uHasImg.value = 0;

    // glyphs, icons and dividers
    const area = Math.max(1, s.w * s.h);
    const scale = Math.min(Math.min(devicePixelRatio || 1, 2), Math.sqrt(1.5e6 / area));
    const version = ++s.version;
    void paint(s.canvas, found, scale).then(alpha => {
      if (s.version !== version || this.destroyed) return;
      s.ink?.dispose();
      const t = new CanvasTexture(s.canvas);
      t.colorSpace = NoColorSpace; t.premultiplyAlpha = true; t.flipY = false; t.generateMipmaps = false; t.minFilter = LinearFilter; t.magFilter = LinearFilter;
      this.renderer.initTexture(t);
      s.ink = t; s.alpha = alpha;
      u.uInk.value = t; u.uHasInk.value = 1;
      if (title) {
        // the glow of large type follows each letter: a signed distance field of the painted glyphs
        const f = distanceField(s.canvas, s.w, s.h, u.uRange.value as number);
        s.dist?.dispose();
        const d = new DataTexture(f.data, f.w, f.h, RedFormat, UnsignedByteType);
        d.minFilter = LinearFilter; d.magFilter = LinearFilter; d.flipY = false; d.generateMipmaps = false; d.needsUpdate = true;
        s.dist = d; u.uDist.value = d;
        this.weightByInk(s);
      }
      s.content.visible = true; s.ready = true;
      this.renderDirty = true;
    }).catch(() => { s.ready = true; });
  }

  /** Energy cells: an irregular network over the surface and a margin, with its chain reaction. */
  private ensureNetwork(s: Surface, id: number) {
    const title = s.opt.kind === 'title', C = VFX.chain;
    const spacing = title ? clamp(s.fontSize * C.title.spacingEm, 14, 52) : C.card.spacing;
    const margin = title ? clamp(s.fontSize * C.title.marginEm, 10, 46) : C.card.margin;
    const zone = title ? s.fontSize * C.title.zoneEm : C.card.zone;
    const key = `${Math.round(s.w)}x${Math.round(s.h)}@${spacing.toFixed(1)}`;
    if (key === s.netKey) return;
    s.netKey = key;
    const net = buildNetwork(s.w, s.h, spacing, margin, zone, id, title ? undefined : { spacing: C.card.edgeSpacing, reach: C.card.edgeReach });
    for (let f = 0; f < net.faces; f++) if (!net.weight[f]) net.cond[f] = 0;   // the reaction stays on the surface
    const g = unbounded(new BufferGeometry());
    g.setAttribute('position', new BufferAttribute(net.position, 2));
    g.setAttribute('bary', new BufferAttribute(barycentric(net.faces), 3));
    g.setAttribute('cell', new BufferAttribute(net.cell, 4));
    const energy = new BufferAttribute(new Float32Array(net.faces * 6), 2);
    energy.setUsage(DynamicDrawUsage);
    g.setAttribute('energy', energy);
    s.overlay.geometry.dispose();
    s.overlay.geometry = g;
    const profile: ChainProfile = title ? C.title : C.card;
    const chain = new ChainField(net, profile);
    chain.onIgnite = (cell, strength) => this.emitFrom(s, cell, strength);
    s.net = net; s.chain = chain; s.energy = energy;
    s.delays = new Float32Array(net.faces); s.born = new Uint8Array(net.faces);
    for (let f = 0; f < net.faces; f++) s.delays[f] = loadingDelay(s.x + net.cx[f], s.y + net.cy[f], net.seed[f]);
    // cells near the outline feed its light
    s.edgeCells = [];
    if (!title) for (let f = 0; f < net.faces; f++) {
      if (!net.weight[f]) continue;
      const [o, d] = outline(net.cx[f], net.cy[f], s.w, s.h);
      if (d < VFX.border.reach) s.edgeCells.push({ cell: f, s: o, w: 1 - d / VFX.border.reach });
    }
    if (title && s.alpha) this.weightByInk(s);
  }

  /** On type the reaction follows the letters: ink-covered cells conduct and take ignitions, gaps carry it weakly. */
  private weightByInk(s: Surface) {
    const net = s.net, m = s.alpha;
    if (!net || !m) return;
    const at = (x: number, y: number) => {
      const i = Math.floor(x * m.ascale), j = Math.floor(y * m.ascale);
      return i >= 0 && j >= 0 && i < m.aw && j < m.ah ? m.alpha[j * m.aw + i] / 255 : 0;
    };
    for (let f = 0; f < net.faces; f++) {
      if (net.cx[f] < 0 || net.cy[f] < 0 || net.cx[f] > s.w || net.cy[f] > s.h) continue;
      // strokes are thin: a cell counts as ink if its centre or any corner touches a glyph
      let ink = at(net.cx[f], net.cy[f]);
      for (let k = 0; k < 3; k++) {
        const o = (f * 3 + k) * 2;
        ink = Math.max(ink, at((net.position[o] + net.cx[f]) / 2, (net.position[o + 1] + net.cy[f]) / 2) * 0.85);
      }
      net.weight[f] = 0.04 + 0.96 * ink;
      net.cond[f] = (0.4 + 0.6 * net.zone[f]) * (0.35 + 0.65 * ink);
    }
  }

  /* ------------------------------------------------------------------ emissions */

  /** A few triangles leave the cells the reaction lights, only while the pointer moves: a still pointer emits nothing. */
  private emitFrom(s: Surface, cell: number, strength: number) {
    if (this.reduced || !s.net || s.budget < 1) return;
    const moving = this.input.present && this.input.speed > 40 && (s.inside || s === this.hovered);
    const loading = !this.loaded && this.load.value > 0;
    if (!moving && !loading) return;
    const title = s.opt.kind === 'title';
    if (Math.random() > (title ? 0.24 : 0.3) * strength) return;
    const x = s.x + s.net.cx[cell], y = s.y + s.net.cy[cell];
    if (title && s.alpha) {
      const m = s.alpha, mx = Math.floor(s.net.cx[cell] * m.ascale), my = Math.floor(s.net.cy[cell] * m.ascale);
      if (mx < 0 || my < 0 || mx >= m.aw || my >= m.ah || m.alpha[my * m.aw + mx] < 90) return;
    }
    s.budget -= 1;
    const input = this.input;
    if (title) {
      // repulsion from the pointer plus a share of the gesture's direction
      const px = input.x, py = input.y + this.scroll.y;
      const dx = x - px, dy = y - py, d = Math.hypot(dx, dy) || 1, v = rand(...VFX.particles.spark.speed);
      this.parts.spawn('spark', x, y, (dx / d) * v + input.dirX * input.speed * 0.06, (dy / d) * v + input.dirY * input.speed * 0.06 - 12, s.index);
    } else {
      // shards drift outward from the card's centre and leave the frame
      const dx = x - (s.x + s.w / 2), dy = y - (s.y + s.h / 2), d = Math.hypot(dx, dy) || 1, v = rand(...VFX.particles.shard.speed);
      this.parts.spawn('shard', x, y, (dx / d) * v + rand(-18, 18), (dy / d) * v + rand(-18, 18), s.index);
    }
  }

  /* ------------------------------------------------------------------ loop */

  private tick = (_time: number, deltaMs: number) => {
    if (this.destroyed || this.lost) return;
    if ((window as { __TIDE_VISIBLE__?: boolean }).__TIDE_VISIBLE__ === false && this.loaded) return;
    const dt = Math.min(0.05, deltaMs / 1000);       // a long frame slows the motion instead of skipping it
    this.clock += dt; this.frame++;
    if (this.layoutDirty) this.layout();
    const g = this.globals, sc = this.scroll, input = this.input, P = VFX.pointer;
    sc.update(this.reduced);
    input.update(dt);

    const R = input.radius, px = input.x, py = input.y + sc.y, present = input.present;
    let hovered: Surface | null = null;
    if (present) for (const s of this.surfaces.values()) {
      if (s.content.visible && px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h && (!hovered || s.opt.kind === 'card')) hovered = s;
    }
    this.hovered = hovered;
    const loadingNow = !this.loaded && this.load.value > 0;
    let busy = false;
    const attack = 1 - Math.exp(-dt / P.attack), ease = 1 - Math.exp(-dt * 3.5);
    const still = input.still > 0.6;

    for (const s of this.surfaces.values()) {
      const ch = s.chain, net = s.net;
      if (!ch || !net || !s.ready) continue;
      s.budget = Math.min(4, s.budget + dt * VFX.particles.perSecond);
      ch.propagate = !this.reduced;
      const inside = s === hovered;
      const dx = Math.max(s.x - px, 0, px - s.x - s.w), dy = Math.max(s.y - py, 0, py - s.y - s.h);
      const prox = present && !inside ? clamp(1 - Math.hypot(dx, dy) / R, 0, 1) : 0;
      const lx = px - s.x, ly = py - s.y;
      if (inside) {
        if (!s.inside) for (let i = 0; i < P.enterBurst; i++) ch.igniteAt(lx, ly, R * 0.45, rand(0.85, 1));
        const title = s.opt.kind === 'title';
        const rate = (this.reduced ? 1.5 : (still ? P.stillRate : P.hoverRate) + input.speed * P.moveRate) * (title ? VFX.chain.title.rate : VFX.chain.card.rate);
        s.debt += rate * dt;
        const spread = R * P.jitter * (title ? 1.7 : 1);
        while (s.debt >= 1) { s.debt -= 1; ch.igniteAt(lx, ly, spread, rand(0.75, 1)); }
      } else if (prox > 0) {
        // a neighbour in range: the stretch nearest the pointer answers, at a fraction of the primary
        s.debt += P.proximityRate * prox * dt;
        while (s.debt >= 1) { s.debt -= 1; ch.igniteAt(clamp(lx, 0, s.w), clamp(ly, 0, s.h), R * 0.12, (0.2 + 0.2 * prox) * (s.opt.gain ?? 1)); }
      } else s.debt = 0;
      s.inside = inside;
      // loading: cells light up as they join, sparsely
      if (loadingNow && s.delays && s.born) {
        const L = this.load.value * 1.3 - 0.15;
        for (let f = 0; f < net.faces; f++) {
          if (s.born[f] || s.delays[f] > L) continue;
          s.born[f] = 1;
          if (net.weight[f] > 0.4 && Math.random() < VFX.loading.ignite) ch.ignite(f, rand(0.45, 0.8), 3);
        }
      }
      const active = ch.active;
      if (active) { ch.step(dt); ch.write(s.energy!.array as Float32Array); s.energy!.needsUpdate = true; s.hot = true; }
      else if (s.hot) { (s.energy!.array as Float32Array).fill(0); s.energy!.needsUpdate = true; s.hot = false; }
      // hover state of the surface: quick in, eased out (type breathes in and out more slowly)
      const slow = s.opt.kind === 'title';
      s.hover += ((inside ? 1 : 0) - s.hover) * (inside ? (slow ? 1 - Math.exp(-dt / 0.35) : attack) : (slow ? 1 - Math.exp(-dt * 1.6) : ease));
      if (s.hover < 0.002) s.hover = 0;
      s.u.uHover.value = this.reduced ? s.hover * 0.6 : s.hover;
      s.u.uGain.value = inside ? 1 : Math.max(P.neighbour, s.hover);
      (s.u.uPointer.value as Vector3).set(lx, ly, s.opt.kind === 'title' ? Math.max(R * 1.25, s.fontSize * 1.7) : s.opt.panel ? 0 : 1);
      // the outline
      let glow = 0;
      if (s.border) {
        const b = s.border;
        b.decay(dt);
        for (const e of s.edgeCells) { const v = ch.shown[e.cell] * e.w; if (v > 0.02) b.add(e.s, v * 1.15, 1.6); }
        if (present && (inside || prox > 0)) {
          const [o, d] = outline(lx, ly, s.w, s.h);
          b.add(o, Math.pow(clamp(1 - d / R, 0, 1), 1.3) * (inside ? 0.75 : 0.9) * (s.opt.gain ?? 1), 6);
        }
        b.settle();
        glow = b.level;
        (s.u.uBins.value as Float32Array).set(b.bins);
      }
      s.overlay.visible = ch.active || s.hover > 0.003 || glow > 0.004;
      if (s.overlay.visible || s.hover > 0.003) busy = true;
    }

    // shards crossing an outline light it where they cross
    if (this.parts.count) this.parts.each((x, y, life, opacity, owner) => {
      const s = this.byIndex[owner];
      if (!s?.border) return;
      const [o, d] = outline(x - s.x, y - s.y, s.w, s.h);
      if (d < 14) s.border.add(o, opacity * Math.min(1, life * 2) * (1 - d / 14) * 0.9, 1.4);
    });

    this.driveBackground(dt, hovered, present, px, input.y);
    if (this.bgChain?.active || this.bgHot) busy = true;

    this.parts.step(dt);
    this.partGeo.instanceCount = this.parts.count;
    this.partMesh.visible = this.parts.count > 0;
    this.partBuf.needsUpdate = true;

    // after the page stops, cells on their way out drift away; moving again brings the structure back at once
    const drift = g.uDrift.value as Vector3;
    if (sc.y !== this.lastScroll || this.reduced) { drift.x *= Math.exp(-dt * 10); this.still = 0; }
    else { this.still += dt; if (this.still > 0.12) drift.x = Math.min(VFX.scroll.fade * 2.5, drift.x + dt); }
    if (drift.x > 0.001 && drift.x < VFX.scroll.fade * 2.5) busy = true;
    this.lastScroll = sc.y;

    g.uTime.value = this.clock;
    g.uScroll.value = sc.y; (g.uBandK.value as Vector2).set(sc.top, sc.bottom);
    g.uLoad.value = this.load.value;

    // adaptive quality: sustained long frames step the profile down
    this.frames++; if (deltaMs > VFX.slowFrame) this.slow++;
    if (this.frames >= 150) {
      if (this.slow > 70 && this.quality !== 'low' && !this.pinned) { this.quality = this.quality === 'high' ? 'medium' : 'low'; this.layoutDirty = true; }
      this.frames = 0; this.slow = 0;
    }

    busy = busy || this.parts.count > 0 || !this.loaded || this.renderDirty || present;
    // at rest only the slow wave moves: every other frame is enough, and none at all with reduced motion
    if (busy || (!this.reduced && this.frame % 2 === 0)) this.render(busy);
  };

  /**
   * The background answers where it is visible: margins and around the type, not behind an opaque card.
   * A moving pointer leaves a trail; when it stops, one impulse travels outward and dies, a lighter echo follows
   * after a while, then nothing until it moves again.
   */
  private driveBackground(dt: number, hovered: Surface | null, present: boolean, clientX: number, clientY: number) {
    const ch = this.bgChain, input = this.input, P = VFX.pointer;
    if (!this.arch || !ch || !this.bgEnergy) return;
    ch.propagate = !this.reduced;
    const over = hovered?.opt.kind === 'card' ? 0 : hovered ? 0.45 : 1;
    if (present && over > 0 && this.live) {
      if (input.still < 0.05) {
        this.bgStage = 0;
        this.bgDebt += input.speed * P.moveRate * 1.2 * dt;
        while (this.bgDebt >= 1) { this.bgDebt -= 1; ch.igniteAt(clientX, clientY, input.radius * 0.22, rand(0.7, 1) * over); }
      } else if (this.bgStage === 0 && input.still > 0.25) {
        this.bgStage = 1;
        for (let i = 0; i < 4; i++) ch.igniteAt(clientX, clientY, input.radius * 0.18, rand(0.85, 1) * over);
      } else if (this.bgStage === 1 && input.still > 2.6) {
        this.bgStage = 2;
        for (let i = 0; i < 2; i++) ch.igniteAt(clientX, clientY, input.radius * 0.15, rand(0.4, 0.55) * over);
      }
    } else { this.bgDebt = 0; if (!present) this.bgStage = 0; }
    if (ch.active) { ch.step(dt); ch.write(this.bgEnergy.array as Float32Array); this.bgEnergy.needsUpdate = true; this.bgHot = true; }
    else if (this.bgHot) { (this.bgEnergy.array as Float32Array).fill(0); this.bgEnergy.needsUpdate = true; this.bgHot = false; }
  }

  /** Face centroids → client px. The sheet and the camera are still: done once per layout. */
  private projectBackground() {
    const t = this.arch!;
    this.camera.updateMatrixWorld();
    const W = root().clientWidth, H = innerHeight;
    for (let f = 0; f < t.faces; f++) {
      tmp.set(t.centroid[f * 3], t.centroid[f * 3 + 1], t.centroid[f * 3 + 2]).project(this.camera);
      t.cx[f] = (tmp.x * 0.5 + 0.5) * W; t.cy[f] = (-tmp.y * 0.5 + 0.5) * H;
      if (tmp.z > 1) t.cx[f] = -1e6;
    }
  }

  private render(emissive: boolean) {
    const r = this.renderer, g = this.globals;
    this.renderDirty = false;
    // off-screen surfaces are skipped entirely
    const top = this.scroll.y - 80, bottom = this.scroll.y + this.viewH + 80;
    let energy = this.parts.count > 0 || !!this.bgChain?.active || this.bgHot;
    this.surfaces.forEach(s => {
      const on = s.ready && s.w > 2 && s.y < bottom && s.y + s.h > top;
      s.content.visible = on;
      s.overlay.visible = on && s.overlay.visible;
      if (s.overlay.visible) energy = true;
    });
    g.uEmissive.value = 0;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.scene, this.camera);
    if (!emissive || !energy || !this.profile().bloom) return;
    g.uEmissive.value = 1;
    r.setRenderTarget(this.rtE); r.clear(); r.render(this.scene, this.camera);
    g.uEmissive.value = 0;
    // two separable passes, the second twice as wide: a smooth falloff with no stepped edges once scaled up
    const step = this.blur.uniforms.uStep.value as Vector2;
    this.fsMesh.material = this.blur;
    const pass = (src: WebGLRenderTarget, dst: WebGLRenderTarget, x: number, y: number) => {
      this.blur.uniforms.uTex.value = src.texture; step.set(x / src.width, y / src.height);
      r.setRenderTarget(dst); r.clear(); r.render(this.post, this.camera);
    };
    pass(this.rtE, this.rtA, 1, 0); pass(this.rtA, this.rtB, 0, 1);
    pass(this.rtB, this.rtA, 2, 0); pass(this.rtA, this.rtB, 0, 2);
    this.fsMesh.material = this.composite;
    this.composite.uniforms.uTex.value = this.rtB.texture;
    r.setRenderTarget(null); r.render(this.post, this.camera);
  }
}
