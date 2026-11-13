# Memento Start — V21 (React + Three.js VFX)

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

- **Background**: un piano 3D inarcato e immobile, con l'asse verticale parallelo allo schermo, fatto di blocchi d'ossidiana (vetro nero con grana di grafite) separati da fessure (`rockField`). Le facce riflettono uno studio fermo e simmetrico (softbox in alto, due strip, la luce in fondo al tunnel) con Fresnel; una luce morbida dall'alto modella i blocchi; l'energia sale dalle fessure. Al bordo dello schermo il piano è vicino: lì le celle sono grandi e allungate in verticale (schegge alte circa un terzo del viewport), il corpo è quasi nero e la luce resta su poche creste nette e su qualche faccia lucida. Andando verso il centro il piano gira e si allontana: le celle rimpiccioliscono per prospettiva in un intervallo misurato (da 3 a 12 volte), così l'insieme si legge come il wireframe di una struttura in prospettiva. Il punto più scuro è il bordo della colonna del layout (letta da `.content-width`); da lì verso il centro il piano va fuori fuoco con gradualità (profondità di campo: una copia a metà risoluzione sfocata due volte, ricalcolata solo quando lo sfondo cambia) e dietro i contenuti restano celle piccole e appena visibili. Il cursore che si muove lascia una scia anche dietro la colonna, più leggera e sfocata; quando si ferma parte un impulso che si propaga e sparisce, dopo un po' un secondo impulso più leggero, poi niente.
- **Energia = reazione a catena** (`chain.ts`): ogni superficie ha una rete di celle triangolari irregolari. Una cella accesa può accendere le vicine poco dopo, con probabilità data dalla sua zona (zone che conducono, zone dove si spegne); poi riposa e decade col suo tempo. Le generazioni sono limitate: ogni reazione ha una fine. Il puntatore, il tocco, il focus e il loading accendono celle sparse vicino al punto, mai un disco.
- **Card**: un solo insieme di celle di misure diverse, fitte lungo il contorno e grandi al centro. Ogni cella ha la sua visibilità (forte, debole, appena percettibile, invisibile) e una sua saturazione; il puntatore le sveglia dove si trova e la reazione a catena passa per le stesse celle, con lo stesso materiale. Una card vicina al cursore (nel raggio, senza hover) accende il bordo e le celle sul lato rivolto al cursore, e scalda appena l'immagine. L'immagine in hover viene illuminata dall'interno (grading caldo della sua luminanza; il nero resta nero, i bordi dell'immagine sfumano). Testi e icone hanno un solo colore, mai sfumature, e restano dello stesso peso: vicino al cursore prendono una tinta ambra chiara e molto diffusa.
- **Titoli**: interlinea ridotta e un'unica sfumatura sull'intero blocco. Il gradiente ambra (`VFX.color.titleAmber`: bianco caldo in alto, arancio alla base) è lo stato in hover; in quiete il blocco mostra lo stesso gradiente desaturato (stessa luminanza, nessuna tinta). Nel range, giallo caldo con accenti arancio delle micro-faccette e un reticolato chiaro sale dalla base solo nelle celle che il cursore raggiunge: il range è un insieme di celle allungato lungo la frase, ognuna con la sua portata, e si accende e si spegne nel tempo (`driveRange` in `engine.ts`), quindi non forma mai un disco. Glow caldo e un bloom leggero seguono la sagoma di ogni lettera grazie a un campo di distanza (`sdf.ts`). L'overlay sostituisce il testo della passata base invece di sommarsi: il peso del font non cambia.
- **Scroll**: tassellazione monocromatica legata alla posizione, con celle piccole e di misure diverse e un leggero vortice in curl noise. Quando la pagina si ferma, le celle in uscita diventano particelle che si allontanano e svaniscono; riprendendo lo scroll la struttura torna dalla posizione.
- **Ritmo verticale**: legato alle fasce (`--vfx-band` in `vfx.css`, uguale a `VFX.scroll.band`). Prima schermata: il titolo è al centro della fascia di lettura e le card entrano frammentate nella fascia d'ingresso, con i testi ancora sotto la piega. Ultima schermata: la fascia d'uscita resta attiva (frammentazione voluta in alto) e la chiusura sta al centro della fascia di lettura.
- **Mappa**: è un render notturno di Maniago (`public/assets/images/location-map.webp`) con lo studio illuminato. In quiete è in grigio come ogni foto; in hover mostra i suoi colori (`ownColour`) e lo studio è la sorgente d'energia. Etichette: Studio Memento e Piazza Italia (`src/components/locationMap.ts`). Tutta la mappa apre Google Maps: niente iframe, chiavi API o consenso cookie.

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
| `particles.ts` | Scintille dai glifi, frammenti che escono dalle card |
| `shaders.ts`, `engine.ts` | Risorse GPU, pass, bloom selettivo, loop unico (ticker GSAP); frame in alta precisione (half float, MSAA ×4) e grade finale (`GRADE_FRAG`: spalla delle luci, bloom e striatura, vignettatura, grana, aberrazione, dithering) |

## Controlli eseguiti

- `tsc`, build di produzione con prerender, idratazione senza errori in console, accordion, reduced motion.
- 24 test: fascia centrale integra, progresso reversibile, la reazione a catena si propaga e si estingue sempre, muore nelle zone non conduttive, riposo delle celle, annullamento del gesto; background senza fori su quattro aspect ratio (anche 21:9) e senza triangoli di riempimento visibili, celle in primo piano oltre un decimo dell'altezza e da 3 a 12 volte quelle del centro, profondità che dipende solo dall'orizzontale; campo di distanza (dentro, contorno, fuori); celle delle card più fitte ai bordi; luce del bordo, particelle, cleanup.
- Screenshot in Chrome headless a 3440×1440 (il vostro ultrawide), 1600×900 e 390×844: quiete, titolo in hover, card in hover.

## Non verificato o limite noto

- **Prestazioni reali.** L'ambiente di sviluppo ha solo un renderer software (2–4 fps): nessuna misura di fps su GPU o telefoni. Le sequenze in movimento sono state controllate per fotogrammi, non a velocità reale.
- **Safari e Firefox**, in particolare l'allineamento glifi DOM → GPU.
- **Sincronia con lo scroll nativo.** Il canvas segue lo scroll a ogni frame; se il main thread resta indietro, le superfici GPU possono ritardare di un frame rispetto agli elementi rimasti DOM (mappa, anello di focus).
- **Sfocatura della navigazione.** L'overlay esistente sfoca il 20% alto e basso del viewport, quindi copre in parte le fasce di scroll (15%). Nel renderer software usato per i test questa sfocatura appare specchiata, quindi gli screenshot sono fatti senza. Nello screenshot del deploy non si vede, ma non ho potuto verificarlo su una GPU.
- **Peso.** Il chunk dell'engine (Three.js + GSAP) è ~200 kB gzip, caricato dopo il contenuto. Il campo di distanza dei titoli costa ~20 ms per titolo al layout (una volta, e a ogni resize).
- **Modalità hosted (iframe Framer).** Superficie trasparente verificata in un iframe di prova (profilo basso, senza sfocatura); la sfocatura dietro la colonna è esatta anche su canvas trasparente, ma non l'ho vista su una GPU reale.
- **V20 non misurata su GPU.** Le passate in più (sfondo a metà risoluzione, sei sfocature, due composizioni limitate alla colonna) girano solo quando lo sfondo cambia; la misura reale va fatta dopo il deploy.
