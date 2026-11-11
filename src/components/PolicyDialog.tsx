import { useEffect, useRef, type ReactNode } from 'react';
import { config } from '../config';
import { Icon } from './Icon';
import type { PolicyKind } from './Legal';

function ContactAction({ subject }: { subject: string }) {
  return <a className="action cut-frame" href={`mailto:${config.email}?subject=${encodeURIComponent(subject)}`}>{config.email}</a>;
}

type Props = { kind: PolicyKind | null; onClose: () => void; mapEnabled: boolean; onMapChange: (enabled: boolean) => void };

export function PolicyDialog({ kind, onClose, mapEnabled, onMapChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const opener = useRef<Element | null>(null);
  const outside = useRef(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (kind && !el.open) {
      opener.current = document.activeElement;
      document.body.classList.add('modal-open');
      el.showModal();
      title.current?.focus({ preventScroll: true });
    } else if (!kind && el.open) {
      el.close();
    }
    if (!kind) {
      document.body.classList.remove('modal-open');
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
      opener.current = null;
    }
  }, [kind]);

  const content: Record<PolicyKind, { title: string; body: ReactNode }> = {
    privacy: {
      title: 'Privacy policy',
      body: (<>
        <p>Questa pagina permette di contattare Memento Design Studio tramite email, telefono e servizi esterni. Non contiene un modulo per inviare messaggi.</p>
        <p>I collegamenti email aprono la tua app di posta; i collegamenti WhatsApp, Instagram e Fiverr aprono i rispettivi servizi. Nessun messaggio viene inviato automaticamente.</p>
        <p>Google Maps è incorporato nella pagina e può essere disattivato dalle preferenze cookie per questa visita.</p>
        <p>Per ricevere l’informativa privacy completa di Memento Design Studio, scrivici:</p>
        <ContactAction subject="Richiesta informativa privacy" />
      </>),
    },
    cookies: {
      title: 'Cookie & contenuti',
      body: (<>
        <p>I collegamenti email aprono la tua app di posta. Questa pagina non raccoglie messaggi tramite un modulo.</p>
        <p>Google Maps è un servizio esterno incorporato nella pagina e può usare cookie propri. Puoi disattivare la mappa dalle preferenze cookie; la scelta vale per questa visita.</p>
        <p>Per ricevere la cookie policy completa di Memento Design Studio, scrivici:</p>
        <ContactAction subject="Richiesta cookie policy completa" />
      </>),
    },
    preferences: {
      title: 'Le tue preferenze',
      body: (<>
        <p>Scegli se caricare Google Maps in questa pagina. La scelta vale per questa visita.</p>
        <label className="preference-row">
          <span>Google Maps</span>
          <input type="checkbox" checked={mapEnabled} onChange={event => onMapChange(event.target.checked)} />
        </label>
      </>),
    },
    studio: {
      title: 'Memento Design Studio',
      body: (<>
        <p>{config.addressLine} · {config.addressCity}</p>
        <p>{config.phoneLabel}</p>
        <ContactAction subject="Informazioni su Memento Design Studio" />
      </>),
    },
  };
  const current = kind ? content[kind] : null;

  return (
    <dialog id="mm-dialog" aria-labelledby="mm-dialog-title" ref={dialog}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onPointerDown={event => { outside.current = event.target === dialog.current; }}
      onClick={event => { if (outside.current && event.target === dialog.current) onClose(); outside.current = false; }}>
      <div className="dialog-wrap">
        <button className="dialog-close" id="mm-dialog-close" type="button" aria-label="Chiudi" onClick={onClose}><Icon name="close" /></button>
        <div className="dialog-card cut-frame">
          <h2 id="mm-dialog-title" className="board-title title-gradient" tabIndex={-1} ref={title}>{current?.title}</h2>
          <div id="mm-dialog-body">{current?.body}</div>
        </div>
      </div>
    </dialog>
  );
}
