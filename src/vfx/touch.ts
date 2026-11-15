import { ChainField, type CellNetwork } from './chain';
import type { ChainProfile } from './config';

// A timing field only: no visible front, circle, or blanket surface activation.
export const TOUCH_TRAVEL_MS = 780;
export const TOUCH_LIFE_MS = 1450;
export const TOUCH_POOL = 4;
export const TOUCH_CHAIN: ChainProfile = {
  maxGen: 3, spread: .9, carry: .72,
  delay: [.022, .055], release: [.18, .34], refractory: [.18, .3], attack: .025,
};
export interface TouchWave {
  id: number; x: number; y: number; width: number; height: number; reach: number; start: number;
}
export interface SurfaceRect { x: number; y: number; w: number; h: number }
export interface TouchSeed { cell: number; at: number; strength: number }
const noise = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function touchArrival(w: TouchWave, x: number, y: number, seed = 0) {
  const dx = x - w.x, dy = y - w.y, distance = Math.hypot(dx, dy);
  const bend = 1 + .14 * Math.sin(Math.atan2(dy, dx) * 3 + w.id * 1.7);
  return w.start + Math.max(0, Math.min(900, distance / w.reach * TOUCH_TRAVEL_MS * bend + (noise(seed + w.id) - .5) * 130));
}

/** A few separated roots, once per surface/contact. Neighbours carry the light, not the distance field. */
export function planTouchSeeds(net: CellNetwork, rect: SurfaceRect, wave: TouchWave): TouchSeed[] {
  const candidates: { cell: number; score: number }[] = [];
  for (let cell = 0; cell < net.faces; cell++) {
    const x = rect.x + net.cx[cell], y = rect.y + net.cy[cell];
    if (net.weight[cell] < .2 || x < 0 || y < 0 || x > wave.width || y > wave.height) continue;
    candidates.push({ cell, score: noise(net.seed[cell] * 997 + cell * .37 + wave.id * 13.1) });
  }
  candidates.sort((a, b) => a.score - b.score);
  const budget = Math.max(2, Math.min(5, Math.ceil(rect.w * rect.h / 24000)));
  const result: TouchSeed[] = [];
  for (const { cell } of candidates) {
    if (result.some(s => Math.hypot(net.cx[cell] - net.cx[s.cell], net.cy[cell] - net.cy[s.cell]) < 64)) continue;
    const seed = net.seed[cell];
    result.push({ cell, at: touchArrival(wave, rect.x + net.cx[cell], rect.y + net.cy[cell], seed), strength: .72 + .25 * noise(seed * 73 + wave.id) });
    if (result.length === budget) break;
  }
  return result;
}

export class TouchPulseField {
  readonly waves: TouchWave[] = [];
  started = 0;
  get active() { return this.waves.length > 0; }
  start(x: number, y: number, width: number, height: number, now: number) {
    this.update(now);
    const wave = { id: ++this.started, x, y, width, height, start: now,
      reach: Math.max(1, Math.hypot(Math.max(x, width - x), Math.max(y, height - y))) };
    if (this.waves.length >= TOUCH_POOL) this.waves.shift();
    this.waves.push(wave);
    return wave;
  }
  update(now: number) {
    let keep = 0;
    for (const w of this.waves) if (now - w.start < TOUCH_LIFE_MS) this.waves[keep++] = w;
    this.waves.length = keep;
  }
  clear() { this.waves.length = 0; }
}

/** Independent short-lived energy preserves the original slow mouse/loading chain. */
export class TouchReaction {
  readonly chain: ChainField;
  readonly energy: Float32Array;
  private seen = 0;
  private pending: TouchSeed[] = [];
  constructor(readonly net: CellNetwork, random?: () => number) {
    this.chain = new ChainField({ ...net, cond: new Float32Array(net.faces) }, TOUCH_CHAIN, random);
    this.energy = new Float32Array(net.faces * 6);
  }
  get active() { return this.pending.length > 0 || this.chain.active; }
  get level() { return this.chain.level; }
  step(field: TouchPulseField, rect: SurfaceRect, now: number, dt: number) {
    for (const w of field.waves) {
      if (w.id <= this.seen) continue;
      this.seen = w.id;
      // Touch conducts across short neighbouring paths; gaps/outside ink still stop it.
      for (let i = 0; i < this.net.faces; i++) this.chain.net.cond[i] = this.net.weight[i] > .05 ? .55 + .45 * this.net.cond[i] : 0;
      // Do not replay an old contact when an offscreen section enters the viewport.
      if (now - w.start < 100) this.pending.push(...planTouchSeeds(this.net, rect, w));
    }
    if (this.pending.length > TOUCH_POOL * 5) this.pending.splice(0, this.pending.length - TOUCH_POOL * 5);
    let keep = 0;
    for (const seed of this.pending) {
      if (seed.at > now) { this.pending[keep++] = seed; continue; }
      const y = rect.y + this.net.cy[seed.cell];
      if (now - seed.at < 100 && y >= 0 && y <= (field.waves.at(-1)?.height ?? 0)) this.chain.ignite(seed.cell, seed.strength);
    }
    this.pending.length = keep;
    if (this.chain.active) this.chain.step(dt);
  }
  merge(out: Float32Array) {
    this.chain.write(this.energy);
    for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i], this.energy[i]);
  }
  clear() {
    this.pending.length = 0; this.chain.quench();
    this.chain.raw.fill(0); this.chain.shown.fill(0); this.chain.level = 0;
  }
}

/** One passive contact event. Release and scroll cancellation never duplicate the reaction. */
export function listenForTouch(target: EventTarget, start: (x: number, y: number) => void, signal: AbortSignal) {
  target.addEventListener('pointerdown', event => {
    const e = event as PointerEvent;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') start(e.clientX, e.clientY);
  }, { capture: true, passive: true, signal });
}
