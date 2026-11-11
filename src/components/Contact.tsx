import type { ReactNode } from 'react';
import { config, links } from '../config';
import { useSurface } from '../vfx/react';
import { Icon } from './Icon';

function Legibility() {
  return <span className="card-legibility" aria-hidden="true"><span /><span /><span /></span>;
}

function Label({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`${className} contact-title`}>{children}</span>;
}

function EmailCard({ id, address, image, priority }: { id: string; address: string; image: string; priority?: boolean }) {
  const ref = useSurface<HTMLAnchorElement>('card');
  return (
    <a className="email-card cut-frame reveal" id={id} href={`mailto:${address}`} aria-label={`Scrivi a ${address}`} ref={ref}>
      <img className="email-photo" src={image} width={1536} height={1024} alt="" decoding="async" fetchPriority={priority ? 'high' : undefined} />
      <Legibility />
      <Icon name="chevron-down" className="card-chevron" />
      <span className="contact-copy">
        <Icon name="mail" />
        <Label className="email-address">{address}</Label>
      </span>
    </a>
  );
}

type ChannelProps = { id: string; href: string; label: string; aria: string; image: string; icon: 'phone' | 'whatsapp' | 'instagram' | 'fiverr'; external?: boolean };

function Channel({ id, href, label, aria, image, icon, external }: ChannelProps) {
  const ref = useSurface<HTMLAnchorElement>('card');
  return (
    <a className="channel cut-frame reveal" id={id} href={href} aria-label={aria} ref={ref}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <img src={image} width={800} height={800} alt="" loading="lazy" decoding="async" />
      <Legibility />
      <Icon name="chevron-down" className="card-chevron" />
      <span className="contact-copy channel-copy">
        <Icon name={icon} />
        <span className="channel-labels"><Label className="channel-title">{label}</Label></span>
      </span>
    </a>
  );
}

export function Contact() {
  return (
    <section className="contact-section content-width" id="contatti" aria-labelledby="contact-title" tabIndex={-1}>
      <h2 className="sr-only" id="contact-title">Scrivici</h2>
      <div className="email-grid">
        <EmailCard id="mm-email-project" address={config.projectEmail} image="assets/images/email-project.webp" priority />
        <EmailCard id="mm-email-studio" address={config.email} image="assets/images/email-studio.webp" />
      </div>
      <nav className="channels" aria-label="Altri modi per contattarci">
        <Channel id="mm-phone-link" href={links.phone} label={config.phoneLabel} aria={`Chiama ${config.phoneLabel}`} image="assets/images/channel-phone.webp" icon="phone" />
        <Channel id="mm-whatsapp-link" href={links.whatsapp} label="WhatsApp" aria="Scrivici su WhatsApp" image="assets/images/channel-whatsapp.webp" icon="whatsapp" external />
        <Channel id="mm-instagram-link" href={config.instagramUrl} label="Instagram" aria="Apri il profilo Instagram di Memento Studio" image="assets/images/channel-instagram.webp" icon="instagram" external />
        <Channel id="mm-fiverr-link" href={config.fiverrUrl} label="Fiverr" aria="Apri il profilo Fiverr di Memento Studio" image="assets/images/channel-fiverr.webp" icon="fiverr" external />
      </nav>
    </section>
  );
}
