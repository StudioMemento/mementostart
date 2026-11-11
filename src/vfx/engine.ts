import { CONTEXT_OPTIONS, createProgram, createQuad, type Program } from './gl';
import type { TargetOptions, VfxRegistry } from './registry';
import { BG_FRAG, BG_VERT, GLYPH_FRAG, PART_FRAG, PART_VERT, QUAD_VERT, TAB_FRAG, VEIL_FRAG } from './shaders';

/* ------------------------------------------------------------------ tuning */
const TUNE = {
  base: [0.043, 0.043, 0.047] as const, // surface black behind the content
  loadMs: 3100,          // Cellule > Unione > Assestamento > Presente
  loadWaitMs: 900,       // longest wait for fonts before the sequence starts
  veilCell: 74,          // px, largest loading / scroll cell
  tabCell: 27,
  tabRadius: 175,        // px, pointer range on tabs
  textRadius: 150,
  sampleStep: 34,        // px between trail samples
  maxSamples: 8,
  maxParticles: 220,
  bgMaxDpr: 1.5,
  fxMaxDpr: 2,
  glowPad: 22,           // px around a glyph mask / tab quad for the outer glow
};

interface Sample { x: number; y: number; t: number; w: number }
interface Mask { tex: WebGLTexture; alpha: Uint8Array | null; aw: number; ah: number; ascale: number }
interface Target {
  el: HTMLElement;
  opt: TargetOptions;
  x: number; y: number; w: number; h: number;   // document px
  cut: number;
  fontSize: number;
  hover: number;
  key: string;
  mask: Mask | null;
  building: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class VfxEngine {
  static create(bg: HTMLCanvasElement, fx: HTMLCanvasElement, registry: VfxRegistry): VfxEngine | null {
    try {
      return new VfxEngine(bg, fx, registry);
    } catch (error) {
      console.warn('Memento VFX disabled:', error);
      document.documentElement.classList.remove('vfx-boot');
      document.documentElement.classList.add('vfx-off');
      return null;
    }
  }

  private glBg: WebGL2RenderingContext;
  private glFx: WebGL2RenderingContext;
  private pBg!: Program; private pVeil!: Program; private pGlyph!: Program; private pTab!: Program; private pPart!: Program;
  private quadBg!: WebGLVertexArrayObject; private quadFx!: WebGLVertexArrayObject;
  private partVao!: WebGLVertexArrayObject; private partBuf!: WebGLBuffer;

  private targets = new Map<HTMLElement, Target>();
  private col: [number, number] = [0, 0];
  private viewW = 0; private viewH = 0; private scrollY = 0;
  private dprFx = 1; private dprBg = 1; private bgScale = 1;

  private samples: Sample[] = [];
  private live: Sample = { x: -9999, y: -9999, t: 0, w: 0 };
  private present = false;
  private px = -9999; private py = -9999;
  private travel = 0;
  private sampleData = new Float32Array(TUNE.maxSamples * 4);
  private sampleCount = 0;

  private parts = new Float32Array(TUNE.maxParticles * 10); // x y vx vy size rot spin life ttl heat
  private partCount = 0;
  private partGpu = new Float32Array(TUNE.maxParticles * 6);
  private spawnDebt = 0;

  private scrollE = 0; private scrollDir = 1;
  private load = 0; private loadStart = -1; private loadDone = false; private booted = false;
  private readonly reduced: boolean;
  private last = performance.now();
  /** Engine time in seconds. Advances at most 50 ms per frame, so a long frame slows the motion instead of skipping it. */
  private clock = 0;
  private fontsReady = false;
  private frame = 0; private raf = 0;
  private layoutDirty = true; private fxDirty = true; private bgDirty = true;
  private slow = 0; private frames = 0;
  /** 0 full · 1 and 2 lower background resolution · 3 background rendered only when it changes. */
  private tier = 0;
  private wasEnergised = false;
  private lost = false;
  private readonly abort = new AbortController();
  private observers: { disconnect(): void }[] = [];
  private scratch = document.createElement('canvas');
  private maskCanvas = document.createElement('canvas');
  private tiny = document.createElement('canvas');

  private constructor(private bg: HTMLCanvasElement, private fx: HTMLCanvasElement, private registry: VfxRegistry) {
    const a = bg.getContext('webgl2', CONTEXT_OPTIONS);
    const b = fx.getContext('webgl2', CONTEXT_OPTIONS);
    if (!a || !b) throw new Error('WebGL2 unavailable');
    this.glBg = a; this.glFx = b;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // No GPU (software rasteriser): keep the look, drop the continuous work.
    const info = a.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(a.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) this.setTier(3);
    this.coarse = matchMedia('(pointer: coarse)').matches;
    this.initGl();
    this.listen();
    if (this.reduced) { this.loadDone = true; this.load = 1; this.unveil(); }
    else document.fonts.ready.then(() => { this.fontsReady = true; });
    if (import.meta.env.DEV) (window as unknown as { __vfx: VfxEngine }).__vfx = this;
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.abort.abort();
    this.observers.forEach(o => o.disconnect());
    this.targets.forEach(t => t.mask && this.glFx.deleteTexture(t.mask.tex));
    this.targets.clear();
    this.unveil();
  }

  /* ---------------------------------------------------------------- setup */

  private initGl() {
    const bg = this.glBg, fx = this.glFx;
    this.pBg = createProgram(bg, BG_VERT, BG_FRAG);
    this.quadBg = createQuad(bg);
    this.pVeil = createProgram(fx, QUAD_VERT, VEIL_FRAG);
    this.pGlyph = createProgram(fx, QUAD_VERT, GLYPH_FRAG);
    this.pTab = createProgram(fx, QUAD_VERT, TAB_FRAG);
    this.pPart = createProgram(fx, PART_VERT, PART_FRAG);
    this.quadFx = createQuad(fx);

    // particles: one shared triangle, per-instance position / life
    this.partVao = fx.createVertexArray()!;
    fx.bindVertexArray(this.partVao);
    const corner = fx.createBuffer()!;
    fx.bindBuffer(fx.ARRAY_BUFFER, corner);
    fx.bufferData(fx.ARRAY_BUFFER, new Float32Array([0, -1, 0.9, 0.62, -0.9, 0.62]), fx.STATIC_DRAW);
    fx.enableVertexAttribArray(0);
    fx.vertexAttribPointer(0, 2, fx.FLOAT, false, 0, 0);
    this.partBuf = fx.createBuffer()!;
    fx.bindBuffer(fx.ARRAY_BUFFER, this.partBuf);
    fx.bufferData(fx.ARRAY_BUFFER, this.partGpu.byteLength, fx.DYNAMIC_DRAW);
    fx.enableVertexAttribArray(1);
    fx.vertexAttribPointer(1, 4, fx.FLOAT, false, 24, 0);
    fx.vertexAttribDivisor(1, 1);
    fx.enableVertexAttribArray(2);
    fx.vertexAttribPointer(2, 2, fx.FLOAT, false, 24, 16);
    fx.vertexAttribDivisor(2, 1);
    fx.bindVertexArray(null);

    fx.enable(fx.BLEND);
    fx.blendFunc(fx.ONE, fx.ONE_MINUS_SRC_ALPHA);   // premultiplied "over"; alpha 0 = pure additive light
    fx.clearColor(0, 0, 0, 0);
    bg.disable(bg.BLEND);
    this.targets.forEach(t => { t.mask = null; t.key = ''; });
  }

  private listen() {
    const signal = this.abort.signal, passive = { passive: true, signal } as const;
    const move = (e: PointerEvent) => { this.px = e.clientX; this.py = e.clientY; this.present = true; };
    const leave = () => { this.present = false; };
    addEventListener('pointermove', move, passive);
    addEventListener('pointerdown', move, passive);
    addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); }, passive);
    addEventListener('pointercancel', leave, passive);
    addEventListener('blur', leave, passive);
    document.documentElement.addEventListener('mouseleave', leave, passive);
    // Entering an embedded document (the map) ends our pointer stream.
    document.addEventListener('pointerover', e => { if ((e.target as Element)?.tagName === 'IFRAME') leave(); }, passive);
    addEventListener('scroll', () => { this.fxDirty = true; }, passive);
    addEventListener('resize', () => { this.layoutDirty = true; }, passive);
    this.fx.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; }, { signal });
    this.fx.addEventListener('webglcontextrestored', () => { this.lost = false; this.initGl(); this.layoutDirty = true; }, { signal });
    this.bg.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; }, { signal });
    this.bg.addEventListener('webglcontextrestored', () => { this.lost = false; this.initGl(); this.layoutDirty = true; }, { signal });

    const resize = new ResizeObserver(() => { this.layoutDirty = true; });
    resize.observe(document.documentElement);
    const main = document.querySelector('main');
    if (main) resize.observe(main);
    this.observers.push(resize);
    this.observers.push({ disconnect: this.registry.subscribe(() => { this.layoutDirty = true; }) });
    document.fonts.addEventListener?.('loadingdone', () => { this.layoutDirty = true; }, { signal });
  }

  private coarse = false;

  private setTier(tier: number) {
    this.tier = Math.min(3, tier);
    this.bgScale = [1, 0.75, 0.5, 0.5][this.tier];
    this.layoutDirty = true;
  }

  private unveil() { document.documentElement.classList.remove('vfx-boot'); }

  /* --------------------------------------------------------------- layout */

  private layout() {
    this.layoutDirty = false; this.fxDirty = true; this.bgDirty = true;
    const w = this.fx.clientWidth || innerWidth, h = this.fx.clientHeight || innerHeight;
    this.viewW = w; this.viewH = h;
    const dpr = devicePixelRatio || 1;
    this.dprFx = Math.min(dpr, this.tier === 3 ? 1 : TUNE.fxMaxDpr);
    this.dprBg = Math.min(dpr, this.coarse ? 1.25 : TUNE.bgMaxDpr) * this.bgScale;
    const size = (canvas: HTMLCanvasElement, r: number) => {
      const cw = Math.max(1, Math.round(w * r)), ch = Math.max(1, Math.round(h * r));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    };
    size(this.fx, this.dprFx); size(this.bg, this.dprBg);

    const sy = scrollY, sx = scrollX;
    const seen = new Set<HTMLElement>();
    this.registry.targets.forEach((opt, el) => {
      seen.add(el);
      let t = this.targets.get(el);
      if (!t) { t = { el, opt, x: 0, y: 0, w: 0, h: 0, cut: 0, fontSize: 16, hover: 0, key: '', mask: null, building: false }; this.targets.set(el, t); }
      t.opt = opt;
      const r = el.getBoundingClientRect();
      t.x = r.left + sx; t.y = r.top + sy; t.w = r.width; t.h = r.height;
      if (opt.kind === 'tab') t.cut = parseFloat(getComputedStyle(el).getPropertyValue('--cut')) || 16;
      if (opt.kind === 'column') this.col = [t.x, t.x + t.w];
    });
    this.targets.forEach((t, el) => {
      if (seen.has(el)) return;
      if (t.mask) this.glFx.deleteTexture(t.mask.tex);
      this.targets.delete(el);
    });
    if (this.col[1] <= this.col[0]) this.col = [w * 0.1, w * 0.9];
  }

  /* ---------------------------------------------------------------- masks */

  /** Rasterises the element's own glyphs (or icon silhouette): r = coverage, g = soft halo for the outer glow. */
  private ensureMask(t: Target) {
    if (t.building) return;
    const cs = getComputedStyle(t.el);
    const key = `${t.el.textContent}|${cs.fontSize}|${Math.round(t.w)}x${Math.round(t.h)}|${this.dprFx}`;
    if (t.mask && t.key === key) return;
    t.key = key;
    t.fontSize = parseFloat(cs.fontSize) || 16;
    const pad = TUNE.glowPad;
    const scale = Math.min(this.dprFx, 2048 / (t.w + pad * 2));
    const cw = Math.max(2, Math.ceil((t.w + pad * 2) * scale)), ch = Math.max(2, Math.ceil((t.h + pad * 2) * scale));
    const tmp = this.scratch; tmp.width = cw; tmp.height = ch;
    const ctx = tmp.getContext('2d')!;
    const rect = t.el.getBoundingClientRect();
    ctx.setTransform(scale, 0, 0, scale, (pad - rect.left) * scale, (pad - rect.top) * scale);
    ctx.fillStyle = '#f00';

    const finish = () => {
      const out = this.maskCanvas; out.width = cw; out.height = ch;
      const o = out.getContext('2d')!;
      o.fillStyle = '#000'; o.fillRect(0, 0, cw, ch);
      o.globalCompositeOperation = 'lighter';
      o.drawImage(tmp, 0, 0);
      // halo: only the shadow lands on the canvas, the source is drawn far off to the left
      o.shadowColor = '#0f0'; o.shadowBlur = clamp(t.fontSize * 0.07, 3, 9) * scale; o.shadowOffsetX = cw * 2;
      o.drawImage(tmp, -cw * 2, 0);
      o.drawImage(tmp, -cw * 2, 0);
      o.shadowColor = 'transparent';
      const gl = this.glFx;
      const tex = t.mask?.tex ?? gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, out);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // coarse coverage on the CPU: tells particles where the glyphs are
      const ascale = 0.25;
      const aw = Math.max(1, Math.round(cw * ascale / scale)), ah = Math.max(1, Math.round(ch * ascale / scale));
      const small = this.tiny; small.width = aw; small.height = ah;
      const s = small.getContext('2d', { willReadFrequently: true })!;
      s.drawImage(tmp, 0, 0, aw, ah);
      const data = s.getImageData(0, 0, aw, ah).data;
      const alpha = new Uint8Array(aw * ah);
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
      t.mask = { tex, alpha, aw, ah, ascale };
      t.building = false;
      this.fxDirty = true;
    };

    if (t.opt.kind === 'icon') {
      const source = /url\((['"]?)(.+?)\1\)/.exec(cs.webkitMaskImage || cs.maskImage || '')?.[2];
      if (!source) return;
      t.building = true;
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const side = Math.min(t.w, t.h);
        ctx.drawImage(image, rect.left + (t.w - side) / 2, rect.top + (t.h - side) / 2, side, side);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillRect(rect.left - pad, rect.top - pad, t.w + pad * 2, t.h + pad * 2);
        finish();
      };
      image.onerror = () => { t.building = false; };
      image.src = source;
      return;
    }

    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    const ascent = ctx.measureText('H').fontBoundingBoxAscent;
    const walker = document.createTreeWalker(t.el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ' || text[i] === '\n') continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width) ctx.fillText(text[i], r.left, r.top + ascent);   // each glyph exactly where the browser placed it
      }
    }
    finish();
  }

  /* ------------------------------------------------------------ particles */

  private spawn(x: number, y: number, vx: number, vy: number, size: number, ttl: number, heat: number) {
    if (this.partCount >= TUNE.maxParticles) return;
    const o = this.partCount++ * 10, p = this.parts;
    p[o] = x; p[o + 1] = y; p[o + 2] = vx; p[o + 3] = vy; p[o + 4] = size; p[o + 5] = rand(0, 6.28);
    p[o + 6] = rand(-5, 5); p[o + 7] = 1; p[o + 8] = ttl; p[o + 9] = heat;
  }

  private stepParticles(dt: number) {
    const p = this.parts;
    for (let i = this.partCount - 1; i >= 0; i--) {
      const o = i * 10;
      p[o + 7] -= dt / p[o + 8];
      if (p[o + 7] <= 0) {   // finished: swap with the last one
        const l = --this.partCount * 10;
        if (l !== o) p.copyWithin(o, l, l + 10);
        continue;
      }
      const drag = Math.exp(-dt * 2.2);
      p[o + 2] *= drag; p[o + 3] *= drag;
      p[o] += p[o + 2] * dt; p[o + 1] += p[o + 3] * dt; p[o + 5] += p[o + 6] * dt;
    }
  }

  /** A few triangles leave the glyphs or the border next to the pointer, travel a short way and end. */
  private emit(dt: number, hot: Target | null, nearTab: Target | null) {
    const strength = this.live.w;
    if (strength < 0.3) return;
    this.spawnDebt += dt * 26 * strength;
    const dx = this.px, dy = this.py + this.scrollY;
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      if (hot?.mask?.alpha) {
        const m = hot.mask;
        for (let tries = 0; tries < 5; tries++) {
          const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * 70;
          const x = dx + Math.cos(a) * r, y = dy + Math.sin(a) * r;
          const mx = Math.floor((x - hot.x + TUNE.glowPad) * m.ascale), my = Math.floor((y - hot.y + TUNE.glowPad) * m.ascale);
          if (mx < 0 || my < 0 || mx >= m.aw || my >= m.ah || m.alpha![my * m.aw + mx] < 120) continue;
          const speed = rand(18, 70);
          this.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed - 14, clamp(hot.fontSize * 0.035, 1.6, 5.5) * rand(0.6, 1.5), rand(0.45, 0.95), Math.random());
          break;
        }
      } else if (nearTab && Math.random() < 0.45) {
        // nearest point on the tab outline
        const t = nearTab;
        const cx = clamp(dx, t.x, t.x + t.w), cy = clamp(dy, t.y, t.y + t.h);
        const toL = cx - t.x, toR = t.x + t.w - cx, toT = cy - t.y, toB = t.y + t.h - cy;
        const min = Math.min(toL, toR, toT, toB);
        let bx = cx, by = cy, nx = 0, ny = 0;
        if (min === toL) { bx = t.x; nx = -1; } else if (min === toR) { bx = t.x + t.w; nx = 1; }
        else if (min === toT) { by = t.y; ny = -1; } else { by = t.y + t.h; ny = 1; }
        if (Math.hypot(bx - dx, by - dy) > 90) continue;
        const along = rand(-46, 46);
        bx = clamp(bx + (ny ? along : 0), t.x, t.x + t.w); by = clamp(by + (nx ? along : 0), t.y, t.y + t.h);
        const speed = rand(14, 52);
        this.spawn(bx, by, nx * speed + rand(-14, 14), ny * speed + rand(-14, 14), rand(1.5, 3.6), rand(0.4, 0.85), Math.random());
      }
    }
  }

  private emitScroll(dt: number, band: number) {
    if (this.scrollE < 0.12) return;
    let n = dt * 70 * this.scrollE;
    while (n > Math.random()) {
      n -= 1;
      const top = Math.random() < 0.5;
      const depth = band * rand(0.3, 0.85);
      const y = this.scrollY + (top ? depth : this.viewH - depth);
      this.spawn(rand(this.col[0], this.col[1]), y, rand(-22, 22), this.scrollDir * rand(25, 95), rand(1.6, 4.2), rand(0.4, 0.8), Math.random());
    }
  }

  /* ----------------------------------------------------------------- loop */

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    if (this.lost || (window as { __TIDE_VISIBLE__?: boolean }).__TIDE_VISIBLE__ === false && this.loadDone) { this.last = now; return; }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    const interval = now - this.last;
    this.last = now; this.frame++;
    this.clock += dt;
    const time = this.clock;
    if (this.layoutDirty) this.layout();

    // scroll energy: rises with travel, decays on its own once the page is still
    const sy = scrollY;
    const delta = sy - this.scrollY;
    if (delta !== 0) { this.scrollDir = Math.sign(delta); this.fxDirty = true; this.bgDirty = true; }
    this.scrollY = sy;
    if (!this.reduced) {
      this.scrollE = Math.min(1, this.scrollE * Math.exp(-dt * 2.6) + Math.abs(delta) / 420);
      if (this.scrollE < 0.004) this.scrollE = 0;
    }

    // pointer field: one live sample plus a short trail that decays cell by cell
    const live = this.live;
    if (!this.reduced) {
      const docX = this.px, docY = this.py + sy;
      if (this.present) {
        // leaving a spot deposits its energy there: that is what the release tail decays from
        if (live.w > 0.02) {
          this.travel += Math.hypot(docX - live.x, docY - live.y);
          if (this.travel > TUNE.sampleStep) { this.drop(live.x, live.y, time, live.w); this.travel = 0; }
        }
        live.x = docX; live.y = docY;
        live.w += (1 - live.w) * (1 - Math.exp(-dt * 11));
      } else if (live.w > 0) {
        this.drop(live.x, live.y, time, live.w);
        live.w = 0;
      }
    }
    let n = 0;
    const data = this.sampleData;
    if (live.w > 0.003) { data[0] = live.x; data[1] = live.y; data[2] = 0; data[3] = live.w; n = 1; }
    for (let i = this.samples.length - 1; i >= 0; i--) {
      const s = this.samples[i], age = time - s.t;
      if (s.w * Math.exp(-age * 0.6) < 0.006) { this.samples.splice(i, 1); continue; }
      if (n < TUNE.maxSamples) { data[n * 4] = s.x; data[n * 4 + 1] = s.y; data[n * 4 + 2] = age; data[n * 4 + 3] = s.w; n++; }
    }
    this.sampleCount = n;
    const energised = n > 0;

    // loading sequence
    if (!this.loadDone) {
      if (this.loadStart < 0 && (this.fontsReady || time * 1000 > TUNE.loadWaitMs)) this.loadStart = time + 0.06;
      const k = this.loadStart < 0 ? 0 : clamp((time - this.loadStart) * 1000 / TUNE.loadMs, 0, 1);
      this.load = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      if (k >= 1) { this.loadDone = true; this.load = 1; this.prebuild(); }
      this.fxDirty = true;
    }

    // hover state per tab, nearest text for particles
    let hotText: Target | null = null, nearTab: Target | null = null, anim = false, bestTab = 1e9;
    const pxd = this.px, pyd = this.py + sy;
    this.targets.forEach(t => {
      if (t.opt.kind === 'column') return;
      const inside = this.present && pxd >= t.x && pxd <= t.x + t.w && pyd >= t.y && pyd <= t.y + t.h;
      if (t.opt.kind === 'tab') {
        const goal = inside ? 1 : 0;
        if (Math.abs(goal - t.hover) > 0.002) { t.hover += (goal - t.hover) * (1 - Math.exp(-dt * (goal ? 9 : 3.2))); anim = true; } else t.hover = goal;
        if (this.present) {
          const ddx = Math.max(t.x - pxd, 0, pxd - t.x - t.w), ddy = Math.max(t.y - pyd, 0, pyd - t.y - t.h);
          const d = Math.hypot(ddx, ddy);
          if (d < bestTab && d < 90) { bestTab = d; nearTab = t; }
        }
      } else if (inside && t.mask) hotText = t;
    });

    const band = clamp(this.viewH * 0.21, 110, 230);
    if (!this.reduced && this.loadDone) { this.emit(dt, hotText, nearTab); this.emitScroll(dt, band); }
    if (this.partCount) this.stepParticles(dt);

    // adaptive quality: when frames keep running long, step the background down a tier
    if (this.tier < 3 && this.loadDone) {
      this.frames++; if (interval > 26) this.slow++;
      if (this.frames >= 120) {
        if (this.slow > 48) this.setTier(this.tier + 1);
        this.frames = 0; this.slow = 0;
      }
    }

    const fxActive = energised || anim || this.partCount > 0 || this.scrollE > 0 || !this.loadDone || this.fxDirty;
    if (fxActive) this.drawFx(time, band);
    // the slow wave needs no more than every other frame; proximity gets every frame
    const still = this.reduced || this.tier === 3;
    // full rate only while the pointer can actually reach a margin
    const reach = energised && (this.px < this.col[0] + 260 || this.px > this.col[1] - 260 || !this.present);
    if (still ? this.bgDirty || energised || this.wasEnergised : reach || this.bgDirty || this.frame % 2 === 0) this.drawBg(this.reduced ? 0 : time);
    this.wasEnergised = energised;

    if (!this.booted) { this.booted = true; requestAnimationFrame(() => this.unveil()); }
  };

  private drop(x: number, y: number, t: number, w: number) {
    this.samples.push({ x, y, t, w });
    if (this.samples.length > TUNE.maxSamples - 1) this.samples.shift();
  }

  /** Build glyph masks for what is on screen while the page is idle, so the first hover has nothing to wait for. */
  private prebuild() {
    const idle = (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    const queue = [...this.targets.values()].filter(t => t.opt.kind === 'text' || t.opt.kind === 'icon');
    const next = () => {
      const t = queue.shift();
      if (!t || this.abort.signal.aborted) return;
      if (this.targets.has(t.el) && t.w > 0) this.ensureMask(t);
      idle(next);
    };
    idle(next);
  }

  /* ----------------------------------------------------------------- draw */

  private common(gl: WebGL2RenderingContext, p: Program, time: number) {
    gl.useProgram(p.handle);
    if (p.u.uTime) gl.uniform1f(p.u.uTime, time);
    if (p.u.uS) gl.uniform4fv(p.u.uS, this.sampleData);
    if (p.u.uN) gl.uniform1i(p.u.uN, this.sampleCount);
    if (p.u.uView) gl.uniform2f(p.u.uView, this.viewW, this.viewH);
    if (p.u.uScroll) gl.uniform1f(p.u.uScroll, this.scrollY);
  }

  /** True when any pointer sample can still reach the rectangle. */
  private reached(t: Target, radius: number) {
    const d = this.sampleData, reach = radius * 2.3;
    for (let i = 0; i < this.sampleCount; i++) {
      const x = d[i * 4], y = d[i * 4 + 1];
      if (x > t.x - reach && x < t.x + t.w + reach && y > t.y - reach && y < t.y + t.h + reach) return true;
    }
    return false;
  }

  private drawFx(time: number, band: number) {
    const gl = this.glFx;
    this.fxDirty = false;
    gl.viewport(0, 0, this.fx.width, this.fx.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(this.quadFx);
    const top = this.scrollY - 60, bottom = this.scrollY + this.viewH + 60;
    const pad = TUNE.glowPad;

    if (this.sampleCount > 0 || this.hovering()) {
      // tabs
      let bound = false;
      this.targets.forEach(t => {
        if (t.opt.kind !== 'tab' || t.y > bottom || t.y + t.h < top || t.w < 2) return;
        if (t.hover < 0.004 && !this.reached(t, TUNE.tabRadius)) return;
        if (!bound) {
          this.common(gl, this.pTab, time);
          gl.uniform1f(this.pTab.u.uCell, TUNE.tabCell);
          gl.uniform1f(this.pTab.u.uRadius, TUNE.tabRadius);
          bound = true;
        }
        const u = this.pTab.u, gain = t.opt.gain ?? 1;
        gl.uniform4f(u.uRect, t.x - pad, t.y - pad, t.w + pad * 2, t.h + pad * 2);
        gl.uniform4f(u.uBox, t.x, t.y, t.w, t.h);
        gl.uniform2f(u.uCut, t.cut, t.opt.cut === 'tl' ? 0 : t.cut);
        // the tab under the pointer answers in full, neighbours in range answer more weakly
        gl.uniform1f(u.uGain, gain * (0.5 + 0.5 * t.hover));
        gl.uniform1f(u.uHover, t.hover);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });

      // glyphs
      bound = false;
      this.targets.forEach(t => {
        if ((t.opt.kind !== 'text' && t.opt.kind !== 'icon') || t.y > bottom || t.y + t.h < top || t.w < 2) return;
        if (!this.reached(t, TUNE.textRadius)) return;
        this.ensureMask(t);
        if (!t.mask) return;
        if (!bound) {
          this.common(gl, this.pGlyph, time);
          gl.uniform1i(this.pGlyph.u.uMask, 0);
          gl.activeTexture(gl.TEXTURE0);
          bound = true;
        }
        const u = this.pGlyph.u;
        const size = t.opt.kind === 'icon' ? Math.min(t.w, t.h) * 0.5 : t.fontSize;
        gl.bindTexture(gl.TEXTURE_2D, t.mask.tex);
        gl.uniform4f(u.uRect, t.x - pad, t.y - pad, t.w + pad * 2, t.h + pad * 2);
        gl.uniform1f(u.uCell, clamp(size * 0.21, 8, 40));
        gl.uniform1f(u.uGain, t.opt.gain ?? 1);
        gl.uniform1f(u.uRadius, clamp(size * 0.85, 90, TUNE.textRadius + 20));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    }

    // veil: whole viewport while loading, afterwards only the exit and entry bands
    if (!this.reduced) {
      this.common(gl, this.pVeil, time);
      const u = this.pVeil.u;
      gl.uniform4f(u.uRect, 0, this.scrollY, this.viewW, this.viewH);
      gl.uniform1f(u.uLoad, this.load);
      gl.uniform1f(u.uScrollE, this.scrollE);
      gl.uniform1f(u.uBand, band);
      gl.uniform2f(u.uCol, this.col[0], this.col[1]);
      gl.uniform3f(u.uBase, TUNE.base[0], TUNE.base[1], TUNE.base[2]);
      gl.uniform1f(u.uCell, TUNE.veilCell);
      gl.uniform1f(u.uCover, document.documentElement.dataset.mementoSurface === 'transparent' ? 0 : 1);
      if (!this.loadDone) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      else {
        const r = this.dprFx, bh = Math.ceil((band + TUNE.veilCell) * r);
        const x0 = Math.max(0, Math.floor((this.col[0] - TUNE.veilCell) * r)), x1 = Math.min(this.fx.width, Math.ceil((this.col[1] + TUNE.veilCell) * r));
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(x0, this.fx.height - bh, x1 - x0, bh);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.scissor(x0, 0, x1 - x0, bh);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.SCISSOR_TEST);
      }
    }

    if (this.partCount) {
      const g = this.partGpu, p = this.parts;
      for (let i = 0; i < this.partCount; i++) {
        const o = i * 10, d = i * 6;
        g[d] = p[o]; g[d + 1] = p[o + 1]; g[d + 2] = p[o + 4] * (0.55 + 0.45 * p[o + 7]); g[d + 3] = p[o + 5]; g[d + 4] = p[o + 7]; g[d + 5] = p[o + 9];
      }
      this.common(gl, this.pPart, time);
      gl.bindVertexArray(this.partVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, g, 0, this.partCount * 6);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, this.partCount);
    }
    gl.bindVertexArray(null);
  }

  private hovering() {
    for (const t of this.targets.values()) if (t.hover > 0.004) return true;
    return false;
  }

  private drawBg(time: number) {
    const gl = this.glBg, u = this.pBg.u;
    this.bgDirty = false;
    gl.viewport(0, 0, this.bg.width, this.bg.height);
    this.common(gl, this.pBg, time);
    gl.uniform2f(u.uRes, this.bg.width, this.bg.height);
    gl.uniform1f(u.uDpr, this.bg.width / Math.max(1, this.viewW));
    gl.uniform2f(u.uCol, this.col[0], this.col[1]);
    gl.uniform3f(u.uBase, TUNE.base[0], TUNE.base[1], TUNE.base[2]);
    gl.uniform1f(u.uAlpha, document.documentElement.dataset.mementoSurface === 'transparent' ? 1 : 0);
    gl.bindVertexArray(this.quadBg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }
}
