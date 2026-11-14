# Sfondo — nessuno (V23)

Dalla V23 la START **non ha uno sfondo**. Il mondo d'ossidiana della V22 (plate pre-renderizzati, profondità di campo, glow delle fessure, puntini, reazione dello sfondo) è stato rimosso del tutto, codice e asset compresi.

- La pagina è **nero vero** (`#000`): nel primo paint, nel CSS e nel frame WebGL, che parte trasparente sopra il nero della pagina.
- **Perché nero vero e non quasi nero.** La sfocatura progressiva della navigazione condivisa (8 livelli di `backdrop-filter` mascherati in alto e in basso, 20% del viewport) arrotonda di un livello a ogni gradino della maschera: su un nero uniforme non nullo (`#020202`, ma anche `#0b0b0b`) compaiono righe orizzontali ogni ~17 px, visibili soprattutto durante il caricamento, quando la pagina è tutta nera. Lo zero non può scendere: con `#000` le righe spariscono (verificato in Chrome: 464 righe → 0).
- Anche i pannelli delle card sono nero vero (`VFX.color.panel`), per lo stesso motivo.
- Quello che resta degli effetti vive sulle superfici: titoli, card, mappa, scroll, caricamento, particelle, bloom, grade.
