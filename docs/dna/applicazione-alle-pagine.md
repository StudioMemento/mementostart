# Applicazione alle pagine

Ogni pagina usa **lo stesso engine, le stesse costanti e la stessa materia**. Da una pagina all'altra cambiano solo la **scena** (come è piegato il foglio di grafite) e le **sorgenti** (dove nasce l'energia). Se una pagina ha bisogno di un comportamento nuovo, prima si aggiunge qui, con la sua ragione, poi si scrive il codice.

## Cosa resta identico ovunque

- Palette, scala delle celle, reazione a catena, tre livelli di saturazione, luce del bordo, incandescenza dei testi.
- Fasce 15/70/15, caricamento in sei fasi, deriva allo stop.
- Lo sfondo è lo stesso mondo d'ossidiana (`sfondo.md`): cambiano inquadratura e fuoco di riposo, il centro dietro i contenuti resta il più scuro.
- Prima e ultima schermata composte secondo `struttura-e-scroll.md`.

## Cosa può cambiare: la scena

Il foglio di grafite si può piegare in modi diversi. Le tavole ne esplorano diversi: membrana, dune di carbone, incisioni, pieghe geodetiche, superficie a sella, scaglie, riflesso radente. Ogni pagina ne sceglie **uno**, con la stessa materia e la stessa luce.

| Pagina | Scena proposta | Sorgente proposta | Perché |
| --- | --- | --- | --- |
| **START** (fatta, V22) | la conca d'ossidiana: lastre ai bordi, fondo lontano al centro | lo studio sulla mappa | invita a entrare; il centro è per il contatto |
| **Servizi** | pieghe geodetiche o superficie a sella: il foglio si piega dietro la griglia dei servizi | la card del servizio in hover | i servizi come facce dello stesso solido |
| **Portfolio** | scaglie sospese ai margini, più rade, perché i lavori sono immagini piene | il progetto aperto | la materia incornicia, non compete con le immagini |
| **Levelup** | portale: il foglio si apre in una soglia luminosa al centro | la soglia | è un passaggio di livello |
| **Navigation** | la stessa conca della START, inquadrata più in profondità | nessuna: solo luce sugli spigoli al passaggio | è il corridoio tra le pagine |

Queste scelte sono proposte. Il criterio per scegliere è che la forma della scena dica cosa fa la pagina.

## Come si fa una pagina nuova

1. Si parte dal progetto START (stessa cartella `src/vfx/`).
2. Si registrano le superfici: `useSurface('title')` per i titoli, `useSurface('card', opzioni)` per card e pannelli (vedi `codice.md`).
3. Si sceglie la scena: una nuova funzione di geometria accanto a `buildArch`, con gli stessi attributi per vertice (normale, cresta, energia).
4. Si definiscono le sorgenti, se servono, con l'opzione `source` della superficie.
5. Si verifica la checklist in `codice.md`.

## Continuità tra le pagine

Quando il sito passerà da Framer a Vercel diretto, il cambio pagina potrà diventare un movimento di camera dentro lo stesso spazio. È una proposta, non ancora implementata.
