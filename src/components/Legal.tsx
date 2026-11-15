import { config } from '../config';
import { useSurface } from '../vfx/react';
import { Icon } from './Icon';

export type PolicyKind = 'privacy' | 'cookies' | 'preferences' | 'studio';

const safeHttps = (value: string) => {
  if (!value.trim()) return '';
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
};

const EXTERNAL: Record<PolicyKind, string> = {
  privacy: safeHttps(config.privacyUrl),
  cookies: safeHttps(config.cookiePolicyUrl),
  studio: safeHttps(config.legalUrl),
  preferences: '',
};

function PolicyRow({ kind, label, onOpen }: { kind: PolicyKind; label: string; onOpen: (kind: PolicyKind) => void }) {
  return <button type="button" data-policy={kind} onClick={event => {
    event.currentTarget.focus({ preventScroll: true });
    onOpen(kind);
  }}>{label} <Icon name="arrow-up-right" /></button>;
}

export function Legal({ onPolicy }: { onPolicy: (kind: PolicyKind) => void }) {
  const card = useSurface<HTMLDivElement>('card', { gain: 0.7, panel: true });
  // Empty optional URLs open the local information panel instead.
  const open = (kind: PolicyKind) => {
    if (EXTERNAL[kind]) window.open(EXTERNAL[kind], '_blank', 'noopener,noreferrer');
    else onPolicy(kind);
  };
  return (
    <section className="legal-section content-width" aria-labelledby="legal-title">
      <div className="legal-card cut-frame reveal" ref={card}>
        <h2 className="board-title title-gradient" id="legal-title">Privacy &amp; legal</h2>
        <div className="legal-layout">
          <nav className="legal-group" aria-label="Privacy e cookie">
            <h3>Privacy e cookie</h3>
            <PolicyRow onOpen={open} kind="privacy" label="Privacy policy" />
            <PolicyRow onOpen={open} kind="cookies" label="Cookie policy" />
            <PolicyRow onOpen={open} kind="preferences" label="Preferenze cookie" />
          </nav>
          <div className="legal-group legal-studio">
            <h3>Studio</h3>
            <p>Memento Design Studio</p>
            <a className="legal-email" href={`mailto:${config.email}`}>{config.email}</a>
            <PolicyRow onOpen={open} kind="studio" label="Dati dello studio" />
          </div>
        </div>
      </div>
    </section>
  );
}
