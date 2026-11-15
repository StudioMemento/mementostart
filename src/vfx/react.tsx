import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { SurfaceRegistry, type SurfaceKind, type SurfaceOptions } from './registry';
import { TouchPulseField } from './touch';
import { installTouchFeedback } from './touch-feedback';

const VfxContext = createContext<SurfaceRegistry | null>(null);

/** One canvas behind the content, one engine. Loaded after the content; any failure leaves the plain DOM page. */
export function VfxProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new SurfaceRegistry());
  const canvas = useRef<HTMLCanvasElement>(null);
  const touchLayer = useRef<HTMLDivElement>(null);
  const [touchField] = useState(() => new TouchPulseField());

  useEffect(() => {
    let dispose = () => {};
    let cancelled = false;
    const stopTouch = touchLayer.current ? installTouchFeedback(touchField, touchLayer.current) : () => {};
    import('./engine').then(({ VfxEngine }) => {
      if (cancelled || !canvas.current || matchMedia('(forced-colors: active)').matches) return;
      const engine = VfxEngine.create(canvas.current, registry, touchField);
      dispose = () => engine?.destroy();
    }).catch(() => document.documentElement.classList.remove('vfx-boot', 'vfx-live'));
    return () => { cancelled = true; stopTouch(); dispose(); };
  }, [registry, touchField]);

  return (
    <VfxContext.Provider value={registry}>
      <div className="vfx-layer" aria-hidden="true"><canvas className="vfx-canvas" ref={canvas} /></div>
      <div className="touch-feedback" aria-hidden="true" ref={touchLayer} />
      {children}
    </VfxContext.Provider>
  );
}

/**
 * Registers an element as a surface with a GPU representation.
 *   title — large type: glyphs fragment and carry the full cell language
 *   card  — cut-corner panel with its image, labels, icons and dividers
 */
export function useSurface<T extends HTMLElement>(kind: SurfaceKind, options: Omit<SurfaceOptions, 'kind'> = {}) {
  const registry = useContext(VfxContext);
  const current = useRef<T | null>(null);
  const { gain, cut, solid, panel } = options;
  return useCallback((node: T | null) => {
    if (current.current && current.current !== node) registry?.remove(current.current);
    current.current = node;
    if (node) { node.dataset.vfx = kind; registry?.add(node, { kind, gain, cut, solid, panel }); }
  }, [registry, kind, gain, cut, solid, panel]);
}

/** invalidate(): content inside a surface changed. impulse(el): one short local pulse of energy at an element. */
export function useVfxSignals() {
  const registry = useContext(VfxContext);
  const invalidate = useCallback((target?: Element | null) => registry?.invalidate(target), [registry]);
  const impulse = useCallback((el: Element | null, strength?: number) => { if (el) registry?.impulse(el, strength); }, [registry]);
  return { invalidate, impulse };
}
