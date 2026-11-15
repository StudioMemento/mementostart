# Memento Start — V25 Touch / Ghost Fibers

Aggiornamento della V24, pronto per un deploy di prova su Vercel.

## Avvio e deploy

Node.js 22 o 24. Estrarre lo ZIP nella cartella principale del progetto.

```sh
npm ci
npm run dev
npm test
npm run verify:preservation
npm run build
```

`vercel.json` usa `npm ci`, `npm run build` e la directory `dist`. La build include HTML prerenderizzato e la navbar già presente nel documento, prima del contenuto React. Nessuna pubblicazione è stata eseguita.

## Modifiche V25

- **Background:** configurazione del link e di `BKG REACT 2.txt`, con **5 layer reali**. Il componente originale limita i layer a 3: sono stati aggiunti altri due piani con profondità e fase distinte. Preset completo in `src/background/preset.ts`.
- **Configurazione:** glow rosso `#ef4444`, fibre ambra `#f97316`, rotazione 25°, spessore 0.75, velocità 0.1, roll 0.5, 160 fibre per layer, depth of field 2. Le proprietà omesse nel nuovo allegato tornano ai valori predefiniti React Bits, incluso waves 1. Intro attiva come nel nuovo codice allegato.
- **Noise:** grain 0 nel background e nel compositing di tab/testi; rimosso anche il dithering animato del compositing. Conservati la forma delle fibre, il movimento e la struttura triangolare degli effetti.
- **Navbar mobile:** dimensioni della viewport impostate subito, aggiornate quando varia la barra del browser o la pagina viene ripristinata. Layer di compositing separato, contenuto e icone già nell’HTML; nessuna attesa dello scroll o di WebGL. Lo script di build sincronizza markup iniziale, stile e bundle da un’unica sorgente.
- **Immagini:** colore pieno già a riposo sui layout fino a 767 px e sui dispositivi senza hover/con puntatore touch. La regola vale sia per il DOM sia per lo shader; su desktop rimane l’interazione esistente.
- **Touch:** un impulso per contatto, centrato nel punto toccato; attraversa il viewport e attiva la geometria luminosa delle card e dei testi che incontra. Continua durante lo scroll, termina da solo e non intercetta click o gesti. Massimo quattro onde contemporanee; gli elementi grafici vengono rimossi al termine.
- **Fallback:** anche senza WebGL rimangono navbar, colori, anello di propagazione e accensione dei titoli. `prefers-reduced-motion` disattiva l’onda in movimento.

Rimangono le ottimizzazioni della V24: cache delle superfici, nessuna rasterizzazione per le sole variazioni di altezza, scroll nativo, aggiornamenti mirati, sospensione delle superfici fuori schermo. Ghost Fibers conserva il limite di 30 render/s e la risoluzione adattiva; il limite non è una misurazione degli FPS.

## Verifica

37 test automatici verificano anche la propagazione agli angoli, l’attivazione delle cellule dei titoli distanti, il rilascio dell’energia, il limite delle onde, i listener passivi e il dimensionamento iniziale della navbar. La verifica di conservazione confronta asset, moduli originali, shader e tutti i parametri risolti del nuovo preset.

La pagina `/qa.html`, disponibile con `npm run dev`, verifica navbar, colori mobile, touch sintetici, FAQ, dialog, mappa, focus e scroll. Dettagli e limiti in `docs/V25-verifica.md`.

**Limite:** l’ambiente browser di verifica non dispone di WebGL. Il comportamento DOM e gli eventi sono verificabili; resa GPU, FPS e inerzia di Safari richiedono una prova su dispositivo reale. I tocchi dentro l’iframe interattivo di Google Maps appartengono al documento Google e non si propagano alla pagina: l’interazione della mappa rimane nativa.

## Fonti

Ghost Fibers: https://reactbits.dev/backgrounds/ghost-fibers — sorgente originale acquisita il 15 novembre 2026 e adattata a cinque layer. Licenza in `docs/ReactBits-LICENSE.md`; mantenute le licenze Inter e Tabler. I documenti V23/V24 sono storici; per questo pacchetto fanno fede questo README e i file V25.
