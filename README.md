# Memento Start — V26

Correzione dell’impulso touch e della navbar nel sito Framer. Progetto completo per Vercel, con build prerenderizzata e asset originali.

## Installazione

**Sono necessari due passaggi:** aggiornare il progetto Vercel e aggiungere `FRAMER_START_FIX.html` al Custom Code della pagina Start di Framer, in fondo al body. Istruzioni in `INSTALLAZIONE.md`. Lo script agisce sulla pagina ospitante: inserirlo nel documento dell’iframe non risolve la misura errata del genitore.

Nessun deploy pubblico è stato eseguito.

## Modifiche

- Eliminati cerchio, bordo e layer DOM dell’impulso.
- Il touch accende 2–5 punti separati per superficie visibile. Il segnale viaggia lungo brevi catene di cellule vicine, con percorsi, intensità e tempi differenti. Le singole cellule decadono in circa 180–340 ms; la propagazione resta limitata a tre generazioni. Non viene più illuminata una fascia di triangoli su tutta la card.
- Un dito fermo non alimenta l’hover continuo. Scroll e click restano nativi; rilascio e `pointercancel` non creano un secondo impulso. Pool massimo di quattro contatti, nessun nuovo canvas o contesto WebGL.
- Nei testi reagiscono le cellule raggiunte. L’overlay modifica il colore dell’inchiostro senza duplicare la copertura dei bordi. In assenza di WebGL il fallback accende brevemente i titoli raggiunti, senza cerchi.
- L’embed Framer usa l’altezza visibile del browser, aggiornata anche quando cambiano le barre. Il documento esterno non aggiunge un secondo scroll. La navbar interna ha inoltre un limite CSS di altezza, immediato anche prima del listener di resize.
- Blur superiore senza rotazione; altezza contenuta e primo tratto verso il contenuto completamente trasparente, per eliminare lo stacco rettangolare.

Conservati: Ghost Fibers con cinque layer, preset rosso/ambra, grain 0, foto già a colori su mobile, interazione desktop, immagini, impaginazione e testi. Rimangono cache delle superfici, sospensione fuori schermo, scroll nativo e risoluzione adattiva. Il limite di rendering dello sfondo è 30 render/s, non una promessa di FPS sul dispositivo.

## Sviluppo e verifica

Node.js 22 o 24.

```sh
npm ci
npm run dev
npm test
npm run build
npm run verify:preservation
```

`vercel.json` installa con `npm ci`, compila e pubblica `dist`. Il modulo pubblico per Framer ha un header CORS dedicato: può essere caricato dalla pagina ospitante.

`/qa.html` e `/qa-embed.html` sono pagine di verifica locali disponibili con `npm run dev`. La seconda riproduce il problema di `100vh` rispetto a una viewport visibile più corta e applica il modulo reale di correzione. Esiti e limiti in `docs/V26-verifica.md`.

L’ambiente browser usato per i controlli non dispone di WebGL. Sono verificati DOM, eventi, logica delle catene e compilazione/link degli shader con EGL software. Resa GPU, fluidità e barre del browser su telefono fisico richiedono la prova sul dispositivo. I tocchi dentro Google Maps appartengono all’iframe Google e conservano la navigazione nativa della mappa.

Licenze originali in `docs/ReactBits-LICENSE.md`, `docs/Inter-OFL.txt` e `docs/Tabler-LICENSE.txt`. I documenti V23–V25 sono storici; per questa versione fanno fede questo README, `INSTALLAZIONE.md` e `docs/V26-verifica.md`.
