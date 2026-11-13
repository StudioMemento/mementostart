# Materia

La materia di Memento è un unico foglio di **ossidiana**: blocchi sfaccettati di vetro nero con una grana di grafite, spigoli lucidi, riflessi netti. È molto scura: la forma si legge dai riflessi e dagli spigoli, non da superfici grigie. È la stessa ovunque. Cambiano solo la scala e quanta ne vediamo.

## La cella

- **Topologia:** triangolazione di Delaunay su punti irregolari, la cui densità segue un rumore lento. Celle vicine hanno misure diverse ma entro una banda stretta: ogni livello ha una sua scala riconoscibile e la differenza tra un livello e l'altro è proporzionata, così l'insieme si legge come il wireframe di una struttura vista in prospettiva. Mai un reticolo regolare, mai esagoni o quadrati.
- **Superficie:** vetro nero (ossidiana) con una grana fine di grafite. Ogni faccia è lucida, alcune sono specchi. Riflette uno studio fermo e simmetrico: un softbox lungo in alto, due strip sottili attraverso il tunnel (linee nette che scorrono sulle facce e ne disegnano il gradiente interno) e la luce in fondo al tunnel. Il riflesso cresce verso gli angoli radenti (Fresnel). Una luce morbida dall'alto modella ogni blocco: creste chiare, lati in basso scuri, come i titoli.
- **Spigolo:** filo di vetro sottile che si accende solo dove prende un riflesso o la luce (`cresta`). Le fessure restano scure.

## Le scale

| Dove | Misura della cella | Regola |
| --- | --- | --- |
| Sfondo, primo piano (al bordo dello schermo) | ~26% dell'altezza del viewport (96–470 px), allungata in verticale (×1,55) | schegge alte e vicine |
| Sfondo, profondità | scende con la distanza da 3 a 12 volte, mai sotto 24 px | la misura dice la distanza, senza polvere |
| Card (topologia in hover) | 15 px sul contorno, ~62 px al centro | più fitta verso i bordi |
| Struttura dello scroll | ~21 px, misure miste | uguale per tutte le superfici |
| Glifi (reazione) | 0,2 em | porta la reazione lungo la frase |
| Glifi (micro-faccette) | 0,075–0,095 em | si accendono solo nel range |

## I blocchi: topologia 3D

- Il foglio non è liscio: è fatto di **blocchi d'ossidiana** larghi circa 2,3 celle, che escono dal foglio verso chi guarda. Tra un blocco e l'altro c'è una **fessura**.
- Ogni blocco ha la sua altezza e si inclina per conto suo, così le sue facce girano ad angoli diversi e prendono la luce una alla volta.
- Le fessure tengono il buio (occlusione): la luce arriva prima sulle creste. È anche da lì che sale l'energia (vedi `energia.md`).
- Oltre il bordo dello schermo i blocchi si appiattiscono, così le schegge al bordo non incombono sulla camera.

## Lo sfondo (V22)

Lo sfondo non è più un piano inarcato generato in tempo reale: è il **mondo d'ossidiana**, una conca di schegge renderizzata in Blender su tre piani e ricomposta con una profondità di campo vera. La materia è la stessa (vetro nero, spigoli lucidi, fessure); scala, luce, fuoco e movimento sono in `sfondo.md`.

## Le card

- Pannello **nero void, opaco** (`pannello`), angoli tagliati (`taglio-card`), cornice sottile con sfumatura. Dietro una card non traspare nulla, quindi non si vede mai dove finisce un'immagine.
- La rete di celle esiste anche a riposo ma **non si vede**. Compare solo come topologia in hover (vedi `energia.md`).
- Le card grandi (pannelli FAQ, legal, mappa) hanno una topologia più rada, in proporzione all'area.

## Cosa non fare

- Non mettere texture o rumore fotografico al posto delle celle.
- Non far muovere la materia a caso: lo sfondo si muove solo con lo scroll (dolly e parallasse per piano) e con il fuoco; a riposo respirano solo le fessure.
- Non schiarire il corpo delle facce per far leggere la forma: la forma la danno riflessi, spigoli e fessure.
- Non usare celle della stessa misura su tutto lo schermo: perde la scala.
