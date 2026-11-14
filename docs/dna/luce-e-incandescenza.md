# Luce e incandescenza

La luce segue tre regole:

- dove c'è materia, la luce sta sugli spigoli;
- dove c'è energia, la luce sta sul contorno;
- il bloom esiste solo dove c'è energia.

## Luce del bordo (card)

- Il contorno di una card è diviso in **96 segmenti**. Ognuno si accende quando una cella vicina al bordo è accesa, quando il cursore è vicino a quel lato o quando una scheggia lo attraversa.
- Ogni segmento decade da solo: il bordo si accende **per tratti**, non tutto insieme.
- Saturazione: rampa ambra al 50–86%.

## Incandescenza dei testi

*Il contorno resta nitido. La materia reagisce.*

- Quando un titolo si scalda, l'overlay prende la sua quota del testo con la **stessa copertura** del glifo, e il passaggio base cede esattamente quella quota: il bordo antialias resta intatto e nulla dietro viene cancellato (niente alone scuro). Bordo interno e bagliore sono solo luce aggiunta, senza copertura.

- Ogni titolo ha un **campo di distanza** dei suoi glifi, calcolato una volta per layout. Da lì nascono due luci che seguono la sagoma esatta di ogni lettera:
  - **bordo interno:** una linea luminosa appena dentro il contorno, larga circa 0,02 em, solo dove c'è energia (range);
  - **bagliore esterno:** ambra caldo, largo circa 0,045 em, che si spegne entro 0,16 em. In base attiva è appena percettibile, nel range sale; un bloom leggero dà brillantezza alle lettere raggiunte, senza aloni larghi.
- Mai copie sfalsate della lettera, mai aloni a gradini, mai glow che cambiano la sagoma.

## Bloom

- Il bloom è **selettivo**: viene renderizzato solo ciò che emette energia.
- È a metà risoluzione, con due passate di sfocatura separabile (la seconda larga il doppio), così non fa gradini. Intensità 0,95: regia cinematografica, la brillantezza si dosa.
- Dallo stesso bloom nasce una **striatura orizzontale** (anamorfica), calda e bassa (0,2): solo dove c'è energia.
- Se non c'è energia nella scena, il bloom non viene calcolato.
- Nel profilo `low` è spento.

## Esposizione

- Nessuna superficie supera il bianco dei titoli. Il corpo della grafite resta quasi nero; i riflessi forti hanno una spalla morbida e non diventano mai bianco piatto.
- Il frame si compone in alta precisione (half float, multisample) e si quantizza una volta sola, nel grade finale, con il dithering: niente bande nei neri. La pagina è nero vero (`#000`): vedi `sfondo.md` per le bande della navigazione.

## Il grade finale

Una sola passata dal frame allo schermo, calibrata perché nessun effetto si noti da solo:

| Effetto | Valore | Regola |
| --- | --- | --- |
| Spalla delle luci | sopra 0,84 | le luci forti rollano invece di bruciare; sotto la spalla i colori (testi compresi) restano esatti |
| Bloom e striatura | 0,95 e 0,2 | solo con energia in scena |
| Vignettatura | 26% agli angoli | scurisce solo, mai il centro |
| Grana | 1,6% | finissima, nulla sul nero puro, 24 passi al secondo; ferma con reduced motion |
| Aberrazione cromatica | 1,4 px agli angoli | solo verso il bordo dello schermo, zero al centro |
| Dithering | ±0,5/255 | sempre, per ultimo |
