# Memento Start — V23 (React + Three.js VFX, senza sfondo)

Pagina START su React + Vite + TypeScript, con il sistema VFX del brief tecnico: un solo contesto WebGL (Three.js, shader GLSL propri), regia GSAP + ScrollTrigger, scroll nativo.
Markup, testi, layout CSS, immagini e navigazione condivisa sono quelli dello skeleton V13: font, interlinee, padding e Google Maps sono identici alla V13 (misurati elemento per elemento).

**DNA VFX.** Le regole di materia, energia, luce, movimento e layout valgono per tutte le pagine e sono nel design system "Memento — VFX DNA"; una copia è in `docs/dna/` (con la tavola master). Questa pagina ne è l'implementazione di riferimento.

**V23.** Nessuno sfondo: il mondo d'ossidiana della V22 è rimosso (codice, plate, strumenti di produzione). La pagina è nero vero (`#000`). Correzioni:

1. **Bande orizzontali al caricamento.** Erano la sfocatura progressiva della navigazione (8 livelli di `backdrop-filter` mascherati nel 20% alto e basso) sopra un nero non nullo (`#020202`): ogni gradino della maschera arrotonda di un livello, una riga ogni ~17 px. Con nero vero non possono comparire (Chrome: 464 righe → 0). Anche i pannelli delle card sono `#000`.
2. **Alone nero sui testi.** L'overlay dei titoli copriva il bordo antialias con alpha ×8 e il bagliore aveva una sua copertura: cancellavano ciò che stava dietro il bordo delle lettere. Ora l'overlay prende la quota calda del testo con la stessa copertura del glifo e il passaggio base cede esattamente quella quota; bordo interno e bagliore sono solo luce. In più la texture del testo è mappata esattamente sulla griglia dei pixel (niente ricampionamento: nitida come il DOM).
3. **Le tab non si disintegravano del tutto.** Il velo nero delle card di contatto (`::after`, 50%) restava nel DOM sopra il canvas: quando le celle uscivano con lo scroll, restava la sagoma della card. Il velo ora è disegnato dall'engine (`--vfx-veil`, `uVeil`), si alza in hover e in focus come prima e se ne va con le celle.
4. **Spigoli della topologia nelle tab più sottili:** fili sotto il mezzo pixel per lato, mai sommati negli angoli.
5. **Celle della reazione nelle tab a una sola scala:** mediana ~25 px, misure miste tra ~16 e ~36 px, uguali al bordo e al centro (prima 15 px al bordo e 62 px al centro).
6. **Contenuto come V13:** tolti gli override di tipografia e ritmo (interlinea .9 dei titoli, padding legati alle fasce, numero di telefono senza a capo); di nuovo Google Maps incorporato, con la preferenza "Google Maps" nei cookie (vale per la visita) e i testi privacy/cookie della V13.

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

- **Energia = reazione a catena** (`chain.ts`): ogni superficie ha una rete di celle triangolari irregolari. Una cella accesa può accendere le vicine poco dopo, con probabilità data dalla sua zona (zone che conducono, zone dove si spegne); poi riposa e decade col suo tempo. Le generazioni sono limitate: ogni reazione ha una fine. Il puntatore, il tocco, il focus e il loading accendono celle sparse vicino al punto, mai un disco.
- **Card**: un solo insieme di celle, tutte della stessa scala (misure miste), più spesso visibili verso il contorno; spigoli a filo sottile. Ogni cella ha la sua visibilità (forte, debole, appena percettibile, invisibile) e una sua saturazione; il puntatore le sveglia dove si trova e la reazione a catena passa per le stesse celle, con lo stesso materiale. Una card vicina al cursore (nel raggio, senza hover) accende il bordo e le celle sul lato rivolto al cursore, e scalda appena l'immagine. L'immagine in hover viene illuminata dall'interno (grading caldo della sua luminanza; il nero resta nero, i bordi dell'immagine sfumano). Testi e icone hanno un solo colore, mai sfumature, e restano dello stesso peso: vicino al cursore prendono una tinta ambra chiara e molto diffusa.
- **Titoli**: interlinea della V13 e un'unica sfumatura sull'intero blocco. Il gradiente ambra (`VFX.color.titleAmber`: bianco caldo in alto, arancio alla base) è lo stato in hover; in quiete il blocco mostra lo stesso gradiente desaturato (stessa luminanza, nessuna tinta). Nel range, giallo caldo con accenti arancio delle micro-faccette e un reticolato chiaro sale dalla base solo nelle celle che il cursore raggiunge: il range è un insieme di celle allungato lungo la frase, ognuna con la sua portata, e si accende e si spegne nel tempo (`driveRange` in `engine.ts`), quindi non forma mai un disco. Glow caldo e un bloom leggero seguono la sagoma di ogni lettera grazie a un campo di distanza (`sdf.ts`). Quando il blocco si scalda, la passata base cede al suo overlay la stessa quota di testo che l'overlay disegna, con la stessa copertura: il peso del font non cambia e il bordo delle lettere non ha aloni.
- **Scroll**: tassellazione monocromatica legata alla posizione, con celle piccole e di misure diverse e un leggero vortice in curl noise. Quando la pagina si ferma, le celle in uscita diventano particelle che si allontanano e svaniscono; riprendendo lo scroll la struttura torna dalla posizione.
- **Mappa**: Google Maps incorporato come nella V13 (iframe, filtro scuro, a colori in hover). È DOM sopra il canvas: la sua superficie è `solid` (non si frammenta con lo scroll) e la sua cornice resta nel DOM. Dalle "Preferenze cookie" si può spegnere per la visita; al suo posto compare "Maniago." con il pulsante per caricarla.

