# Design QA — Memento START V6, revisione 6.1

final result: passed

Verificato il 1 novembre 2026 in Chrome. Questa revisione sostituisce le 12 immagini, senza modificare CSS, comportamento, struttura o copy della V6 approvata.

## Immagini e confronto

I soggetti comunicano il proprio contesto: busta, laptop email, smartphone in chiamata, marchi WhatsApp e Instagram, laptop con portfolio per Fiverr, lampadina, cartella progetto, clessidra, dialogo, pin e orologio. Le immagini conservano fondo nero, materia carbone, particelle e scie vorticose. La luce ambra arriva dall'alto a destra. La frammentazione lascia riconoscibile la sagoma principale.

Confronto visuale sorgente/risultato alla stessa scala per contatti, FAQ e sede: padding, dimensioni, ordine, tipografia e allineamenti conservati. Le nuove immagini non coprono i testi. Nei contatti resta il trattamento B/N con overlay uniforme 50% e gradient blur inferiore. Hover/focus ripristina colore e luminosità; chevron ambra. Verificato nell'HTML autonomo: grayscale(0), overlay 0 e chevron rgb(237,189,124) nello stato attivo.

## Responsive e interazioni

| Larghezza viewport | Overflow orizzontale | Altezza FAQ |
|---|---|---|
| 320 px | Nessuno | 620 px |
| 390 px | Nessuno | 620 px |
| 768 px | Nessuno | 640 px |
| 1024 px | Nessuno | 640 px |
| 1600 px | Nessuno | 640 px |
| 1920 px | Nessuno | 640 px |

Controllati i testi di titoli, email, card, FAQ, indirizzo e orari. Ispezione visuale mobile a 390 px e desktop a 1600 px. Prima FAQ aperta all'avvio; le quattro selezioni attivano il soggetto corrispondente e mantengono l'altezza del pannello.

La mappa mantiene il filtro scuro della V6. A riposo la catena è invert(.92) hue-rotate(180deg) contrast(.92) saturate(.72) grayscale(1); l'interazione cambia soltanto grayscale a 0. Embed Studio Memento, controlli, recensioni, logo e attribuzioni restano visibili. Pin e orologio caricati e leggibili anche nelle card mobile affiancate.

## Pacchetto

`npm run check` superato: riferimenti locali, ID unici, riferimenti accessibili, sintassi JavaScript, tolleranza gradienti DNA e output statico. `npm run export` completato. HTML autonomo aperto nel browser: 12 immagini incorporate caricate, FAQ funzionante e nessun errore applicativo nella console osservata.

Il pacchetto contiene solo i 12 asset finali utilizzati, i sorgenti, le licenze, la configurazione e i prompt corrispondenti. Nessuna pubblicazione effettuata.

Problemi aperti P0/P1/P2 relativi alla revisione: nessuno. Restano le dipendenze già documentate: Google Maps richiede rete; i documenti legali definitivi si collegano tramite configurazione. Le particelle sono immagini raster, non simulazioni animate.
