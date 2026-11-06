# Memento START — V8

Revisione della pagina Start precedente al VFX PASS. Base V6 revisione 6.5.0, con overlay V12 integrato nella V7 e corretto in questa V8. Il pacchetto non include il motore VFX PASS.

## Modifiche

- “SIAMO QUI” precede la sezione delle domande.
- Titolo della tab: “Frequently Asked Questions”, impaginato su due righe.
- Chiusura “CONTINUA / IL VIAGGIO!” su due righe, con un solo gradiente bianco–ambra distribuito sul blocco, come “LET’S WORK / TOGETHER”.
- Logo, navbar e blur sono presenti nell’HTML iniziale. Il JavaScript aggiunge il comportamento senza ricreare gli elementi visibili.
- Sfondo carbone impostato prima del rendering, indipendente dalla connessione della navbar. Un normale iframe non attende più il fallback dell’hub.
- Icone navbar WebP da 144 × 144 px incorporate nel markup: circa 22 KB complessivi, senza richieste successive per mostrarle.

Restano gli asset e le interazioni della base: contatti, mappa scura, FAQ, privacy, animazioni leggere e link pubblici. Il kit di navigazione porta la versione 12.1.0.

## Vercel

Estrarre lo ZIP e usare la cartella che contiene `index.html` come radice del progetto.

| Impostazione | Valore |
|---|---|
| Framework | Other |
| Install command | Vuoto |
| Build command | Vuoto |
| Output directory | `.` |
| Entry point | `index.html` |

La configurazione è già in `vercel.json`. Il pacchetto non pubblica automaticamente il dominio.

## Anteprima e sorgenti

`MEMENTO_START_V8_NAV_OVERLAY.html` è l’anteprima autonoma con CSS, JavaScript, font e immagini incorporati. Google Maps e le destinazioni esterne richiedono Internet. Per il sito usare `index.html`, `assets/` e `navigation/`.

Comandi senza dipendenze aggiuntive:

```sh
npm run dev
npm run check
npm run export
```

Il server locale usa la porta 4173. `export` rigenera il markup iniziale della navbar, il bundle e l’HTML autonomo. Dopo una modifica ai moduli della navbar, eseguire questo comando prima della pubblicazione. La configurazione dei contatti è in `assets/config.js`.

## Overlay e modalità embed

Non aggiungere un altro bootstrap: `index.html` contiene già il markup dell’overlay e carica un solo `navigation/start.bundle.js`.

La modalità iniziale viene scelta nell’head:

- Pagina diretta o iframe ordinario: sfondo `#121212`, logo e navbar visibili subito.
- Iframe dell’hub con `?mementoEmbed=1`: superficie trasparente e overlay del figlio nascosto, per usare quello del contenitore. Il protocollo V2 e il fallback in caso di mancato handshake sono conservati; l’handshake non cambia il colore dello sfondo.

Il rendering dichiarativo usa lo stesso generatore del componente. Un piccolo fallback immediato gestisce i browser senza Declarative Shadow DOM. Il bundle conserva il DOM esistente durante l’inizializzazione.

| Elemento | Destinazione |
|---|---|
| Logo | https://mementostudio.it/ |
| Memento | https://mementostudio.it/studio |
| Services | https://mementostudio.it/services |
| Projects | https://mementostudio.it/projects |
| LevelUp | https://mementostudio.it/levelup |
| Start | https://mementostudio.it/start |

Le misure, i tracciati del logo e il blur progressivo V12 sono conservati: box 40 × 40 px, target 48 × 48 px, fascia 320 px, otto livelli di blur per bordo. I quattro render navbar derivano dagli originali del kit, ridimensionati e compressi; gli originali restano in `navigation/assets/`.

Verifiche correnti in `docs/VERIFICA_V8.md`. Documenti delle revisioni precedenti in `docs/history/`, da consultare come storico e non come istruzioni d’installazione della V8. Licenze Inter e Tabler conservate in `docs/` e nell’HTML autonomo.
