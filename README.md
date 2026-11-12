# Memento Start — V19 (React + Three.js VFX)

Pagina START su React + Vite + TypeScript, con il sistema VFX del brief tecnico: un solo contesto WebGL (Three.js, shader GLSL propri), regia GSAP + ScrollTrigger, scroll nativo.
Markup, testi, layout CSS, immagini e navigazione condivisa restano quelli dello skeleton V13.

**DNA VFX.** Le regole di materia, energia, luce, movimento e layout valgono per tutte le pagine e sono nel design system "Memento — VFX DNA"; una copia è in `docs/dna/` (con la tavola master). Questa pagina ne è l'implementazione di riferimento.

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

- **Background**: un piano 3D inarcato e immobile, con l'asse verticale parallelo allo schermo. Al bordo dello schermo il piano guarda l'osservatore ed è vicino: lì le celle sono grandi (circa un quinto dell'altezza del viewport), con rilievo forte, creste lucide e luce piena. Andando verso il centro il piano gira e si allontana: le celle rimpiccioliscono e si scuriscono per prospettiva, così la misura di un triangolo dice quanto è lontano. Il gradiente parte dal bordo dello schermo, attraversa il padding laterale e arriva al buio dietro la colonna del layout (letta da `.content-width`). Luce e buio dipendono solo dalla posizione orizzontale, quindi si leggono come fasce verticali. Il cursore che si muove lascia una scia; quando si ferma parte un impulso che si propaga e sparisce, dopo un po' un secondo impulso più leggero, poi niente.
- **Energia = reazione a catena** (`chain.ts`): ogni superficie ha una rete di celle triangolari irregolari. Una cella accesa può accendere le vicine poco dopo, con probabilità data dalla sua zona (zone che conducono, zone dove si spegne); poi riposa e decade col suo tempo. Le generazioni sono limitate: ogni reazione ha una fine. Il puntatore, il tocco, il focus e il loading accendono celle sparse vicino al punto, mai un disco.
- **Card**: celle di misure diverse, fitte lungo il contorno e grandi al centro. In hover compare la topologia: un insieme casuale di faccette ambra traslucide e di spigoli parziali, più denso verso i bordi, ogni faccetta con un suo respiro lento; la reazione a catena (lenta e controllata) accentua alcune zone e ne lascia altre. L'immagine viene illuminata dall'interno (grading caldo della sua luminanza; il nero resta nero, i bordi dell'immagine sfumano) e il bordo si accende per segmenti con la stessa saturazione degli spigoli dello sfondo. Testi e icone: bianchi con sfumatura grigia in quiete, sfumatura ambra in hover (sui pannelli grandi, FAQ e legal, solo vicino al cursore).
- **Titoli**: interlinea ridotta e un'unica sfumatura sull'intero blocco (bianco in alto, grigio alla base). In hover lavorano due livelli. La base attiva scalda tutto il blocco con un gradiente caldo, dosato, che respira piano. Nel range, l'ambra piena sale dalla base solo nelle celle che il cursore raggiunge: il range è un insieme di celle allungato lungo la frase, ognuna con la sua portata, e si accende e si spegne nel tempo (`driveRange` in `engine.ts`), quindi non forma mai un disco. Il glow segue la sagoma di ogni lettera grazie a un campo di distanza (`sdf.ts`).
- **Scroll**: tassellazione monocromatica legata alla posizione, con celle piccole e di misure diverse e un leggero vortice in curl noise. Quando la pagina si ferma, le celle in uscita diventano particelle che si allontanano e svaniscono; riprendendo lo scroll la struttura torna dalla posizione.
- **Ritmo verticale**: legato alle fasce (`--vfx-band` in `vfx.css`, uguale a `VFX.scroll.band`). Prima schermata: il titolo è al centro della fascia di lettura e le card entrano frammentate nella fascia d'ingresso, con i testi ancora sotto la piega. Ultima schermata: la fascia d'uscita resta attiva (frammentazione voluta in alto) e la chiusura sta al centro della fascia di lettura.
- **Mappa**: è un'immagine stilizzata generata da `scripts/location-map.mjs` (celle, luoghi chiave, tempi a piedi indicativi), trattata come le altre card; lo studio è la sorgente d'energia in hover. Tutta la mappa apre Google Maps: niente iframe, chiavi API o consenso cookie.

Il DOM resta la fonte di verità per layout, semantica, focus e click. Quando texture, font e misure sono pronti l'engine aggiunge `html.vfx-live` e il DOM smette di dipingere le superfici registrate (niente doppio rendering). Qualsiasi errore o la perdita del contesto tolgono la classe e torna la pagina DOM.

| Modulo (`src/vfx/`) | Responsabilità |
| --- | --- |
| `config.ts` | Colori, luci, densità, catena, raggi, durate, profili di qualità |
| `chain.ts` | Reazione a catena sulle celle (funzioni pure, testate) |
| `geometry.ts` | Rete irregolare delle superfici (Delaunay, anche per la tassellazione dello scroll; più fitta verso i bordi nelle card), piano inarcato del background |
| `border.ts` | Luce del bordo per segmenti |
| `registry.ts`, `react.tsx` | Registro superfici, `useSurface('title' \| 'card')`, `useVfxSignals()` |
| `input.ts`, `scroll.ts` | Puntatore (posizione, velocità, quiete), scroll nativo e fasce |
| `structure.ts` | Composizione strutturale (stesse formule degli shader) |
| `raster.ts` | Maschere dai glifi reali, icone, divisori; `object-fit` / `object-position` |
| `sdf.ts` | Campo di distanza dei glifi (bordo interno e bagliore esterno dei titoli) |
| `scripts/location-map.mjs` | Mappa stilizzata (SVG → WebP) e posizioni delle etichette |
| `particles.ts` | Scintille dai glifi, frammenti che escono dalle card |
| `shaders.ts`, `engine.ts` | Risorse GPU, pass, bloom selettivo, loop unico (ticker GSAP) |

## Controlli eseguiti

- `tsc`, build di produzione con prerender, idratazione senza errori in console, accordion, reduced motion.
- 24 test: fascia centrale integra, progresso reversibile, la reazione a catena si propaga e si estingue sempre, muore nelle zone non conduttive, riposo delle celle, annullamento del gesto; background senza fori su quattro aspect ratio (anche 21:9) e senza triangoli di riempimento visibili, celle in primo piano oltre un decimo dell'altezza e più di 6 volte quelle del centro, profondità che dipende solo dall'orizzontale; campo di distanza (dentro, contorno, fuori); celle delle card più fitte ai bordi; luce del bordo, particelle, cleanup.
- Screenshot in Chrome headless a 3440×1440 (il vostro ultrawide), 1600×900 e 390×844: quiete, titolo in hover, card in hover.

## Non verificato o limite noto

- **Prestazioni reali.** L'ambiente di sviluppo ha solo un renderer software (2–4 fps): nessuna misura di fps su GPU o telefoni. Le sequenze in movimento sono state controllate per fotogrammi, non a velocità reale.
- **Safari e Firefox**, in particolare l'allineamento glifi DOM → GPU.
- **Sincronia con lo scroll nativo.** Il canvas segue lo scroll a ogni frame; se il main thread resta indietro, le superfici GPU possono ritardare di un frame rispetto agli elementi rimasti DOM (mappa, anello di focus).
- **Sfocatura della navigazione.** L'overlay esistente sfoca il 20% alto e basso del viewport, quindi copre in parte le fasce di scroll (15%). Nel renderer software usato per i test questa sfocatura appare specchiata, quindi gli screenshot sono fatti senza. Nello screenshot del deploy non si vede, ma non ho potuto verificarlo su una GPU.
- **Peso.** Il chunk dell'engine (Three.js + GSAP) è ~200 kB gzip, caricato dopo il contenuto. Il campo di distanza dei titoli costa ~20 ms per titolo al layout (una volta, e a ogni resize).
- **Modalità hosted (iframe Framer).** Superficie trasparente gestita, non riverificata in questa versione.
