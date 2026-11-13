# Memento Start — V22 (React + Three.js VFX)

Pagina START su React + Vite + TypeScript, con il sistema VFX del brief tecnico: un solo contesto WebGL (Three.js, shader GLSL propri), regia GSAP + ScrollTrigger, scroll nativo.
Markup, testi, layout CSS, immagini e navigazione condivisa restano quelli dello skeleton V13.

**DNA VFX.** Le regole di materia, energia, luce, movimento e layout valgono per tutte le pagine e sono nel design system "Memento — VFX DNA"; una copia è in `docs/dna/` (con la tavola master). Questa pagina ne è l'implementazione di riferimento.

**V22.** Lo sfondo è nuovo: il **mondo d'ossidiana**, una conca di schegge renderizzata in Blender su tre piani e ricomposta nel frame con una profondità di campo vera (`src/vfx/bkg/`, plate in `public/assets/bkg/`, produzione in `tools/bkg/`, regole in `docs/dna/sfondo.md`). Tutto il resto (superfici, reazione a catena, scroll, loading, grade) è quello di V21.

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

- **Background (V22)**: il mondo d'ossidiana. Tre piani pre-renderizzati (BG fondo, MG anello, FG lastre al bordo): la scala cresce dal centro verso i bordi in tutte le direzioni, e il lato lungo del viewport arriva sempre al bordo del mondo, quindi lo sfondo si vede su ultrawide, desktop e mobile. Profondità di campo con bokeh esagonale (scatter-as-gather in spazio plate, ricalcolata solo quando il fuoco si muove). Il fuoco a riposo è sul piano intermedio; il cursore mette a fuoco la superficie che ha sotto, con una molla lenta; sopra titoli e card tutto va fuori fuoco; su touch il fuoco segue lo scroll. Il glow delle fessure è basso a riposo e respira; la reazione a catena dello sfondo (celle irregolari in spazio schermo, scia, impulso ed eco come prima) accende le fessure cella per cella e solo lei entra nel bloom. Puntini ambra sospesi (esagoni sfocati), scintille sulle facce a fuoco, schegge che si sollevano appena vicino al cursore, dolly e parallasse per piano sullo scroll. Il colore si ricostruisce nello shader da sole luminanze: fuori palette non entra nulla.
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
| `geometry.ts` | Rete irregolare delle superfici (Delaunay, anche per la tassellazione dello scroll e per le celle della reazione dello sfondo; più fitta verso i bordi nelle card) |
| `bkg/` | Sfondo: `renderer.ts` (plate, profondità di campo, fuoco, glow, motes, glint), `shaders.ts`, `math.ts` (inquadratura, anelli esagonali, molla del fuoco; testati), `plate.ts` (caricamento, fuoco sotto il puntatore) |
| `border.ts` | Luce del bordo per segmenti |
| `registry.ts`, `react.tsx` | Registro superfici, `useSurface('title' \| 'card')`, `useVfxSignals()` |
| `input.ts`, `scroll.ts` | Puntatore (posizione, velocità, quiete), scroll nativo e fasce |
| `structure.ts` | Composizione strutturale (stesse formule degli shader) |
| `raster.ts` | Maschere dai glifi reali, icone, divisori; `object-fit` / `object-position` |
| `sdf.ts` | Campo di distanza dei glifi (bordo interno e bagliore esterno dei titoli) |
| `particles.ts` | Scintille dai glifi, frammenti che escono dalle card |
| `shaders.ts`, `engine.ts` | Risorse GPU, pass, bloom selettivo, loop unico (ticker GSAP); frame in alta precisione (half float, MSAA ×4) e grade finale (`GRADE_FRAG`: spalla delle luci, bloom e striatura, vignettatura, grana, aberrazione, dithering) |

## Controlli eseguiti

- V22: `tsc`, build di produzione con prerender, 32 test (tra cui 10 nuovi sullo sfondo: anelli esagonali, una regione uniforme resta identica e un punto diventa un esagono pieno, inquadratura dentro il plate su ogni aspect ratio con dolly e deriva, molla del fuoco, percorso del fuoco su touch, mediana sotto il puntatore, codifica dei plate).
- Screenshot in Chrome headless (renderer software, con reduced motion per vedere ogni stato già assestato): 1600×900 a riposo, fuoco sul primo piano col cursore, titolo in hover con lo sfondo fuori fuoco, scroll alla sezione mappa, 3440×1440, 390×844 a riposo e con scroll. Reazione dello sfondo forzata da console: le fessure si accendono cella per cella.
- V21: `tsc`, build di produzione con prerender, idratazione senza errori in console, accordion, reduced motion.

## Non verificato o limite noto

- **V22, prestazioni reali dello sfondo.** Misurato solo nel renderer software (~1 fps, uguale a V21 nelle stesse condizioni). Peso dei plate: 1,26 MB desktop, 0,65 MB mobile. La sfocatura si ricalcola solo mentre il fuoco si muove (a metà risoluzione durante il viaggio); a fuoco fermo il frame costa una composizione a schermo intero. Da misurare su GPU e su un mobile di fascia media (benchmark).
- **V22, nitidezza su schermi grandi.** Il plate desktop ha ~2290 px per unità di tangente: su 4K e ultrawide grandi il piano a fuoco è leggermente morbido. Si risolve rifacendo i plate a 3200 px (`tools/bkg/README.md`).

- **Prestazioni reali.** L'ambiente di sviluppo ha solo un renderer software (2–4 fps): nessuna misura di fps su GPU o telefoni. Le sequenze in movimento sono state controllate per fotogrammi, non a velocità reale.
- **Safari e Firefox**, in particolare l'allineamento glifi DOM → GPU.
- **Sincronia con lo scroll nativo.** Il canvas segue lo scroll a ogni frame; se il main thread resta indietro, le superfici GPU possono ritardare di un frame rispetto agli elementi rimasti DOM (mappa, anello di focus).
- **Sfocatura della navigazione.** L'overlay esistente sfoca il 20% alto e basso del viewport, quindi copre in parte le fasce di scroll (15%). Nel renderer software usato per i test questa sfocatura appare specchiata, quindi gli screenshot sono fatti senza. Nello screenshot del deploy non si vede, ma non ho potuto verificarlo su una GPU.
- **Peso.** Il chunk dell'engine (Three.js + GSAP) è ~200 kB gzip, caricato dopo il contenuto. Il campo di distanza dei titoli costa ~20 ms per titolo al layout (una volta, e a ogni resize).
- **Modalità hosted (iframe Framer).** Superficie trasparente verificata in un iframe di prova (profilo basso, senza sfocatura); la sfocatura dietro la colonna è esatta anche su canvas trasparente, ma non l'ho vista su una GPU reale.
- **V20 non misurata su GPU.** Le passate in più (sfondo a metà risoluzione, sei sfocature, due composizioni limitate alla colonna) girano solo quando lo sfondo cambia; la misura reale va fatta dopo il deploy.
