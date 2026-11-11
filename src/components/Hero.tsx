import { useVfx } from '../vfx/react';
import { FitLine } from './FitLine';

export function Hero() {
  const column = useVfx<HTMLElement>('column');
  return (
    <header className="hero content-width" aria-labelledby="start-title" ref={column}>
      <h1 className="hero-title category-gradient" id="start-title">
        <FitLine className="hero-line">LET’S WORK</FitLine>
        <FitLine className="hero-line">TOGETHER</FitLine>
      </h1>
    </header>
  );
}
