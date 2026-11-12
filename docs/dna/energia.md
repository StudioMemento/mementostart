# Energia

L'energia è **ambra intensa, tendente all'arancio** e si comporta sempre allo stesso modo: una **reazione a catena** nelle celle. Nasce da un gesto, si propaga ai vicini con un ritardo, si spegne. Non è mai uno spot di luce.

## La reazione a catena

- Una cella accesa può accendere le vicine dopo 0,10–0,32 s. Succede con una probabilità che dipende dalla **zona** (un rumore lento: zone che conducono e zone dove l'energia muore).
- Dopo essersi accesa, una cella **riposa** (0,8–2 s) e si spegne con un suo tempo (0,9–2,2 s).
- Le **generazioni sono limitate** (6–9): ogni reazione ha una fine. Mai lampeggi continui.
- Il risultato si legge come materia che si sveglia a zone, alcune sì e altre no.

## I tre livelli: saturazione, non opacità

| Livello | Quando | Cosa si vede |
| --- | --- | --- |
| **Quiete, 0%** | a riposo | grafite e bianco caldo, nessuna ambra; le immagini sono in bianco e nero |
| **Base attiva** | il puntatore è sulla superficie | i titoli passano dal gradiente desaturato al loro gradiente ambra (bianco caldo in alto, arancio alla base); le immagini si colorano |
| **Range** | le celle che il range raggiunge e la reazione che parte da lì | giallo caldo (mai acido) con accenti arancio delle micro-faccette, reticolato chiaro, glow caldo e un bloom leggero sul contorno |

## Il range non è un disco

- Il range accende **celle**, non pixel. Ogni cella ha la sua portata (±30%), quindi il bordo del range è fatto di triangoli.
- Sui testi è **allungato lungo la frase**: largo in orizzontale, corto in altezza.
- Entra in circa 0,45 s ed esce in circa 1,1 s. Quando il cursore si sposta, le celle già accese si spengono piano.
- Attorno, la reazione a catena aggiunge accenti irregolari.

## Fermo non significa assente

Sullo sfondo, a cursore fermo:

1. dopo 0,25 s parte un impulso (4 celle);
2. a 2,6 s arriva un'eco più leggera (2 celle);
3. poi silenzio.

Mentre il cursore si muove, lascia una scia proporzionale alla velocità. La reazione non si ferma al bordo della colonna: dietro i contenuti continua con metà delle accensioni e meno luce, fuori fuoco come lo sfondo. Sopra una card il puntatore appartiene alla card.

## Sorgenti

Una superficie può avere una **sorgente**: un punto da cui l'energia parte da sola durante l'hover. Sulla mappa la sorgente è lo studio: un impulso ogni 1,6 s attraversa le celle della città. Una sorgente si usa solo quando ha un significato (dove siamo, cosa è attivo), mai come decorazione.

## Budget d'ambra

- A riposo: **0%** dello schermo.
- Durante un gesto: l'ambra piena (range) occupa al massimo una piccola parte dello schermo. La base attiva può scaldare tutta la superficie sotto il gesto, ma con saturazione contenuta.
- Una faccia grande e vicina non si riempie mai d'ambra: l'energia corre sui suoi spigoli e la scalda appena.
- Dietro la colonna dei contenuti l'energia dello sfondo è ridotta al 45% ed è sfocata.
- Le superfici grandi (oltre ~230.000 px²) hanno una topologia d'hover proporzionalmente più rada.

## Card e un campo condiviso

- **Un solo insieme di celle**: ogni cella ha la sua visibilità (forte, debole, appena percettibile, invisibile) e una sua saturazione, più dense verso il contorno. Il puntatore le sveglia dove si trova; la reazione a catena passa per le stesse celle e le accende con lo stesso materiale. Mai uno strato fermo e uno che si muove.
- Le card vicine al cursore (il **campo condiviso**) accendono la luce del bordo per segmenti dal lato più vicino, svegliano le celle interne sul lato rivolto al cursore e scaldano appena l'immagine.
- Testi e icone delle card hanno **un solo colore** e lo stesso peso in ogni stato: vicino al cursore prendono una tinta ambra chiara e molto diffusa.
