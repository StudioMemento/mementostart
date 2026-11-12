# Materia

La materia di Memento è un unico foglio di **grafite cristallina**: triangoli irregolari, facce opache, spigoli che catturano la luce. È la stessa ovunque. Cambiano solo la scala e quanta ne vediamo.

## La cella

- **Topologia:** triangolazione di Delaunay su punti irregolari, la cui densità segue un rumore lento. Celle vicine hanno misure diverse ma entro una banda stretta: ogni livello ha una sua scala riconoscibile e la differenza tra un livello e l'altro è proporzionata, così l'insieme si legge come il wireframe di una struttura vista in prospettiva. Mai un reticolo regolare, mai esagoni o quadrati.
- **Superficie:** faccia piatta grafite (`grafite`) con un riflesso ampio e, su alcune facce, uno lucido e stretto. La luce scorre dalla cresta più luminosa verso l'interno della faccia.
- **Spigolo:** linea sottile che si accende solo dove la luce la colpisce (`cresta`). Le valli restano scure.

## Le scale

| Dove | Misura della cella | Regola |
| --- | --- | --- |
| Sfondo, primo piano (al bordo dello schermo) | ~26% dell'altezza del viewport (96–470 px), allungata in verticale (×1,55) | schegge alte e vicine |
| Sfondo, profondità | scende con la distanza da 3 a 12 volte, mai sotto 24 px | la misura dice la distanza, senza polvere |
| Card (topologia in hover) | 15 px sul contorno, ~62 px al centro | più fitta verso i bordi |
| Struttura dello scroll | ~21 px, misure miste | uguale per tutte le superfici |
| Glifi (reazione) | 0,2 em | porta la reazione lungo la frase |
| Glifi (micro-faccette) | 0,075–0,095 em | si accendono solo nel range |

## Lo sfondo: un piano inarcato e immobile

- È un foglio 3D inarcato con l'asse verticale parallelo allo schermo. Al bordo è vicino e frontale, verso il centro gira e si allontana fino a 20 volte la distanza iniziale.
- È **immobile**: si muovono solo luce ed energia.
- È **scuro**: corpo quasi nero, luce solo su poche creste nette del primo piano e su qualche faccia lucida. Le altre facce si leggono appena.
- La luce dipende solo dalla posizione orizzontale, quindi si leggono **fasce verticali**. Il gradiente parte dal bordo dello schermo, attraversa il padding laterale e tocca il punto più scuro sul bordo della colonna dei contenuti (3,5% della luminanza del bordo).
- Dal bordo della colonna verso il centro il foglio **va fuori fuoco** con gradualità (profondità di campo). Dietro i contenuti restano celle piccole e appena visibili, sfocate: struttura percepita, mai texture che compete con il testo.
- **Luci:** una vicina a chi guarda solleva il primo piano; due dentro il tunnel radono le pareti. L'intensità cala con la distanza: vicino è chiaro, lontano è scuro.

## Le card

- Pannello nero al 94%, angoli tagliati (`taglio-card`), cornice sottile con sfumatura.
- La rete di celle esiste anche a riposo ma **non si vede**. Compare solo come topologia in hover (vedi `energia.md`).
- Le card grandi (pannelli FAQ, legal, mappa) hanno una topologia più rada, in proporzione all'area.

## Cosa non fare

- Non mettere texture o rumore fotografico al posto delle celle.
- Non far muovere il foglio dello sfondo (niente onde, niente parallasse della geometria).
- Non usare celle della stessa misura su tutto lo schermo: perde la scala.
