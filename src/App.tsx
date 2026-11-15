import { useState } from 'react';
import { Contact } from './components/Contact';
import { Explore } from './components/Explore';
import { Faq } from './components/Faq';
import { Hero } from './components/Hero';
import { Legal, type PolicyKind } from './components/Legal';
import { Location } from './components/Location';
import { PolicyDialog } from './components/PolicyDialog';
import { StartBackground } from './background/StartBackground';
import { VfxProvider } from './vfx/react';

export function App() {
  const [policy, setPolicy] = useState<PolicyKind | null>(null);
  // Google Maps is loaded by default; the preference applies to this visit only (as in V13).
  const [mapEnabled, setMapEnabled] = useState(true);
  return (
    <VfxProvider>
      <StartBackground />
      <a className="skip-link" href="#contatti">Vai ai contatti</a>
      <main id="memento-contact">
        <Hero />
        <Contact />
        <Location mapEnabled={mapEnabled} onLoadMap={() => setMapEnabled(true)} />
        <Faq />
        <Legal onPolicy={setPolicy} />
        <Explore />
      </main>
      <PolicyDialog kind={policy} onClose={() => setPolicy(null)} mapEnabled={mapEnabled} onMapChange={setMapEnabled} />
    </VfxProvider>
  );
}
