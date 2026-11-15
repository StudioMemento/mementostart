# Memento Start — V24 Ghost Fibers

Aggiornamento della V23 allegata, pronto per Vercel. Nessuna pubblicazione eseguita.

## Avvio

Richiede Node.js 22 o 24.

```sh
npm ci
npm run dev
```

Aprire l'indirizzo stampato dal server. Per i controlli responsive, aggiungere `/qa.html` all'indirizzo locale.

## Build per Vercel

```sh
npm run build
```

La build genera `dist/` con HTML prerenderizzato. `vercel.json` contiene già framework, comando e directory di output. Importare il contenuto dello ZIP nella cartella principale del progetto Vercel.

## Background

Ghost Fibers originale di React Bits, con i parametri del file e dello screenshot forniti. Configurazione completa: `src/background/preset.ts`.

- Tre layer, 160 fibre, stile dots, colore `#f97316`.
- Onde 2.5, twist 1, volume 1.5, spread 2.5, scale 0.75.
- Depth of field 2, fold glow 3, glow 0.5, grain 0.1.
- Velocità 0.5, roll 0.1, hover focus; intro e click pulse spenti.
- Fondo fisso sull'intera pagina, senza intercettare click o scroll.

Il background dispone di un budget separato: limite di 30 disegni al secondo, DPR massimo 1 e risoluzione adattiva in caso di rallentamento persistente. Numero di fibre, densità, colori e parametri artistici restano invariati. La frequenza è un limite, non una promessa di FPS.

## Ottimizzazioni e correzioni

- Canvas degli effetti ancorato al documento e mosso dallo scroll nativo insieme alla mappa. Buffer con margine superiore/inferiore per evitare ritagli durante lo scorrimento.
- Separazione tra resize dei buffer e ricostruzione delle texture. La barra del browser mobile non fa più ridisegnare tutti i testi.
- Cache delle superfici; aggiornamento della sola FAQ, immagine o testo modificato.
- Impulsi visivi indipendenti dalle richieste di layout.
- Superfici lontane dalla viewport sospese e upload dei particellari solo quando servono.
- Eliminati GSAP e ScrollTrigger: animazione di ingresso con la stessa curva, gestita nel ciclo nativo.
- Listener della rotella passivo nella pagina autonoma; mantenuto il protocollo di navigazione con l'hub.
- Spaziatura basata su `svh` per evitare spostamenti durante l'apertura della barra mobile.
- FAQ controllate con un solo aggiornamento per attivazione.
- Pulsanti legal stabili tra i render: chiusura dei dialog e ritorno del focus corretti.
- Contenuto DOM disponibile se WebGL non si avvia; caricamento del background isolato dal contenuto principale.

Palette, shader di superficie, catene luminose, geometrie, particelle, testi e asset della V23 sono conservati. La sola modifica agli shader di superficie riguarda la proiezione sul canvas che segue il documento. Bloom e scala delle celle restano attivi anche nei profili adattivi; varia la risoluzione.

## Verifiche

```sh
npm test
npm run verify:preservation
npm run build
```

- 28 test automatici: catene, geometrie, tipografia, particelle, registro, scroll e resize.
- Verifica di integrità degli asset e del nucleo degli effetti rispetto alla V23.
- Confronto automatico dei 27 parametri esplicitamente forniti nel file; gli altri valori sono riportati dallo screenshot.
- Pagina locale `/qa.html` per FAQ, dialog, focus, preferenze mappa, navbar e scroll a quattro dimensioni.

**Limite della verifica:** il browser disponibile durante questa lavorazione ha WebGL disabilitato. Layout e navigazione sono stati controllati nel fallback DOM. Non sono certificati il rendering GPU, il confronto visivo finale o gli FPS su iPhone/Safari. Prima di sostituire il deploy live, ripetere la prova del video su un dispositivo con WebGL attivo, usando le istruzioni in `docs/V24-verifica.md`.

## Fonti e licenze

- Ghost Fibers: https://reactbits.dev/backgrounds/ghost-fibers
- Sorgente acquisita da https://reactbits.dev/r/GhostFibers-TS-CSS.json il 15 novembre 2026.
- Licenza inclusa in `docs/ReactBits-LICENSE.md`; il componente è integrato in questo sito.
- Licenze Inter e Tabler mantenute nella cartella `docs/`.
- Il README precedente è conservato in `docs/V23-README.md` come documento storico.
