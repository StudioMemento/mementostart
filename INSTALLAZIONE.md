# Start V27 — Vercel + Framer

1. Sostituisci il progetto su `mementostart.vercel.app` con questa V27 e completa il deploy Vercel.
2. Apri **Framer → pagina Start → Custom Code → End of body**. Aggiungi questa riga, oppure aggiorna l’eventuale riga della versione precedente, e pubblica la pagina Framer:

```html
<script type="module" src="https://mementostart.vercel.app/navigation/framer-start.mjs?v=27.0.0"></script>
```

La riga è già pronta in `FRAMER_START_FIX.html`. Mantieni l’embed URL esistente. Inserisci lo script nel Custom Code **della pagina Framer**, non dentro un altro widget Embed HTML e non in `index.html` di Vercel.

## Perché il secondo passaggio serve

Il 15 novembre 2026 il sito pubblico carica la V26 dentro un wrapper Framer da 100vh, ma non carica il modulo `framer-start.mjs`. Il documento esterno può scorrere al termine di quello interno e spostare l’iframe: logo e dock escono così dalla viewport in momenti diversi. Il codice dentro l’iframe non può modificare direttamente il documento di un altro dominio.

Il modulo V27 interviene solo su `/start` e sull’iframe di `mementostart.vercel.app`. Mantiene l’embed ancorato all’origine della viewport, ne aggiorna l’altezza con quella visibile, impedisce lo scroll esterno e conserva quello nativo dentro Start. Il layout originale viene ripristinato quando Framer rimuove l’embed.

## Controllo sul telefono

Apri Start da zero con le barre del browser visibili. Logo e cinque icone devono essere presenti insieme. Scorri fino al fondo e torna su: non deve esserci un secondo tratto di scroll. Cambia orientamento e tocca in più punti: il reticolato deve accendersi per percorsi irregolari, alimentare i bordi, reagire nei testi e spegnersi. Nessun cerchio e nessuna intera tavola illuminata in modo uniforme.

Il numero è visualizzato senza +39, ma il collegamento di chiamata conserva il prefisso. I giorni sono sotto l’orario. La verifica automatica e dell’embed è completata; resa GPU e barre native non sono state provate su un telefono fisico.

Nessun deploy pubblico è stato eseguito da questa consegna.
