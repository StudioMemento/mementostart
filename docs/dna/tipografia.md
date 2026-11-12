# Tipografia

Un solo carattere, **Inter**. I titoli sono grandi e leggeri (peso 330–350), si adattano alla larghezza della colonna (circa 19% della sua larghezza) e hanno l'interlinea stretta (0,9), così che un solo gradiente copra tutto il blocco.

## Stati di un titolo

| Stato | Aspetto |
| --- | --- |
| **Quiete** | gradiente grigio dal basso verso l'alto su tutto il blocco: `testo-ombra` alla base, `testo-medio` a un terzo, `testo-luce` in alto. Simula una luce dall'alto. |
| **Base attiva** (cursore sul titolo) | tutto il blocco si scalda: in alto `caldo-luce`, alla base `caldo-base`, con un respiro lento di ±6% |
| **Range** | nelle celle raggiunte l'ambra piena sale dalla base; la parte alta resta chiara e luminosa; micro-faccette accese dentro i glifi; bordo interno luminoso; bagliore esterno |
| **Ritorno** | le celle si spengono una a una in circa 1,1 s; la base attiva esce in circa 0,6 s |

## Regole

- La sagoma non cambia mai: niente scale, distorsioni o tracciamenti animati.
- L'ambra sale **dal basso verso l'alto**, nella stessa direzione dell'ombra di quiete.
- Il range segue la frase. Non è un cerchio attorno al cursore.
- Testi piccoli (card, etichette, mappa): bianco con gradiente grigio per riga a riposo, gradiente ambra in hover. Niente micro-faccette sotto i 32 px.
- Un numero di telefono, un indirizzo email o un orario non vanno mai a capo.

## Scala

| Nome | Uso | Misura sulla colonna da 1280 px |
| --- | --- | --- |
| `display` | titoli hero e sezioni | ~243 px, interlinea 0,9 |
| `titolo-card` | email e canali | 21–26 px |
| `testo` | paragrafi, FAQ | 16 px |
| `etichetta` | mappa, didascalie | 11–15 px |
