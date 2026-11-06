# Start V8 — Verifica

6 novembre 2026. Revisione della V7, sulla base Start V6 rev. 6.5.0 precedente al VFX PASS.

## Controlli statici

- `npm run export`: generati markup iniziale dell’overlay, bundle singolo e HTML autonomo.
- `npm run check`: asset locali, ID univoci, riferimenti accessibili, sintassi JavaScript, gradienti e configurazione validi.
- HTML autonomo: sei script eseguibili validati sintatticamente; nessun riferimento locale residuo ad asset o bundle.
- Nessun motore VFX PASS aggiunto.

## Browser Chromium

Verifiche in iframe a larghezze nominali 320, 390, 768, 1024 e 1280 px. Sui viewport con scrollbar lo spazio utile è inferiore di 15 px. Queste prove verificano il comportamento responsive, non dispositivi fisici.

| Verifica | Risultato |
|---|---|
| Ordine sezioni | Contatti → Siamo qui → Frequently Asked Questions → Privacy → Continua il viaggio |
| Heading FAQ | Testo completo, leggibile su mobile e desktop |
| Apertura “Costi e tempi?” | Risposta visibile, domanda precedente chiusa |
| Chiusura | Due righe CONTINUA / IL VIAGGIO! |
| Gradiente della chiusura | Stesso valore CSS dell’hero, applicato al blocco complessivo |
| Overflow della pagina e dei testi controllati | Assente alle larghezze verificate |
| Overlay | Un solo elemento; Start attiva; logo e blur presenti |
| Tastiera navbar | Freccia sinistra da Start sposta il focus su LevelUp |
| HTML autonomo | Apertura riuscita, navbar e chiusura verificate visivamente |

## Caricamento ritardato

Prova con il bundle della navbar ritardato artificialmente di 2500 ms:

- Prima della registrazione del componente, l’overlay è già visibile dal markup iniziale.
- Nei campioni raccolti durante 4 secondi, il fondo rimane `rgb(18, 18, 18)`.
- Il numero di overlay resta uno.
- Gli stessi nodi interni sono conservati dopo l’inizializzazione: nessuna sostituzione del logo, delle icone o dei filtri.

Prova senza gli script differiti: overlay visibile e componente non ancora registrato, a conferma che il rendering non attende il bundle.

Prova con `mementoEmbed=1` e senza handshake: il fallback rende disponibile la navbar, mantenendo la superficie trasparente dall’inizio alla fine. La connessione con l’hub pubblico non è stata collaudata in questa revisione.

Nessuna comunicazione inviata e nessun dominio pubblicato durante la verifica.
