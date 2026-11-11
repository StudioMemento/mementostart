import { useSurface } from '../vfx/react';
import { FitLine } from './FitLine';

export function Hero() {
  const title = useSurface<HTMLHeadingElement>('title');
  return (
    <header className="hero content-width" aria-labelledby="start-title">
      <h1 className="hero-title category-gradient" id="start-title" ref={title}>
        <FitLine className="hero-line">LET’S WORK</FitLine>
        <FitLine className="hero-line">TOGETHER</FitLine>
      </h1>
    </header>
  );
}
