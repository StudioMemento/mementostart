import { useState } from 'react';
import { config } from '../config';
import { useVfx } from '../vfx/react';
import { FitLine } from './FitLine';
import { Icon } from './Icon';

export function Location({ mapEnabled, onLoadMap }: { mapEnabled: boolean; onLoadMap: () => void }) {
  // Keep hover feedback stable when the pointer crosses into Google's document.
  const [interacting, setInteracting] = useState(false);
  const map = useVfx<HTMLDivElement>('tab', { cut: 'tl', gain: 0.7 });
  const address = useVfx<HTMLAnchorElement>('tab');
  const hours = useVfx<HTMLDivElement>('tab');
  return (
    <section className="location-section content-width" aria-labelledby="location-title">
      <FitLine as="h2" className="section-heading category-gradient fit-heading reveal" id="location-title">SIAMO QUI</FitLine>
      <div className="location-board">
        <div className={`map-area location-map cut-frame reveal${interacting ? ' is-interacting' : ''}`} id="mm-map-area" ref={map}
          onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}>
          {mapEnabled ? (
            <div className="map-frame" id="mm-map-frame">
              <iframe title="Google Maps — Studio Memento, Maniago" src={config.mapsEmbedUrl} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            </div>
          ) : (
            <div className="map-intro" id="mm-map-intro">
              <Icon name="map-pin" />
              <p>Maniago.</p>
              <button className="quiet-link" type="button" id="mm-load-map" onClick={onLoadMap}>
                Mostra Google Maps <Icon name="arrow-up-right" />
              </button>
            </div>
          )}
        </div>
        <a className="location-card location-address-card cut-frame reveal" id="mm-map-link" href={config.mapsUrl} target="_blank" rel="noopener noreferrer" ref={address}
          aria-label={`${config.addressLine}, ${config.addressCity} — Studio Memento su Google Maps`}>
          <img className="location-photo" src="assets/images/location-address.webp" width={800} height={800} alt="" loading="lazy" decoding="async" />
          <span className="card-legibility" aria-hidden="true"><span /><span /><span /></span>
          <Icon name="map-pin" />
          <address className="location-address">{config.addressLine}<span>{config.addressCity}</span></address>
        </a>
        <div className="location-card location-hours-card cut-frame reveal" aria-label="Orari dello studio" ref={hours}>
          <img className="location-photo" src="assets/images/location-hours.webp" width={800} height={800} alt="" loading="lazy" decoding="async" />
          <span className="card-legibility" aria-hidden="true"><span /><span /><span /></span>
          <Icon name="clock" />
          <dl className="hours">
            <div>
              <dt>Lunedì — Venerdì</dt>
              <dd><time dateTime="14:00">14:00</time><span aria-hidden="true">—</span><time dateTime="18:00">18:00</time></dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
