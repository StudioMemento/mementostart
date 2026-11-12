import { useState } from 'react';
import { Contact } from './components/Contact';
import { Explore } from './components/Explore';
import { Faq } from './components/Faq';
import { Hero } from './components/Hero';
import { Legal, type PolicyKind } from './components/Legal';
import { Location } from './components/Location';
import { PolicyDialog } from './components/PolicyDialog';
import { VfxProvider } from './vfx/react';

export function App() {
  const [policy, setPolicy] = useState<PolicyKind | null>(null);
  return (
    <VfxProvider>
      <a className="skip-link" href="#contatti">Vai ai contatti</a>
      <main id="memento-contact">
        <Hero />
        <Contact />
        <Location />
        <Faq />
        <Legal onPolicy={setPolicy} />
        <Explore />
      </main>
      <PolicyDialog kind={policy} onClose={() => setPolicy(null)} />
    </VfxProvider>
  );
}
