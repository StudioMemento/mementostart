# Memento Start — V16 (React + Three.js VFX)

Pagina START su React + Vite + TypeScript, con il sistema VFX del brief tecnico: un solo contesto WebGL (Three.js, shader GLSL propri), regia GSAP + ScrollTrigger, scroll nativo.
Markup, testi, layout CSS, immagini e navigazione condivisa restano quelli dello skeleton V13.

## Avvio

```sh
npm install
npm run dev        # http://localhost:4173
npm test           # test mirati (struttura, code energetiche, particelle, cleanup)
npm run build      # typecheck + bundle + prerender → dist/
npm run preview
```

Vercel: `vercel.json` è già impostato (framework Vite, output `dist`). `?vfx=high|medium|low` blocca un profilo di qualità per i confronti.

## Come funziona

Un solo materiale, una sola energia.

- **Background**: una superficie 3D unica (tunnel chiuso, nessun foro né giunzione) vista in prospettiva. Lame lunghe e oblique al bordo, celle sempre più piccole e scure verso il punto di fuga. Picchi e valli sono vertici spinti dentro e fuori; le creste vicine coprono ciò che sta dietro, quindi gli spigoli che non combaciano risultano "coperti". Luci puntiformi radenti dentro il tunnel, spigoli che catturano la luce secondo la loro curvatura reale. Respira lentamente, ruota appena e avanza con lo scroll, si inclina verso il puntatore.
- **Energia = reazione a catena** (`chain.ts`): ogni superficie ha una rete di celle triangolari irregolari. Una cella accesa può accendere le vicine poco dopo, con probabilità data dalla sua zona (zone che conducono, zone dove si spegne); poi riposa e decade col suo tempo. Le generazioni sono limitate: ogni reazione ha una fine. Il puntatore, il tocco, il focus e il loading accendono celle sparse vicino al punto, mai un disco.
- **Card**: l'immagine viene illuminata dall'interno (grading caldo della sua luminanza, leggibile), faccette rade e traslucide, contorni incompleti, il bordo si accende per segmenti (cellule vicine al bordo, frammenti che escono dal frame, puntatore in avvicinamento). Le label restano bianche.
- **Titoli**: in quiete sfumatura grigia dal basso verso l'alto per ogni riga (ombra). In energia il grigio diventa ambra dalla base verso l'alto, con micro-sfaccettature dentro i glifi e un leggero edge glow; la catena viaggia sulle lettere.
- **Scroll**: tassellazione monocromatica legata alla posizione, nessuna accensione.

Il DOM resta la fonte di verità per layout, semantica, focus e click. Quando texture, font e misure sono pronti l'engine aggiunge `html.vfx-live` e il DOM smette di dipingere le superfici registrate (niente doppio rendering). Qualsiasi errore o la perdita del contesto tolgono la classe e torna la pagina DOM.

| Modulo (`src/vfx/`) | Responsabilità |
| --- | --- |
| `config.ts` | Colori, luci, densità, catena, raggi, durate, profili di qualità |
| `chain.ts` | Reazione a catena sulle celle (funzioni pure, testate) |
| `geometry.ts` | Rete irregolare delle superfici (Delaunay), tunnel 3D, celle strutturali |
| `border.ts` | Luce del bordo per segmenti |
| `registry.ts`, `react.tsx` | Registro superfici, `useSurface('title' \| 'card')`, `useVfxSignals()` |
| `input.ts`, `scroll.ts` | Puntatore (posizione, velocità, quiete), scroll nativo e fasce |
| `structure.ts` | Composizione strutturale (stesse formule degli shader) |
| `raster.ts` | Maschere dai glifi reali, icone, divisori; `object-fit` / `object-position` |
| `particles.ts` | Scintille dai glifi, frammenti che escono dalle card |
| `shaders.ts`, `engine.ts` | Risorse GPU, pass, bloom selettivo, loop unico (ticker GSAP) |

## Controlli eseguiti

- `tsc`, build di produzione con prerender, idratazione senza errori in console, accordion, reduced motion.
- 21 test: fascia centrale integra, progresso reversibile, la reazione a catena si propaga e si estingue sempre, muore nelle zone non conduttive, riposo delle celle, annullamento del gesto, superficie del background chiusa su tre aspect ratio, celle più piccole verso il centro, luce del bordo che decade a zero, particelle, cleanup.
- Screenshot in Chrome headless: quiete (desktop e mobile), sfondo con e senza puntatore, titolo, hover e rilascio card, FAQ, scroll, chiusura, quattro fasi del loading.

## Non verificato o limite noto

- **Prestazioni reali.** L'ambiente di sviluppo ha solo un renderer software (2–4 fps): nessuna misura di fps su GPU o telefoni. Le sequenze in movimento sono state controllate per fotogrammi, non a velocità reale.
- **Safari e Firefox**, in particolare l'allineamento glifi DOM → GPU.
- **Sincronia con lo scroll nativo.** Il canvas segue lo scroll a ogni frame; se il main thread resta indietro, le superfici GPU possono ritardare di un frame rispetto agli elementi rimasti DOM (mappa, anello di focus).
- **Mappa Google.** È un iframe: resta DOM e non si frammenta nelle fasce.
- **Sfocatura della navigazione.** L'overlay esistente sfoca il 20% alto e basso del viewport, quindi copre in parte le fasce di scroll (15%).
- **Peso.** Il chunk dell'engine (Three.js + GSAP) è ~193 kB gzip, caricato dopo il contenuto.
- **Modalità hosted (iframe Framer).** Superficie trasparente gestita, non riverificata in questa versione.
