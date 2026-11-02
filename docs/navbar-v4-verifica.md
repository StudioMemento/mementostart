# Verifica navbar — Start V6.3 / Overlay V4

2 novembre 2026. Cartella `navigation/` identica al kit V4 allegato: include logo aggiornato e due maschere alpha del blur.

Verificati in Chromium a 320×568, 390×844, 768×1024, 1440×900, 1920×1080 e 844×390:

- Start unica voce attiva, glow ambra e nessun dot.
- Logo alto la metà della V3 con larghezza e margini conservati.
- Icone 32 px desktop, 30 px mobile e 28 px in landscape basso; target cliccabili 44×44 px.
- Due maschere del blur caricate; ispezione visiva di desktop e mobile.
- Nessun overflow orizzontale; footer libero dalla navbar.
- FAQ, dialoghi, tastiera e reduced motion funzionanti.
- Handshake con host di prova: overlay figlio nascosto, Start attivo nell’host; ritorno allo stage senza reload.
- HTML autonomo rigenerato e provato da file locale, comprese le nuove maschere incorporate.

`npm run check` e `npm run export` completati. Nessun errore JavaScript o asset locale mancante. HTML della pagina, CSS principale, script applicativi, immagini e contatti invariati rispetto a Start 6.2.

Prove locali con fixture dell’hub, non sul deploy pubblico. Maps esclusa dal controllo locale. Dispositivi fisici non provati.
