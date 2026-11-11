import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { VfxRegistry, type TargetKind, type TargetOptions } from './registry';

const VfxContext = createContext<VfxRegistry | null>(null);

/** Mounts the two canvases (background below the content, energy above it) and starts the engine on the client. */
export function VfxProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(() => new VfxRegistry());
  const bg = useRef<HTMLCanvasElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let dispose = () => {};
    let cancelled = false;
    // The engine is split from the entry chunk: content and layout never wait for it.
    import('./engine').then(({ VfxEngine }) => {
      if (cancelled || !bg.current || !fx.current) return;
      const engine = VfxEngine.create(bg.current, fx.current, registry);
      dispose = () => engine?.destroy();
    }).catch(() => document.documentElement.classList.remove('vfx-boot'));
    return () => { cancelled = true; dispose(); };
  }, [registry]);

  return (
    <VfxContext.Provider value={registry}>
      <canvas className="vfx-layer vfx-bg" ref={bg} aria-hidden="true" />
      {children}
      <canvas className="vfx-layer vfx-fx" ref={fx} aria-hidden="true" />
    </VfxContext.Provider>
  );
}

/**
 * Registers an element as an energy target.
 *   text   — cells light up inside the glyphs
 *   tab    — border and surface of a cut-corner card
 *   icon   — a masked icon treated like a glyph
 *   column — marks the content column (background density and scroll bands follow it)
 */
export function useVfx<T extends HTMLElement>(kind: TargetKind, options: Omit<TargetOptions, 'kind'> = {}) {
  const registry = useContext(VfxContext);
  const current = useRef<T | null>(null);
  const { gain, cut } = options;
  return useCallback((node: T | null) => {
    if (current.current && current.current !== node) registry?.remove(current.current);
    current.current = node;
    if (node) registry?.add(node, { kind, gain, cut });
  }, [registry, kind, gain, cut]);
}

export function useVfxInvalidate() {
  const registry = useContext(VfxContext);
  return useCallback(() => registry?.invalidate(), [registry]);
}
