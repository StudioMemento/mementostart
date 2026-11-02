# Asset Memento Overlay 6.0

## Wordmark

Fonte: `DEV_20_Typo(5).svg`, fornito dall'utente. Il componente usa le geometrie vettoriali originali, senza sfondo. Nella V4 ogni glifo ha una trasformazione uniforme `scale(0.5)`, con centri redistribuiti per mantenere la larghezza totale. Il viewBox diventa `113.39 113.39 1417.32 28.35`. Nessuna lettera è stata ricostruita con un font o schiacciata solo in verticale.

## Maschere del blur

`progressive-blur.mjs` genera due maschere CSS alpha native con dissolvenza smoothstep, una per bordo. Ogni bordo ha un solo `backdrop-filter`, senza scrim colorato. Il raggio è 42 px desktop, 34 px mobile o 28 px nel landscape basso. Le vecchie maschere SVG e i sedici livelli della V5 non sono usati. Il nuovo effetto è scritto in CSS/JavaScript; non impiega immagini generate.

## Icone

Fonte visiva: `Memento Futuristic Navigation Icon Board(2).png`, fornita dall'utente. Il file `navigation/assets/icons-v3.png` è un'estrazione su alpha realizzata con lo strumento integrato di generazione immagini. Non è un export dei modelli 3D originali.

Un solo foglio trasparente 2172 × 724 contiene i cinque simboli. I viewBox SVG del componente inquadrano le singole icone senza deformarle. Il bianco e nero, il ritorno al colore e il glow sono stati CSS; non ci sono due serie di bitmap da caricare. Il foglio originale generato è incluso senza ricampionamento.

Prompt finale usato, modalità built-in / background-extraction:

> Extract all five existing metallic sculptural icons faithfully from the board, remove the entire black backdrop and all text. Preserve the Memento monogram, interlocking Services rings, Projects folder, LevelUp plus and Start sparkle with smaller upper-right sparkle. Keep shapes, proportions, metal facets and amber seams. Five icons in one horizontal row, same order, similarly scaled, each in its own equal-width column. Actual transparent alpha including holes, no tiles, squares, ground shadows, borders or labels.

`brand.mjs` è mantenuto dalla V2 per compatibilità con eventuali import esistenti. Il nuovo overlay non lo usa per il wordmark né per le icone raster.
