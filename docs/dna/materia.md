# Materia

La materia di Memento è un unico foglio di **grafite cristallina**: triangoli irregolari, facce opache, spigoli che catturano la luce. È la stessa ovunque. Cambiano solo la scala e quanta ne vediamo.

## La cella

- **Topologia:** triangolazione di Delaunay su punti irregolari, la cui densità segue un rumore lento. Celle vicine hanno misure diverse: mai un reticolo regolare, mai esagoni o quadrati.
- **Superficie:** faccia piatta grafite (`grafite`) con un riflesso ampio e, su alcune facce, uno lucido e stretto. La luce scorre dalla cresta più luminosa verso l'interno della faccia.
- **Spigolo:** linea sottile che si accende solo dove la luce la colpisce (`cresta`). Le valli restano scure.

## Le scale

| Dove | Misura della cella | Regola |
| --- | --- | --- |
| Sfondo, primo piano (al bordo dello schermo) | ~21% dell'altezza del viewport (72–320 px) | la parete è vicina e guarda chi legge |
| Sfondo, profondità | scende con la distanza, mai sotto 9 px | la misura dice la distanza |
| Card (topologia in hover) | 15 px sul contorno, ~62 px al centro | più fitta verso i bordi |
| Struttura dello scroll | ~21 px, misure miste | uguale per tutte le superfici |
| Glifi (reazione) | 0,2 em | porta la reazione lungo la frase |
| Glifi (micro-faccette) | 0,075–0,095 em | si accendono solo nel range |
| Mappa | 26 px vicino allo studio, ~118 px ai bordi | la densità indica il centro |

## Lo sfondo: un piano inarcato e immobile

- È un foglio 3D inarcato con l'asse verticale parallelo allo schermo. Al bordo è vicino e frontale, verso il centro gira e si allontana fino a 20 volte la distanza iniziale.
- È **immobile**: si muovono solo luce ed energia.
- La luce dipende solo dalla posizione orizzontale, quindi si leggono **fasce verticali**. Il gradiente parte pieno dal bordo dello schermo, attraversa il padding laterale e arriva al buio dietro la colonna dei contenuti (la luminanza scende al 16%).
- In profondità il foglio è visto di taglio. Lì riflessi e spigoli si spengono e resta solo grafite calma: dietro il testo non deve esserci texture.
- **Luci:** una vicina a chi guarda solleva il primo piano; due dentro il tunnel radono le pareti. L'intensità cala con la distanza: vicino è chiaro, lontano è scuro.

## Le card

- Pannello nero al 94%, angoli tagliati (`taglio-card`), cornice sottile con sfumatura.
- La rete di celle esiste anche a riposo ma **non si vede**. Compare solo come topologia in hover (vedi `energia.md`).
- Le card grandi (pannelli FAQ, legal, mappa) hanno una topologia più rada, in proporzione all'area.

## Cosa non fare

- Non mettere texture o rumore fotografico al posto delle celle.
- Non far muovere il foglio dello sfondo (niente onde, niente parallasse della geometria).
- Non usare celle della stessa misura su tutto lo schermo: perde la scala.
