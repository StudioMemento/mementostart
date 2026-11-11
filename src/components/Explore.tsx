import { config } from '../config';
import { useVfx } from '../vfx/react';
import { FitLine } from './FitLine';

export function Explore() {
  const chevron = useVfx<HTMLSpanElement>('icon', { gain: 0.8 });
  // The page is embedded in Framer: navigate the containing page instead of nesting the hub in the iframe.
  return (
    <footer className="explore-section content-width" id="esplora">
      <a className="explore-link" id="mm-explore" href={config.hubUrl} target="_top" aria-label="Continua il viaggio!">
        <span className="explore-words category-gradient">
          <FitLine className="explore-line">CONTINUA</FitLine>{' '}
          <FitLine className="explore-line">IL VIAGGIO!</FitLine>
        </span>
        <span className="icon chevron-down explore-chevron" aria-hidden="true" ref={chevron} />
      </a>
    </footer>
  );
}
