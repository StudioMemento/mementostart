import gsap from 'gsap';
import {
  BufferAttribute, BufferGeometry, Camera, CanvasTexture, DoubleSide, GLSL3, InstancedBufferGeometry, InstancedInterleavedBuffer,
  InterleavedBufferAttribute, LinearFilter, Mesh, Sphere, NoColorSpace, RawShaderMaterial, Scene, Texture, Vector2, Vector4,
  WebGLRenderer, WebGLRenderTarget, type IUniform,
} from 'three';
import { VFX, hexToRgb, type QualityName } from './config';
import { buildCells, buildShards, hashString } from './geometry';
import { PointerField } from './input';
import { Particles } from './particles';
import { collect, imageFit, paint } from './raster';
import type { SurfaceOptions, SurfaceRegistry } from './registry';
import { ScrollState } from './scroll';
import { BG_FRAG, BG_VERT, BLUR_FRAG, COMPOSITE_FRAG, FS_VERT, PART_FRAG, PART_VERT, SURFACE_FRAG, SURFACE_VERT } from './shaders';
import { rateFor } from './structure';

type Uniforms = Record<string, IUniform>;

interface Surface {
  el: HTMLElement;
  opt: SurfaceOptions;
  mesh: Mesh<BufferGeometry, RawShaderMaterial>;
  u: Uniforms;
  x: number; y: number; w: number; h: number;        // document px
  cellKey: string;
  canvas: HTMLCanvasElement;
  ink: CanvasTexture | null;
  img: Texture | null; imgSrc: string;
  alpha: { alpha: Uint8Array; aw: number; ah: number; ascale: number } | null;
  fontSize: number;
  hover: number; gain: number; pulse: number;
  version: number;
  ready: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const root = () => document.documentElement;
/** Positions are 2D px resolved in the shaders: a fixed sphere keeps three from deriving bounds it cannot use. */
const unbounded = <T extends BufferGeometry>(g: T) => { g.boundingSphere = new Sphere(); return g; };
const BARY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const barycentric = (triangles: number) => {
  const a = new Float32Array(triangles * 9);
  for (let i = 0; i < a.length; i++) a[i] = BARY[i % 9];
  return a;
};

/**
 * VFX engine: one persistent WebGL context, one update loop (the GSAP ticker).
 * The DOM stays the source of truth for layout, semantics and input; the canvas sits behind it and draws
 * the background plus a synchronised representation of every registered surface. While that representation
 * is live (`html.vfx-live`) the DOM paint of those surfaces is switched off, so nothing is drawn twice.
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
  private camera = new Camera();
  private globals: Uniforms;
  private bg: Mesh<BufferGeometry, RawShaderMaterial>;
  private bgKey = '';
  private parts = new Particles();
  private partGeo = new InstancedBufferGeometry();
  private partBuf: InstancedInterleavedBuffer;
  private partMesh: Mesh;
  private rtE: WebGLRenderTarget; private rtA: WebGLRenderTarget; private rtB: WebGLRenderTarget;
  private blur: RawShaderMaterial; private composite: RawShaderMaterial; private fsMesh: Mesh<BufferGeometry, RawShaderMaterial>;

  private surfaces = new Map<HTMLElement, Surface>();
  private input = new PointerField();
  private scroll: ScrollState;
  private hovered: Surface | null = null;
  private col: [number, number] = [0, 0];
  private viewH = 1;
  private clock = 0; private frame = 0;
  private load = { value: 0 };
  private loadTween: gsap.core.Tween | null = null;
  private live = false; private loaded = false; private lost = false; private destroyed = false;
  private layoutDirty = true; private renderDirty = true;
  private quality: QualityName = 'high';
  private slow = 0; private frames = 0; private pinned = false;
  private spawnDebt = 0; private scrollDebt = 0;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly abort = new AbortController();
  private cleanups: (() => void)[] = [];

  private constructor(private canvas: HTMLCanvasElement, private registry: SurfaceRegistry) {
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, depth: false, stencil: false, powerPreference: 'high-performance' });
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
    const pinned = new URLSearchParams(location.search).get('vfx');
    if (pinned && pinned in VFX.quality) { this.quality = pinned as QualityName; this.pinned = true; }

    const A = VFX.color.amber;
    const slowest = rateFor(VFX.pointer.release[1]), fastest = rateFor(VFX.pointer.release[0]);
    this.globals = {
      uTime: { value: 0 }, uMotion: { value: this.reduced ? 0 : 1 },
      uS: { value: this.input.data }, uN: { value: 0 },
      uAmb: { value: [...hexToRgb(A.deep), ...hexToRgb(A.mid), ...hexToRgb(A.hot), ...hexToRgb(A.core)] },
      uAmbBase: { value: hexToRgb(A.base) }, uEmissive: { value: 0 },
      uView: { value: new Vector2(1, 1) }, uScroll: { value: 0 },
      uBand: { value: 120 }, uBandK: { value: new Vector2(0, 0) }, uLoad: { value: 0 }, uScrollE: { value: 0 },
      uRate: { value: new Vector2(slowest, fastest) },
    };

    // background
    this.bg = new Mesh(unbounded(new BufferGeometry()), this.material(BG_VERT, BG_FRAG, {
      uCol: { value: new Vector2(0, 1) }, uBase: { value: [...VFX.color.base] }, uAlpha: { value: 0 },
      uBgGain: { value: 1 }, uBgRadius: { value: VFX.pointer.radius },
    }));
    this.bg.material.transparent = false;
    this.bg.renderOrder = 0; this.bg.frustumCulled = false;
    this.scene.add(this.bg);

    // particles
    this.partGeo.setAttribute('corner', new BufferAttribute(new Float32Array([0, -1, 0.9, 0.62, -0.9, 0.62]), 2));
    this.partBuf = new InstancedInterleavedBuffer(this.parts.gpu, 6);
    this.partGeo.setAttribute('aP', new InterleavedBufferAttribute(this.partBuf, 4, 0));
    this.partGeo.setAttribute('aL', new InterleavedBufferAttribute(this.partBuf, 2, 4));
    this.partGeo.instanceCount = 0; unbounded(this.partGeo);
    this.partMesh = new Mesh(this.partGeo, this.material(PART_VERT, PART_FRAG, {}));
    this.partMesh.renderOrder = 100; this.partMesh.frustumCulled = false;
    this.scene.add(this.partMesh);

    // selective bloom: only the emission pass is blurred and added back
    const rt = () => new WebGLRenderTarget(4, 4, { depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter });
    this.rtE = rt(); this.rtA = rt(); this.rtB = rt();
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
    if (import.meta.env.DEV) (window as unknown as { __vfx: VfxEngine }).__vfx = this;
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
    await Promise.race([
      Promise.all([...images.map(i => i.decode().catch(() => {})), this.whenPainted(first)]),
      wait(1400),
    ]);
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
    addEventListener('pointerdown', e => input.move(e.clientX, e.clientY, e.pointerType === 'touch'), passive);
    // a lifted finger leaves one local impulse (PointerField deposits it); a cancelled gesture leaves none
    addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { input.leave(); this.burst(e.clientX, e.clientY + scrollY, 7); } }, passive);
    addEventListener('pointercancel', () => input.cancel(), passive);
    addEventListener('blur', () => input.leave(), passive);
    root().addEventListener('mouseleave', () => input.leave(), passive);
    document.addEventListener('pointerover', e => { if ((e.target as Element)?.tagName === 'IFRAME') input.leave(); }, passive);
    // keyboard: a short accent where focus lands; the neutral focus ring is the DOM's own
    document.addEventListener('focusin', e => {
      const el = e.target as Element;
      if (!el.matches?.(':focus-visible')) return;
      const r = el.getBoundingClientRect();
      input.impulse(r.left + r.width / 2, r.top + r.height / 2 + scrollY, 0.6, this.clock);
    }, passive);
    addEventListener('resize', () => { this.layoutDirty = true; }, passive);
    document.fonts.addEventListener?.('loadingdone', () => { this.layoutDirty = true; }, { signal });
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.goDom(); }, { signal });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.surfaces.forEach(s => { if (s.ink) s.ink.needsUpdate = true; if (s.img) s.img.needsUpdate = true; });
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
        input.impulse(r.left + r.width * 0.3, r.top + r.height * 0.45 + scrollY, strength, this.clock);
      }
    }));
    // lazy images arrive later: their texture is created when they do
    document.addEventListener('load', e => { if ((e.target as Element)?.tagName === 'IMG') this.layoutDirty = true; }, { capture: true, signal });
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

    // DOM colours and opacities are read in their normal state, then the GPU representation takes over again
    const live = this.live;
    if (live) root().classList.remove('vfx-live');
    const sx = scrollX, sy = scrollY;
    const seen = new Set<HTMLElement>();
    let column: [number, number] | null = null;
    this.registry.surfaces.forEach((opt, el) => {
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (el.dataset.vfxColumn !== undefined || !column) column = [r.left + sx, r.right + sx];
      let s = this.surfaces.get(el);
      if (!s) { s = this.addSurface(el, opt); this.surfaces.set(el, s); }
      s.opt = opt;
      s.x = r.left + sx; s.y = r.top + sy; s.w = r.width; s.h = r.height;
      if (r.width < 2 || r.height < 2) { s.mesh.visible = false; return; }
      this.measureSurface(s);
    });
    const hero = document.querySelector<HTMLElement>('.content-width');
    if (hero) { const r = hero.getBoundingClientRect(); column = [r.left + sx, r.right + sx]; }
    this.col = column ?? [w * 0.1, w * 0.9];
    if (live) root().classList.add('vfx-live');
    this.surfaces.forEach((s, el) => { if (!seen.has(el)) { this.dropSurface(s); this.surfaces.delete(el); } });

    // background: same seed, recomposed for the new frame
    const key = `${Math.round(w / 8)}x${Math.round(h / 8)}`;
    if (key !== this.bgKey) {
      this.bgKey = key;
      const f = buildShards(w, h);
      const g = unbounded(new BufferGeometry());
      g.setAttribute('position', new BufferAttribute(f.position, 2));
      g.setAttribute('data', new BufferAttribute(f.data, 4));
      g.setAttribute('grad', new BufferAttribute(f.grad, 1));
      g.setAttribute('bary', new BufferAttribute(barycentric(f.triangles), 3));
      this.bg.geometry.dispose();
      this.bg.geometry = g;
    }
    (this.bg.material.uniforms.uCol.value as Vector2).set(this.col[0], this.col[1]);
    this.bg.material.uniforms.uAlpha.value = root().dataset.mementoSurface === 'transparent' ? 1 : 0;
  }

  private addSurface(el: HTMLElement, opt: SurfaceOptions): Surface {
    const u: Uniforms = {
      uOrigin: { value: new Vector2() }, uSize: { value: new Vector2(1, 1) }, uPush: { value: 30 },
      uPanel: { value: opt.kind === 'card' ? 1 : 0 }, uCut: { value: new Vector2() }, uPanelCol: { value: new Vector4(...VFX.color.panel) },
      uInk: { value: null }, uHasInk: { value: 0 },
      uImg: { value: null }, uHasImg: { value: 0 }, uImgBox: { value: new Vector4(0, 0, 1, 1) }, uImgFit: { value: new Vector4(0, 0, 1, 1) }, uImgStyle: { value: [1, 0, 0] },
      uTitle: { value: opt.kind === 'title' ? 1 : 0 }, uGain: { value: 0 }, uHover: { value: 0 }, uPulse: { value: 0 },
      uRadius: { value: VFX.pointer.radius }, uMicro: { value: VFX.cells.microCard },
    };
    const mesh = new Mesh(unbounded(new BufferGeometry()), this.material(SURFACE_VERT, SURFACE_FRAG, u));
    mesh.frustumCulled = false; mesh.renderOrder = 10; mesh.visible = false;
    this.scene.add(mesh);
    return { el, opt, mesh, u: mesh.material.uniforms, x: 0, y: 0, w: 0, h: 0, cellKey: '', canvas: document.createElement('canvas'), ink: null, img: null, imgSrc: '',
      alpha: null, fontSize: 16, hover: 0, gain: 0, pulse: 0, version: 0, ready: false };
  }

  private dropSurface(s: Surface) {
    this.scene.remove(s.mesh);
    s.mesh.geometry.dispose(); s.mesh.material.dispose();
    s.ink?.dispose(); s.img?.dispose();
    s.version = -1;
  }

  private measureSurface(s: Surface) {
    const { el, u } = s, q = this.profile();
    const found = collect(el);
    s.fontSize = found.fontSize || 16;
    const title = s.opt.kind === 'title';
    const cell = (title ? clamp(s.fontSize * VFX.cells.titleFactor, VFX.cells.titleRange[0], VFX.cells.titleRange[1]) : VFX.cells.card) * q.cellScale;
    u.uMicro.value = title ? clamp(s.fontSize * VFX.cells.microTitleFactor, VFX.cells.microTitleRange[0], VFX.cells.microTitleRange[1]) * 1.35 : VFX.cells.microCard * 2;
    u.uPush.value = title ? clamp(s.fontSize * 0.16, 14, 34) : 30;

    // triangulation is stable: rebuilt only when the surface changes size
    const key = `${Math.round(s.w)}x${Math.round(s.h)}@${cell.toFixed(1)}`;
    if (key !== s.cellKey) {
      s.cellKey = key;
      const m = buildCells(s.w, s.h, cell, hashString(el.id || el.className || el.tagName) + this.indexOf(el));
      const g = unbounded(new BufferGeometry());
      g.setAttribute('position', new BufferAttribute(m.position, 2));
      g.setAttribute('cellCenter', new BufferAttribute(m.centroid, 2));
      g.setAttribute('seed', new BufferAttribute(m.seed, 1));
      g.setAttribute('bary', new BufferAttribute(barycentric(m.triangles), 3));
      s.mesh.geometry.dispose();
      s.mesh.geometry = g;
    }
    (u.uOrigin.value as Vector2).set(s.x, s.y);
    (u.uSize.value as Vector2).set(s.w, s.h);
    if (s.opt.kind === 'card') {
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
      s.ink = t; s.alpha = title ? alpha : null;
      u.uInk.value = t; u.uHasInk.value = 1;
      s.mesh.visible = true; s.ready = true;
      this.renderDirty = true;
    }).catch(() => { s.ready = true; });
  }

  private indexOf(el: HTMLElement) { let i = 0; for (const k of this.registry.surfaces.keys()) { if (k === el) return i; i++; } return 0; }

  /* ------------------------------------------------------------------ emissions */

