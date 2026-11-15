import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { START_BACKGROUND } from './preset';
class BackgroundBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const GhostFibers = lazy(() => import('./GhostFibers'));
export function StartBackground() {
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (matchMedia('(forced-colors: active)').matches) return;
    const restore = () => setGeneration(value => value + 1);
    document.addEventListener('memento:background-restore', restore);
    const id = window.setTimeout(() => setReady(true), 350);
    return () => { clearTimeout(id); document.removeEventListener('memento:background-restore', restore); };
  }, []);
  return <div className="start-background" aria-hidden="true">
    {ready && <BackgroundBoundary><Suspense fallback={null}><GhostFibers key={generation} {...START_BACKGROUND} dpr={1} /></Suspense></BackgroundBoundary>}
  </div>;
}
