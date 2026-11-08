# Memento Start — V13

Pagina Start senza VFX dinamici, con tutte le 12 immagini dei contenuti rigenerate nello stile del riferimento: carbone, superfici lowpoly, reticolo triangolare sottile e luce ambra dall'alto a destra.

Il rollback rimuove il motore VFX, l'avvio VFX, i particellari e gli effetti dinamici su testi e bordi. L'aspetto poligonale è incorporato nelle immagini WebP. Restano i normali hover CSS, il cambio immagine delle FAQ e la navbar overlay condivisa.

## Deploy su Vercel

1. Estrai questo ZIP.
2. Usa come cartella del progetto quella contenente `index.html`, `assets`, `navigation` e `vercel.json`.
3. Per un progetto esistente, sostituisci i file pubblicati con il contenuto di questa cartella e avvia il nuovo deploy.
4. Framework Preset: **Other**. Root Directory: la cartella estratta. Output Directory: **`.`**. Nessun comando di installazione o build richiesto: il progetto è statico.

La configurazione è già presente in `vercel.json`. Non caricare lo ZIP come unico file del repository.

## Anteprima locale

Con Node.js installato:

```sh
npm run dev
```

Apri `http://localhost:4173`.

`npm run check` verifica asset, riferimenti accessibili, sintassi JavaScript e configurazione statica. `npm run build` crea anche una copia autonoma in `dist` per altri hosting statici; il deploy Vercel preconfigurato usa direttamente la root.

## Contenuti e asset

Configurazione contatti: `assets/config.js`. Layout: `assets/start.css`. Adattamento delle nuove immagini: `assets/artwork.css`. Immagini: `assets/images/`.

Rigenerate: email progetto, email studio, telefono, WhatsApp, Instagram, Fiverr, indirizzo, orari e quattro FAQ. Logo, icone funzionali e icone della navbar condivisa sono conservati.

Il pacchetto non modifica direttamente il sito già online.
