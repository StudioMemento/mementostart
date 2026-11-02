# Verifica navbar — Start V6.4 / Overlay V5

2 novembre 2026. Kit V5 integrato integralmente, compreso `progressive-blur.mjs`; singolo bootstrap con Start attivo e hub pubblico.

Verifiche Chromium a 320×568, 390×844, 768×1024, 1440×900, 1920×1080 e 844×390:

- Unica voce attiva Start, glow ambra e nessun dot.
- Box 38/36/34 px, icone 28/26/24 px e target cliccabili 44×44 px.
- Otto livelli di blur per bordo, da 0,1875 a 24 px, maschere incorporate valide.
- Wordmark con proporzioni V4; layout desktop/mobile ispezionato visivamente.
- Cinque destinazioni pubbliche corrette; click su Start segue mementostudio.it/start. Logo collegato alla home pubblica.
- Nessun overflow orizzontale, footer libero dalla navbar, tastiera e reduced motion funzionanti.
- FAQ e dialoghi preservati; nessun errore JavaScript o asset locale mancante.
- Handshake con fixture su origine pubblica e origine tecnica Vercel: overlay figlio nascosto, Start attivo nell’host, ritorno allo stage senza reload.
- Anteprima HTML autonoma verificata da file locale con il nuovo modulo blur incorporato.

`npm run check` e `npm run export` superati. Verifica dei byte: cartella navigation uguale al kit allegato; contenuti, immagini, CSS principale e script applicativi invariati. Nell’HTML della pagina cambia soltanto l’hub dello snippet.

Prove locali con intercettazione delle richieste e fixture dell’hub. Destinazioni dei link controllate, senza modificare o verificare il deploy pubblico. Google Maps esclusa dalla prova locale. Dispositivi fisici non provati.
