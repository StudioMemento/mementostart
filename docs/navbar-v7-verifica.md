# START 6.6 — integrazione Navbar V7 Clean

## Modifiche

- Cartella `navigation/` sostituita integralmente con quella di `MEMENTO_NAVBAR_OVERLAY_V7_CLEAN(1).zip`, senza modificare i moduli del kit.
- Un solo bootstrap con query `?v=7.0.0`, `data-memento-page="start"` e hub `https://mementostudio.it`.
- Rimosso il vecchio `progressive-blur.mjs`. La V7 usa `blur.mjs`, otto livelli per bordo e maschere CSS native.
- HTML autonomo rigenerato con gli stessi moduli V7, immagini, icone e font incorporati.
- Rinominata la variabile di spaziatura della pagina per distinguerla dai controlli del vecchio blur; valori, padding e contenuti restano identici.

## Controlli completati in questa revisione

- `node tests/verify.mjs` sul kit originale V7: **19 controlli superati**, inclusi maschere/raggi, destinazioni, protocollo del bridge, sintassi e parsing dell’anteprima del kit.
- `npm run check` su Start: asset locali, ID univoci, riferimenti accessibili, sintassi JavaScript, gradienti DNA e configurazione statica Vercel validi.
- Parsing dei cinque script eseguibili dell’HTML autonomo con Node `vm.Script`; nessun import o `import.meta` residuo.
- Cartella `navigation/` confrontata byte per byte con il kit V7 allegato.
- Tutti i 35 file degli asset della pagina, escluso il solo foglio degli inset, sono identici al pacchetto precedente. L’HTML di ingresso differisce soltanto per la query di versione del bootstrap.
- Archivio finale confrontato con i sorgenti e con la preview autonoma; CRC ZIP valido.

## Comportamento previsto dal kit

Start è selezionato in ambra. Il blur rimane visibile con la preferenza “Riduci trasparenza”; l’attributo opzionale `respect-system-transparency` cambia quel comportamento. Il protocollo V2 e la scomparsa dell’overlay locale dopo l’handshake con l’hub sono conservati. I link pubblici restano su `mementostudio.it`.

## Limiti della verifica

Questa revisione completa i controlli sui sorgenti e sull’archivio. Non è stata completata una nuova verifica visuale o interattiva del pacchetto integrato: il browser locale per i test non era disponibile e il browser collegato non consentiva l’apertura della preview nel formato proposto. Le verifiche desktop/mobile della V6 sono storiche e non valgono come nuova verifica V7. I controlli visuali documentati nel kit originale si riferiscono alla sua anteprima.

Il deploy pubblico non è stato modificato. Per aggiornare Start sostituire i file del suo progetto con il contenuto dello ZIP. Dentro l’hub l’overlay visibile appartiene al parent: per aggiornare anche quello va distribuita la cartella `navigation/` nel progetto hub.
