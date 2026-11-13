# Struttura e scroll

*La posizione conserva i frammenti. L'energia si esaurisce.*

## Le fasce

- Il viewport ha tre fasce: **15% uscita** in alto, **70% lettura** al centro, **15% ingresso** in basso.
- Nella fascia di lettura tutto è composto e fermo.
- Nelle fasce di bordo le superfici si separano in celle. Più ci si avvicina al bordo, più celle mancano o si spostano.
- La frammentazione dipende **solo dalla posizione**: tornando indietro la struttura si ricompone esattamente.
- È **monocromatica**: niente ambra, niente accensioni durante lo scroll.

## Quando lo scroll si ferma

Dopo 0,12 s di quiete le celle destinate a sparire diventano particelle. Si allontanano lungo un campo di curl noise e svaniscono in circa 1,6 s. Riprendendo lo scroll tornano dalla posizione.

## Prima e ultima schermata

- **Prima schermata.** La fascia d'ingresso è attiva da subito: la sezione successiva arriva già frammentata. Il layout la fa partire esattamente al confine della fascia, così entra solo la parte alta delle card (cornici, immagini) e i loro testi restano sotto la piega. Il titolo sta al centro della fascia di lettura.
- **Ultima schermata.** La fascia d'uscita resta attiva anche alla fine: ciò che è stato lascia la scena dall'alto, ed è voluto. La chiusura sta al centro della fascia di lettura; la fascia in basso resta aria.
- **Tra le sezioni.** Ogni sezione si apre con almeno una fascia d'aria (15% del viewport): un titolo non nasce mai a metà di una fascia.

CSS di riferimento: la variabile `--vfx-band` vale 15svh e va tenuta uguale a `VFX.scroll.band`.

## Caricamento: dal nero alla materia

Sei fasi, con lo stesso ordine su ogni pagina:

| Fase | Cosa succede |
| --- | --- |
| 01 nero | schermo nero |
| 02 scia | una scia di punti caldi attraversa il nero |
| 03 reticolo | compare la rete di celle |
| 04 reveal | le facce si riempiono di grafite |
| 05 assestamento | il contenuto prende il suo posto |
| 06 pronto | il primo frame è perfetto |

- Il nero c'è dal primo istante (`#020202` già nel primo paint, prima di CSS e WebGL): nessun lampo grigio. Il frame del caricamento passa dallo stesso grade finale, con dithering: niente righe né giunzioni nei neri.
- Durata: **1,8 s**. Se l'utente interagisce prima, il caricamento accelera di 3,2 volte.
- Il 14% delle celle si accende mentre entra.
- Ogni cella entra con un ritardo dato da un rumore: il contenuto si costruisce, non appare.
