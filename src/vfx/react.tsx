import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { SurfaceRegistry, type SurfaceKind, type SurfaceOptions } from './registry';

const VfxContext = createContext<SurfaceRegistry | null>(null);

/** One canvas behind the content, one engine. Loaded after the content; any failure leaves the plain DOM page. */
export function VfxProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new SurfaceRegistry());
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let dispose = () => {};
    let cancelled = false;
    import('./engine').then(({ VfxEngine }) => {
      if (cancelled || !canvas.current) return;
      const engine = VfxEngine.create(canvas.current, registry);
      dispose = () => engine?.destroy();
    }).catch(() => document.documentElement.classList.remove('vfx-boot', 'vfx-live'));
    return () => { cancelled = true; dispose(); };
  }, [registry]);

  return (
    <VfxContext.Provider value={registry}>
      <canvas className="vfx-canvas" ref={canvas} aria-hidden="true" />
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
  const { gain, cut } = options;
  return useCallback((node: T | null) => {
    if (current.current && current.current !== node) registry?.remove(current.current);
    current.current = node;
    if (node) { node.dataset.vfx = kind; registry?.add(node, { kind, gain, cut }); }
  }, [registry, kind, gain, cut]);
}

/** invalidate(): content inside a surface changed. impulse(el): one short local pulse of energy at an element. */
export function useVfxSignals() {
  const registry = useContext(VfxContext);
  const invalidate = useCallback(() => registry?.invalidate(), [registry]);
  const impulse = useCallback((el: Element | null, strength?: number) => { if (el) registry?.impulse(el, strength); }, [registry]);
  return { invalidate, impulse };
}