  private burst(x: number, y: number, n: number) {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) { const a = rand(0, 6.283), v = rand(40, 130); this.parts.spawn(x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v); }
  }

  /** Emission follows pointer travel near cells that are actually lit. A still pointer emits nothing. */
  private emit(dt: number) {
    const input = this.input, s = this.hovered;
    if (!s || !input.present || input.live.w < 0.3) return;
    const k = clamp(input.speed / VFX.particles.speedRef, 0, 1);
    if (k < 0.04) { this.spawnDebt = 0; return; }
    this.spawnDebt += dt * VFX.particles.rate * k * (s.opt.kind === 'title' ? 1 : 0.4);
    const px = input.x, py = input.y + this.scroll.y;
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      for (let tries = 0; tries < 5; tries++) {
        const a = rand(0, 6.283), r = Math.sqrt(Math.random()) * 64;
        const x = px + Math.cos(a) * r, y = py + Math.sin(a) * r;
        if (s.alpha) {
          const m = s.alpha, mx = Math.floor((x - s.x) * m.ascale), my = Math.floor((y - s.y) * m.ascale);
          if (mx < 0 || my < 0 || mx >= m.aw || my >= m.ah || m.alpha[my * m.aw + mx] < 110) continue;
        } else if (x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) continue;
        // repulsion from the pointer plus a share of the gesture's own direction
        const v = rand(26, 110);
        this.parts.spawn(x, y, Math.cos(a) * v + input.dirX * input.speed * 0.07, Math.sin(a) * v + input.dirY * input.speed * 0.07 - 10);
        break;
      }
    }
  }

  /** Scroll fronts shed a few triangles while the page moves; they stop being born when it stops. */
  private emitScroll(dt: number) {
    const sc = this.scroll;
    if (sc.energy < 0.12) { this.scrollDebt = 0; return; }
    this.scrollDebt += dt * 54 * sc.energy;
    const list = [...this.surfaces.values()].filter(s => s.mesh.visible);
    while (this.scrollDebt >= 1 && list.length) {
      this.scrollDebt -= 1;
      const top = Math.random() < 0.5;
      if ((top ? sc.top : sc.bottom) < 0.5) continue;
      const depth = sc.bandPx * rand(0.25, 0.95);
      const y = sc.y + (top ? depth : this.viewH - depth);
      const hit = list.filter(s => y > s.y && y < s.y + s.h);
      if (!hit.length) continue;
      const s = hit[Math.floor(Math.random() * hit.length)];
      this.parts.spawn(rand(s.x, s.x + s.w), y, rand(-26, 26), sc.direction * rand(30, 120) * (top ? 1 : -1) * -1);
    }
  }

  /* ------------------------------------------------------------------ loop */

  private tick = (_time: number, deltaMs: number) => {
    if (this.destroyed || this.lost) return;
    if ((window as { __TIDE_VISIBLE__?: boolean }).__TIDE_VISIBLE__ === false && this.loaded) return;
    const dt = Math.min(0.05, deltaMs / 1000);       // a long frame slows the motion instead of skipping it
    this.clock += dt; this.frame++;
    if (this.layoutDirty) this.layout();
    const g = this.globals, sc = this.scroll, input = this.input;

    sc.update(dt, this.reduced);
    input.update(dt, this.clock, sc.y);

    // primary surface = the one under the pointer; others in range answer as neighbours
    const px = input.x, py = input.y + sc.y;
    let hovered: Surface | null = null;
    if (input.present) for (const s of this.surfaces.values()) {
      if (s.mesh.visible && px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) { hovered = s; break; }
    }
    if (hovered && hovered !== this.hovered) hovered.pulse = VFX.pointer.enterImpulse;
    this.hovered = hovered;
    let anim = false;
    const attack = 1 - Math.exp(-dt / VFX.pointer.attack), ease = 1 - Math.exp(-dt * 4);
    const radius = input.radius;
    this.surfaces.forEach(s => {
      const primary = s === hovered;
      const goal = (primary ? 1 : hovered ? VFX.pointer.neighbour : VFX.pointer.neighbour * 1.3) * (s.opt.gain ?? 1) * (this.reduced ? 0.6 : 1);
      s.gain += (goal - s.gain) * (primary ? attack : ease);
      s.hover += ((primary ? 1 : 0) - s.hover) * (primary ? attack : ease);
      s.pulse *= Math.exp(-dt * 5);
      if (s.hover > 0.004 && s.hover < 0.996) anim = true;
      s.u.uGain.value = s.gain; s.u.uHover.value = s.hover; s.u.uPulse.value = s.pulse;
      s.u.uRadius.value = s.opt.kind === 'card' ? radius * 0.78 : clamp(s.fontSize * 1.05, radius * 0.55, radius);
    });
    const bu = this.bg.material.uniforms;
    bu.uBgGain.value += ((hovered ? 0.4 : 1) - bu.uBgGain.value) * ease;
    bu.uBgRadius.value = radius;

    if (!this.reduced && this.loaded) { this.emit(dt); this.emitScroll(dt); }
    this.parts.step(dt);
    this.partGeo.instanceCount = this.parts.count;
    this.partMesh.visible = this.parts.count > 0;
    this.partBuf.needsUpdate = true;

    g.uTime.value = this.clock; g.uN.value = input.count;
    g.uScroll.value = sc.y; (g.uBandK.value as Vector2).set(sc.top, sc.bottom);
    g.uLoad.value = this.load.value; g.uScrollE.value = sc.energy;

    // adaptive quality: sustained long frames step the profile down
    this.frames++; if (deltaMs > VFX.slowFrame) this.slow++;
    if (this.frames >= 150) {
      if (this.slow > 70 && this.quality !== 'low' && !this.pinned) { this.quality = this.quality === 'high' ? 'medium' : 'low'; this.layoutDirty = true; }
      this.frames = 0; this.slow = 0;
    }

    const busy = input.active || anim || this.parts.count > 0 || sc.energy > 0 || !this.loaded || this.renderDirty;
    // at rest only the slow wave moves: every other frame is enough, and none at all with reduced motion
    if (busy || (!this.reduced && this.frame % 2 === 0)) this.render(busy && (input.active || sc.energy > 0 || !this.loaded || this.parts.count > 0));
  };

  private render(emissive: boolean) {
    const r = this.renderer, g = this.globals;
    this.renderDirty = false;
    // off-screen surfaces are skipped entirely
    const top = this.scroll.y - 80, bottom = this.scroll.y + this.viewH + 80;
    this.surfaces.forEach(s => { s.mesh.visible = s.ready && s.w > 2 && s.y < bottom && s.y + s.h > top; });
    g.uEmissive.value = 0;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.scene, this.camera);
    if (!emissive || !this.profile().bloom) return;
    g.uEmissive.value = 1;
    r.setRenderTarget(this.rtE); r.clear(); r.render(this.scene, this.camera);
    g.uEmissive.value = 0;
    const step = this.blur.uniforms.uStep.value as Vector2;
    this.fsMesh.material = this.blur;
    this.blur.uniforms.uTex.value = this.rtE.texture; step.set(1 / this.rtE.width, 0);
    r.setRenderTarget(this.rtA); r.clear(); r.render(this.post, this.camera);
    this.blur.uniforms.uTex.value = this.rtA.texture; step.set(0, 1 / this.rtE.height);
    r.setRenderTarget(this.rtB); r.clear(); r.render(this.post, this.camera);
    this.fsMesh.material = this.composite;
    this.composite.uniforms.uTex.value = this.rtB.texture;
    r.setRenderTarget(null); r.render(this.post, this.camera);
  }
}
