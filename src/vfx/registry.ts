export type SurfaceKind = 'title' | 'card';

export interface SurfaceOptions {
  kind: SurfaceKind;
  /** Corners cut on a card: both (default), top-left only, or none. */
  cut?: 'both' | 'tl' | 'none';
  /** Response strength relative to a primary surface (default 1). */
  gain?: number;
}

type Listener = (reason: 'surfaces' | 'layout', target?: Element, strength?: number) => void;

/**
 * Surface registry: the DOM elements that own a GPU representation.
 * React fills it; the engine reads it. No React, no WebGL in here.
 */
export class SurfaceRegistry {
  readonly surfaces = new Map<HTMLElement, SurfaceOptions>();
  private listeners = new Set<Listener>();

  add(el: HTMLElement, options: SurfaceOptions) { this.surfaces.set(el, options); this.emit('surfaces'); }
  remove(el: HTMLElement) { if (this.surfaces.delete(el)) this.emit('surfaces'); }
  /** Content or layout inside surfaces changed in a way observers cannot see (accordion, fitted type). */
  invalidate = () => this.emit('layout');
  /** One short local impulse at an element (accordion opening, for instance). */
  impulse = (target: Element, strength = 0.8) => this.listeners.forEach(l => l('layout', target, strength));
  subscribe(listener: Listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  get listenerCount() { return this.listeners.size; }
  private emit(reason: 'surfaces' | 'layout') { this.listeners.forEach(l => l(reason)); }
}
