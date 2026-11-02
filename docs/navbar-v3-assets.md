# Asset Memento Overlay V3

## Wordmark

Fonte: `DEV_20_Typo(5).svg`, fornito dall'utente. Il componente usa le geometrie vettoriali originali. È stato rimosso il gruppo di sfondo; il viewBox è stato ristretto alla tipografia: `113.39 113.39 1417.32 56.70`. Nessuna lettera è stata ricostruita con un font.

## Icone

Fonte visiva: `Memento Futuristic Navigation Icon Board(2).png`, fornita dall'utente. Il file `navigation/assets/icons-v3.png` è un'estrazione su alpha realizzata con lo strumento integrato di generazione immagini. Non è un export dei modelli 3D originali.

Un solo foglio trasparente 2172 × 724 contiene i cinque simboli. I viewBox SVG del componente inquadrano le singole icone senza deformarle. Il bianco e nero, il ritorno al colore e il glow sono stati CSS; non ci sono due serie di bitmap da caricare. Il foglio originale generato è incluso senza ricampionamento.

Prompt finale usato, modalità built-in / background-extraction:

> Extract all five existing metallic sculptural icons faithfully from the board, remove the entire black backdrop and all text. Preserve the Memento monogram, interlocking Services rings, Projects folder, LevelUp plus and Start sparkle with smaller upper-right sparkle. Keep shapes, proportions, metal facets and amber seams. Five icons in one horizontal row, same order, similarly scaled, each in its own equal-width column. Actual transparent alpha including holes, no tiles, squares, ground shadows, borders or labels.

`brand.mjs` è mantenuto dalla V2 per compatibilità con eventuali import esistenti. Il nuovo overlay non lo usa per il wordmark né per le icone raster.
