# START 6.7 — Navbar V12 Framer

## Integrazione

Cartella `navigation/` copiata integralmente dal kit `MEMENTO_NAVBAR_OVERLAY_V12_FRAMER(1).zip` e confrontata byte per byte. Include nuove immagini WebP, geometrie originali Memento/logotipo e calibrazione delle icone. Un solo bootstrap `?v=12.0.0`, con `data-memento-page="start"` e hub pubblico `https://mementostudio.it`.

Il pacchetto applica le proporzioni V12: fascia 320 px con margini minimi 20 px, glifi 11 px, box 40 px, simboli 34 px, target 48 px e distanza fra box pari al doppio del margine inferiore. Glow interno al box. Il blur Framer e il bridge restano quelli del kit, senza override aggiuntivi.

L’HTML autonomo è rigenerato con gli stessi moduli, quattro nuovi WebP incorporati e logotipo vettoriale. I 36 file degli asset della pagina restano identici alla revisione precedente; `index.html` cambia soltanto la query del bootstrap. Contatti, FAQ, mappa e footer conservati.

## Verifiche eseguite

- Kit originale: **24 controlli sorgenti superati**, inclusi tracciati originali, maschere/raggi blur, URL canonici, protocollo bridge con casi validi e invalidi, patch hub e sintassi.
- `npm run check`: asset, ID, riferimenti accessibili, sintassi, gradienti e configurazione Vercel validi.
- File della cartella `navigation/` identici al kit allegato; riferimenti locali di moduli e asset risolti.
- Cinque script eseguibili dell’HTML autonomo analizzati con `vm.Script`; nessun import o `import.meta` residuo. Verificata l’incorporazione esatta dei quattro WebP V12 e del logotipo.
- Archivio ZIP controllato tramite CRC e confronto di ogni file con i sorgenti; anteprima autonoma allineata.

## Ambito e limiti

Questa sessione verifica sorgenti, integrazione e archivio; non ripete la verifica visuale/interattiva su browser. I risultati responsive riportati nel kit V12 originale riguardano la sua anteprima, non costituiscono una nuova prova della pagina Start integrata. Il browser locale per i test non è disponibile.

Nessun deploy pubblico è stato modificato. Sostituire il contenuto del progetto Start con i file dello ZIP. All’interno dell’hub la navbar visibile resta quella del parent: distribuire la stessa cartella `navigation/` nel progetto hub per aggiornarla anche lì.
