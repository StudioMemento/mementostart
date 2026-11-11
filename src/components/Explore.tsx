import { config } from '../config';
import { useSurface } from '../vfx/react';
import { FitLine } from './FitLine';

export function Explore() {
  const link = useSurface<HTMLAnchorElement>('title');
  // The page is embedded in Framer: navigate the containing page instead of nesting the hub in the iframe.
  return (
    <footer className="explore-section content-width" id="esplora">
      <a className="explore-link" id="mm-explore" href={config.hubUrl} target="_top" aria-label="Continua il viaggio!" ref={link}>
        <span className="explore-words category-gradient">
          <FitLine className="explore-line">CONTINUA</FitLine>{' '}
          <FitLine className="explore-line">IL VIAGGIO!</FitLine>
        </span>
        <span className="icon chevron-down explore-chevron" aria-hidden="true" />
      </a>
    </footer>
  );
}
