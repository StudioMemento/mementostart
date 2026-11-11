export type TargetKind = 'text' | 'tab' | 'icon' | 'column';

export interface TargetOptions {
  kind: TargetKind;
  /** Response strength relative to a directly addressed element (default 1). */
  gain?: number;
  /** Which corners of a tab are cut: both (default) or top-left only. */
  cut?: 'both' | 'tl';
}

type Listener = (reason: 'targets' | 'layout') => void;

/** Framework-free list of the elements that react to energy. React fills it; the engine reads it. */
export class VfxRegistry {
  readonly targets = new Map<HTMLElement, TargetOptions>();
  private listeners = new Set<Listener>();

  add(el: HTMLElement, options: TargetOptions) { this.targets.set(el, options); this.emit('targets'); }
  remove(el: HTMLElement) { if (this.targets.delete(el)) this.emit('targets'); }
  /** Call after a layout change the engine cannot observe (e.g. fitted type). */
  invalidate = () => this.emit('layout');
  subscribe(listener: Listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit(reason: 'targets' | 'layout') { this.listeners.forEach(l => l(reason)); }
}
