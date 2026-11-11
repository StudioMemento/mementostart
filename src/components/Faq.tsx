import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSurface, useVfxSignals } from '../vfx/react';
import { Icon } from './Icon';

const QUESTIONS = [
  { id: 'idea', image: 'faq-idea', q: 'Basta un’idea?', a: 'Sì. Partiamo da quello che hai in mente.' },
  { id: 'existing', image: 'faq-existing', q: 'E se ho già qualcosa?', a: 'Lo guardiamo insieme e capiamo come farlo crescere.' },
  { id: 'time', image: 'faq-planning', q: 'Costi e tempi?', a: 'Li definiamo insieme, prima di iniziare.' },
  { id: 'commit', image: 'faq-conversation', q: 'Scriverci mi impegna?', a: 'No. Il primo passo è conoscerci.' },
] as const;

export function Faq() {
  // One native accordion panel. Click, tap and keyboard share the same state.
  const [open, setOpen] = useState<string | null>('idea');
  const summaries = useRef<(HTMLElement | null)[]>([]);
  const panel = useSurface<HTMLDivElement>('card');
  const visual = useRef<HTMLDivElement>(null);
  const { invalidate, impulse } = useVfxSignals();
  // The accordion changes the panel's content and height: the surface is re-measured, never read as a scroll.
  useEffect(() => { invalidate(); }, [open, invalidate]);
  const shown = open ?? 'idea';

  const onKey = (event: KeyboardEvent<HTMLElement>, index: number) => {
    const n = QUESTIONS.length;
    if (event.key === 'Escape') { setOpen(null); event.preventDefault(); event.stopPropagation(); return; }
    const target = event.key === 'ArrowDown' ? (index + 1) % n : event.key === 'ArrowUp' ? (index - 1 + n) % n : event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : null;
    if (target !== null) { event.preventDefault(); event.stopPropagation(); summaries.current[target]?.focus({ preventScroll: true }); }
  };

  return (
    <section className="faq-section content-width" id="faq" aria-labelledby="faq-title">
      <div className="faq-panel cut-frame reveal" ref={panel}>
        <div className="faq-visual" aria-hidden="true" ref={visual}>
          {QUESTIONS.map(item => (
            <img key={item.id} className={`faq-photo${shown === item.id ? ' is-active' : ''}`} src={`assets/images/${item.image}.webp`} width={1200} height={800} alt="" loading="lazy" decoding="async" />
          ))}
        </div>
        <h2 className="faq-title category-gradient" id="faq-title"><span>Frequently Asked</span> <span>Questions</span></h2>
        <div className="faq-list">
          {QUESTIONS.map((item, index) => (
            <details key={item.id} className="faq-item" open={open === item.id}
              onToggle={event => {
                const isOpen = event.currentTarget.open;
                setOpen(current => (isOpen ? item.id : current === item.id ? null : current));
                // opening sends one short impulse toward the image; it decays on its own
                if (isOpen && open !== item.id) impulse(visual.current, 0.85);
              }}>
              <summary id={`question-${item.id}`} ref={node => { summaries.current[index] = node; }} onKeyDown={event => onKey(event, index)}>
                <span>{item.q}</span>
                <span className="faq-toggle" aria-hidden="true"><Icon name="plus" /><Icon name="minus" /></span>
              </summary>
              <div className="faq-answer" id={`answer-${item.id}`}><p>{item.a}</p></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
