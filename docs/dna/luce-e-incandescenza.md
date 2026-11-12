# Luce e incandescenza

La luce segue tre regole:

- dove c'è materia, la luce sta sugli spigoli;
- dove c'è energia, la luce sta sul contorno;
- il bloom esiste solo dove c'è energia.

## Luce del bordo (card)

- Il contorno di una card è diviso in **96 segmenti**. Ognuno si accende quando una cella vicina al bordo è accesa, quando il cursore è vicino a quel lato o quando una scheggia lo attraversa.
- Ogni segmento decade da solo: il bordo si accende **per tratti**, non tutto insieme.
- Saturazione uguale a quella degli spigoli dello sfondo (rampa ambra al 50–86%).

## Incandescenza dei testi

*Il contorno resta nitido. La materia reagisce.*

- Ogni titolo ha un **campo di distanza** dei suoi glifi, calcolato una volta per layout. Da lì nascono due luci che seguono la sagoma esatta di ogni lettera:
  - **bordo interno:** una linea luminosa appena dentro il contorno, larga circa 0,02 em, solo dove c'è energia (range);
  - **bagliore esterno:** leggero, largo circa 0,04 em, che si spegne entro 0,16 em. In base attiva è appena percettibile, nel range sale.
- Mai copie sfalsate della lettera, mai aloni a gradini, mai glow che cambiano la sagoma.

## Bloom

- Il bloom è **selettivo**: viene renderizzato solo ciò che emette energia.
- È a metà risoluzione, con due passate di sfocatura separabile (la seconda larga il doppio), così non fa gradini.
- Se non c'è energia nella scena, il bloom non viene calcolato.
- Nel profilo `low` è spento.

## Esposizione

- Le pareti dello sfondo non superano mai il bianco dei titoli.
- I gradienti scuri sono sempre con dithering, per non avere bande sugli schermi a 8 bit.
