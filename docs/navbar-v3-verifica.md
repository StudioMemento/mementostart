# Verifica navbar — Start V6.2

2 novembre 2026. Integrazione dell’overlay V3 fornito dall’utente nella pagina Start V6, revisione sorgente 6.1.

- Navbar e asset del kit copiati senza modifiche. Start è l’unica voce attiva, ambra con dot.
- Logo superiore, blur ai due estremi e cinque link; nessun doppio componente.
- Hero e footer rispettano gli inset; il contenuto finale non si sovrappone ai pulsanti. Nessun padding aggiunto al body.
- Bridge precedente sostituito con il protocollo 2 del kit V3.
- Handshake con un parent di prova sull’origine dell’hub: overlay della pagina nascosto, Start attivo nell’host.
- Footer: ritorno esplicito allo stage senza ricaricare l’iframe. FAQ ed Escape nei dialoghi non attivano il ritorno.
- Navigazione da tastiera, reduced motion, email, FAQ e dialoghi verificati.
- HTML autonomo rigenerato con gli stessi moduli e asset del kit; verificato da file locale.

Viewport Chromium: 320×568, 390×844, 768×1024, 1440×900, 1920×1080 e 844×390. Nessun overflow orizzontale. Screenshot desktop/mobile e footer ispezionati. Nessun errore JavaScript né asset locale mancante.

`npm run check` e `npm run export` completati. Immagini, copy, contatti e configurazione del sito conservati dalla revisione 6.1.

Le prove usano copie locali e una fixture dell’hub con origini distinte. Google Maps è esclusa dal controllo locale e non è stata modificata. Nessun repository o deploy pubblico aggiornato. Dispositivi fisici non provati.