Il DOM resta la fonte di verità per layout, semantica, focus e click. Quando texture, font e misure sono pronti l'engine aggiunge `html.vfx-live` e il DOM smette di dipingere le superfici registrate (niente doppio rendering). Qualsiasi errore o la perdita del contesto tolgono la classe e torna la pagina DOM.

| Modulo (`src/vfx/`) | Responsabilità |
| --- | --- |
| `config.ts` | Colori, luci, densità, catena, raggi, durate, profili di qualità |
| `chain.ts` | Reazione a catena sulle celle (funzioni pure, testate) |
| `geometry.ts` | Rete irregolare delle superfici (Delaunay, anche per la tassellazione dello scroll; nelle card una sola scala, con la vicinanza al contorno per la visibilità) |
| `border.ts` | Luce del bordo per segmenti |
| `registry.ts`, `react.tsx` | Registro superfici, `useSurface('title' \| 'card')`, `useVfxSignals()` |
| `input.ts`, `scroll.ts` | Puntatore (posizione, velocità, quiete), scroll nativo e fasce |
| `structure.ts` | Composizione strutturale (stesse formule degli shader) |
| `raster.ts` | Maschere dai glifi reali, icone, divisori, dipinte da un'origine sulla griglia dei pixel; `object-fit` / `object-position` |
| `sdf.ts` | Campo di distanza dei glifi (bordo interno e bagliore esterno dei titoli) |
| `particles.ts` | Scintille dai glifi, frammenti che escono dalle card |
| `shaders.ts`, `engine.ts` | Risorse GPU, pass, bloom selettivo, loop unico (ticker GSAP); frame in alta precisione (half float, MSAA ×4) e grade finale (`GRADE_FRAG`: spalla delle luci, bloom e striatura, vignettatura, grana, aberrazione, dithering) |

## Controlli eseguiti

- V23: `tsc`, 22 test (i test dello sfondo sono stati rimossi con lo sfondo; quello sulle celle delle card ora verifica una sola scala con misure miste), build di produzione con prerender, nessun errore in console.
- Layout confrontato con la V13 in Chrome a 1600×900: posizione, dimensione, font, interlinea e padding di titoli, card, mappa, FAQ, legal e chiusura identici.
- Bande: pagina in caricamento in Chrome, righe a valore costante diverso dal fondo: 464 con `#020202`, 0 con `#000`; spariscono anche togliendo la navigazione (prova della causa).
- Screenshot in Chrome headless (renderer software): titolo in hover (profilo di luminanza attraverso un'asta: bagliore → bordo → lettera senza avvallamenti), card in hover (fili sottili, una scala di celle), card nella fascia d'uscita (nessuna sagoma residua), fallback senza WebGL (pagina V13 con il velo DOM).

## Non verificato o limite noto

- **Le bande della navigazione su altre pagine.** La causa è nella sfocatura progressiva condivisa: su pagine con un fondo uniforme non nero (servizi, portfolio) le righe possono comparire. Qui è risolto con il nero vero; la correzione alla radice va fatta nel repository `navigation`.
- **Prestazioni reali.** L'ambiente di sviluppo ha solo un renderer software (2–4 fps): nessuna misura di fps su GPU o telefoni. Senza sfondo il frame costa meno della V22 (niente plate, profondità di campo e reazione a schermo intero); le card hanno più celle piccole (circa 680 su una card email, prima 440), comunque calcolate solo durante una reazione. Le sequenze in movimento sono state controllate per fotogrammi, non a velocità reale.
- **Safari e Firefox**, in particolare l'allineamento glifi DOM → GPU.
- **Sincronia con lo scroll nativo.** Il canvas segue lo scroll a ogni frame; se il main thread resta indietro, le superfici GPU possono ritardare di un frame rispetto agli elementi rimasti DOM (mappa, anello di focus).
- **Sfocatura della navigazione.** L'overlay esistente sfoca il 20% alto e basso del viewport, quindi copre in parte le fasce di scroll (15%). Nel renderer software usato per i test questa sfocatura appare specchiata, quindi gli screenshot sono fatti senza. Nello screenshot del deploy non si vede, ma non ho potuto verificarlo su una GPU.
- **Peso.** Il chunk dell'engine (Three.js + GSAP) è ~200 kB gzip, caricato dopo il contenuto; senza i plate dello sfondo un desktop scarica circa 0,6 MB in meno (0,25 MB su mobile). Il campo di distanza dei titoli costa ~20 ms per titolo al layout (una volta, e a ogni resize).
- **Modalità hosted (iframe Framer).** Il canvas è trasparente e il fondo è quello della pagina Framer: in V23 nessuna luce dei titoli ha più copertura propria, quindi nemmeno lì può scurire ciò che sta dietro. Non verificato in un iframe reale.
- **Velo delle card in hover.** Riprodotto nell'engine con una curva esponenziale (~0,12 s), non con la curva CSS esatta (0,5 s expo-out): la differenza è sotto la soglia percettiva ma non l'ho misurata su GPU.
