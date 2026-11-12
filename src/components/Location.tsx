import type { CSSProperties } from 'react';
import { config } from '../config';
import { useSurface } from '../vfx/react';
import { FitLine } from './FitLine';
import { Icon } from './Icon';
import { MAP_NORTH, MAP_PLACES, MAP_SCALE, MAP_STUDIO } from './locationMap';

const walk = MAP_PLACES.map(p => `${p.name} ${p.minutes} minuti`).join(', ');
const at = (x: number, y: number) => ({ '--x': x, '--y': y }) as CSSProperties;

export function Location() {
  const heading = useSurface<HTMLDivElement>('title');
  // the map is drawn in the same material as the rest: graphite cells, faceted landmarks; the studio is its energy source
  const map = useSurface<HTMLAnchorElement>('card', { cut: 'tl', gain: 0.45, source: '.map-source' });
  const address = useSurface<HTMLAnchorElement>('card');
  const hours = useSurface<HTMLDivElement>('card');
  return (
    <section className="location-section content-width" aria-labelledby="location-title">
      <div ref={heading}><FitLine as="h2" className="section-heading category-gradient fit-heading reveal" id="location-title">SIAMO QUI</FitLine></div>
      <div className="location-board">
        <a className="map-area location-map cut-frame reveal" id="mm-map-area" href={config.mapsUrl} target="_blank" rel="noopener noreferrer" ref={map}
          aria-label={`Mappa di Maniago: Studio Memento in Piazzetta Trento. A piedi: ${walk}. Apri in Google Maps`}>
          <img className="map-art" src="assets/images/location-map.webp" width={2100} height={1400} alt="" decoding="async" />
          <span className="map-labels" aria-hidden="true">
            <span className="map-source" style={at(MAP_STUDIO.x, MAP_STUDIO.y)} />
            <span className="map-label map-label--studio" style={at(MAP_STUDIO.x, MAP_STUDIO.y)}>Studio Memento<span>Piazzetta Trento</span></span>
            {MAP_PLACES.map(p => (
              <span key={p.id} className={`map-label map-label--${p.side}`} style={at(p.x, p.y)}>{p.name}<span>{p.minutes} min</span></span>
            ))}
            <span className="map-label map-label--north" style={at(MAP_NORTH.x, MAP_NORTH.y)}>N</span>
            <span className="map-label map-label--scale" style={at(MAP_SCALE.x, MAP_SCALE.y)}>100 m</span>
          </span>
          <span className="map-cta" aria-hidden="true">Apri in Google Maps <Icon name="arrow-up-right" /></span>
        </a>
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
