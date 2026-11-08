# Asset e provenienza — V12

## Memento: materiale nuovo, sagoma identica

`memento-paths.mjs` conserva esattamente il path e il poligono dell’SVG fornito. La finitura metallica è realizzata con gradienti e facce triangolari SVG, ritagliati da un clipPath che usa gli stessi tracciati originali. Anche le lumeggiature sui bordi sono ritagliate dentro la sagoma. Nessuna estrusione esterna modifica il contorno. Luce ambra dal basso nello stato attivo.

Le copie originali di icona e logotipo sono conservate. I glifi non sono ridisegnati: sono visualizzati a 11 px, con proporzioni originali.

## Projects quasi frontale

Il render V10 di Projects è stato modificato con lo strumento integrato di generazione immagini: vista quasi frontale, pannello largo, base quasi orizzontale e angolo inferiore sinistro pieno. Materiale metallico triangolare e luce ambra dal basso conservati. Il PNG è codificato in WebP lossless, con pixel RGBA identici; nessun ritocco pittorico tramite codice.

Services, LevelUp e Start riusano i WebP V10, senza rigenerazione. Il vecchio foglio `icons-v3.png` rimane esclusivamente per gli import legacy.

## Bilanciamento

Box da 40 px; SVG contenitore da 34 px. Sagome allineate su una base comune a circa 6,4 px dal bordo inferiore del box. Scala e luminosità sono calibrate individualmente: le forme aperte ricevono più spazio delle forme piene. Il centraggio orizzontale combina contorno effettivo e massa luminosa. Le misure sono documentate in `navigation/assets/icon-metrics.json`.

Il glow usa un gradiente radiale dal basso e un nucleo con blur 5 px. Entrambi sono ritagliati dal box con `overflow:hidden` e raggio 10 px: la luce rimane completamente all’interno. Nessun punto bianco netto o outline ambra. Inattive monocromatiche; hover al 25% del colore.

Blur e bridge restano invariati. La fascia da 320 px continua su tutti i breakpoint, con margini minimi laterali da 20 px.

La V12 non rigenera né modifica i file delle immagini: riduce proporzionalmente i simboli e conserva la calibrazione ottica V11. Il margine inferiore della navbar è metà dello spazio libero tra due box.
