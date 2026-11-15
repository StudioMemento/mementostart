# Verifica V27 — 15 novembre 2026

## Esiti

- 40 test in cinque file superati. Le prove esercitano propagazione fra superfici, reticolato sparso, energia effettiva nelle celle, collegamento ai bin dell’edge glow, esaurimento, frame iniziale lento e frame perso durante la reazione, superfici fuori viewport, listener passivi e pool limitati.
- TypeScript, build client, SSR e prerender superati. Asset originali, preset a cinque layer senza grain e moduli preservati controllati tramite impronte e parametri. Gli shader non sono cambiati rispetto alla V26; rimane valida la precedente verifica di compilazione/link EGL software, distinta dalla prova visiva.
- Browser a 320×700, 360×740 e 390×844: 30 controlli superati per misura. Logo e navbar presenti insieme in alto, a metà e a fondo pagina. Numero su una riga senza overflow, link telefonico internazionale, giorni sotto l’orario, margine inferiore e font della riga secondaria coordinati all’indirizzo. Controllati anche immagini a colori, fallback touch del titolo, assenza di cerchio, FAQ, dialog, focus, mappa e scroll.
- Desktop effettivo 1280×900: 30 controlli superati. Il test verifica esplicitamente che la larghezza interna dell’iframe sia 1280 px; il contenitore di prova non si restringe tramite flex.
- Embed annidato a 390×844 e 360×740: 15 controlli superati per misura. Prima riproduzione del difetto con iframe 100vh, poi applicazione del vero modulo Framer e verifica con barre simulate da 35, 100 e 150 px. Logo/dock rimangono contemporaneamente nella viewport in alto, a metà, in fondo e tornando su. Il genitore resta a scroll 0; il layout originale è ripristinabile.
  - 390 px: altezza visibile iniziale 744 px, base dock 733 px; dopo espansione 809/798 px; ulteriore riduzione a 694 px.
  - 360 px: altezza visibile iniziale 640 px, base dock 629 px; espansione a 705 px e riduzione a 590 px, con entrambi gli elementi dentro la viewport.

## Causa dell’embed confermata sul sito pubblico

La pagina pubblica carica `navigation/start.bundle.js?v=26.0.0` dentro l’iframe Vercel. Non sono presenti né lo script `framer-start.mjs` né il marcatore `data-mm-start-host`. Il wrapper resta alto 100vh e il documento Framer può scorrere.

La V27 contiene la correzione e la procedura, ma non è stata pubblicata. È necessario eseguire entrambi i passaggi di `INSTALLAZIONE.md`; aggiornare solo Vercel non modifica il documento Framer.

## Limite di verifica

Il browser di prova non crea contesti WebGL. La logica di propagazione e l’edge glow sono verificati sui dati che alimentano il renderer, ma resa GPU, intensità visiva, framerate e comportamento delle barre native su un telefono fisico restano da verificare. Non viene dichiarato un framerate misurato. Le barre dei test sono simulate e non equivalgono a Brave/Safari su dispositivo.

Nessun messaggio inviato, deploy pubblico o modifica dei consensi dell’utente. Le interazioni sono state provate soltanto nell’anteprima locale.
