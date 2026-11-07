# START V11 — Verifica

Data: 7 novembre 2026. Base: MEMENTO_START_V10_LOWPOLY_AMBER_VERCEL.zip (versione conservata nel pacchetto originario).

## Cinque correzioni

| Richiesta | Intervento | Riscontro |
| --- | --- | --- |
| Typo senza reticolo/VFX | Microtriangoli ad alto contrasto dentro i glifi, campo locale, passaggio luminoso e particelle | Ispezione visiva della headline; alpha reattiva 0,854 nella prova desktop |
| Nucleo delle tab vuoto | Gain interno portato a 0,50, alpha linee ricalibrata e protezione limitata ai testi reali | Campionamento pixel nel centro della tab attiva; oltre 190 pixel ambra nel campione di 50×50 CSS px |
| Reticolo globale offsettato | Bitmap e trasformazione del canvas derivate dalla sua dimensione CSS effettiva | Viewport desktop 1363 px, area CSS 1348 px, canvas logico 1348 px; mobile 390 px |
| Background da curare | Facce carbone più tenui, linee leggibili, densità variabile, risposta ambra locale | Revisione visiva desktop e mobile; nessuna scia curva renderizzata |
| Appear/disappear scroll assente | Driver condiviso per maschere e fronte wireframe, fascia al 20% | Stati intermedi, pausa e inversione sulle stesse posizioni verificati nel browser |

Il colore delle immagini è separato: base della tab attiva all’80%, pass locale a piena saturazione, immagini vicine neutre. Nelle FAQ il pass colore segue soltanto `.is-active`, mantenendo l’opacità mobile 0,25.

## Controlli di codice

`npm run verify` completato: preservazione esatta del markup principale, contatti, destinazione CTA, font e moduli navbar; controlli asset e sintassi; triangolazione deterministica e copertura dei tagli; impulso lungo il grafo, campo e curl; export autonomo senza dipendenze locali.

Il test V11 esercita la stessa `revealDistance()` invocata dal renderer. Non si affida soltanto alla vecchia funzione `cellVisibility()`. Controlla fascia di lettura, uscita/ingresso, copertura intermedia e uguaglianza delle celle all’inversione.

`npm run build` completato. Il pacchetto resta statico, senza installazione di dipendenze per il deploy.

## Controlli nel browser

Esito finale: **22 controlli superati, 0 falliti**.

La pagina è stata servita nell’anteprima di sviluppo. Il test riproducibile si trova in `docs/verification/v11/browser-harness.html`; aprirlo tramite il server di sviluppo per lanciare la suite e gli stati visivi. Il risultato finale è riportato nel file `browser-results.json` adiacente.

Il test verifica dimensione canvas, intensità typo, pixel del reticolo al centro, base colore, pass locale, neutralità della tab adiacente, pausa e inversione delle maschere, celle intermedie, responsive 390 px, assenza di overflow, rilascio/cancel touch, selezione FAQ, fallback, riavvio e unicità del motore.

Le prove di pausa attendono frame effettivamente processati prima di confrontare le maschere; il browser remoto riduce la cadenza di animazione. La transizione CSS delle immagini viene lasciata assestare prima di misurarne l’opacità.

## Limiti

- Viewport mobile e Pointer Events sintetici; nessuna prova fisica su iPhone/Android.
- Il browser remoto non permette di certificare 60 fps. I campioni includono costruzioni e resize della geometria e non sono un benchmark GPU.
- Reduced motion è gestito dal percorso CSS/JS esistente; la suite verifica il fallback esplicito, non un cambio della preferenza di sistema.
- Il wrapper Framer pubblico e il dominio Vercel non sono stati modificati. La verifica riguarda il pacchetto consegnato.
- I report precedenti in `docs/history` e `docs/verification/v10` sono storico.
