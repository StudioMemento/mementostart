import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import { useVfxSignals } from '../vfx/react';

let measure: CanvasRenderingContext2D | null = null;

/** Scales a single-line display heading so the text fills its column exactly. */
function fit(el: HTMLElement) {
  measure ??= document.createElement('canvas').getContext('2d');
  if (!measure) return;
  const style = getComputedStyle(el);
  const current = parseFloat(style.fontSize) || 100;
  const padding = (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)) / current;
  const tracking = (parseFloat(style.letterSpacing) || 0) / current;
  const text = (el.textContent ?? '').trim();
  measure.font = '350 100px Inter';
  const width = el.clientWidth * 0.985;
  const fitted = Math.min(260, Math.max(12, width / (measure.measureText(text).width / 100 + (text.length - 1) * tracking + padding)));
  el.style.fontSize = `${fitted}px`;
  // Optical sizing at small sizes can differ from the canvas estimate.
  if (el.scrollWidth > el.clientWidth) el.style.fontSize = `${(fitted * el.clientWidth * 0.985) / el.scrollWidth}px`;
}

type Props = { as?: ElementType; className?: string; id?: string; children: ReactNode };

export function FitLine({ as: Tag = 'span', className, id, children }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const { invalidate } = useVfxSignals();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = -1;
    const run = () => { fit(el); invalidate(); };
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      run();
    });
    observer.observe(el.parentElement ?? el);
    document.fonts.ready.then(run);
    return () => observer.disconnect();
  }, [invalidate]);

  return (
    <Tag id={id} className={className} ref={(node: HTMLElement | null) => { ref.current = node; }}>
      {children}
    </Tag>
  );
}
