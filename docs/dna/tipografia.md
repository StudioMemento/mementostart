# Tipografia

Un solo carattere, **Inter**. I titoli sono grandi e leggeri (peso 330–350), si adattano alla larghezza della colonna (circa 19% della sua larghezza) e hanno l'interlinea stretta (0,9), così che un solo gradiente copra tutto il blocco.

## Stati di un titolo

| Stato | Aspetto |
| --- | --- |
| **Quiete** | il gradiente ambra **desaturato** (stessa luminanza, nessuna tinta) su tutto il blocco: la prima riga resta bianca piena, l'ombra vive solo nella parte bassa dell'ultima riga e arriva al grigio medio sulla linea di base. Simula una luce dall'alto. |
| **Base attiva** (cursore sul titolo) | lo stesso gradiente con la sua tinta: bianco caldo in alto, pesca e arancio nella parte bassa dell'ultima riga (`VFX.color.titleAmber`), con un respiro lento di ±4%. Dentro le lettere, su tutto il blocco, un **reticolo dorato** di micro-faccette; attorno, un bagliore ambra leggero. |
| **Range** | nelle celle raggiunte sale dalla base un giallo caldo (mai acido), più chiaro in alto e più profondo in basso; il reticolo si fa più fitto e più acceso; bordo interno caldo; glow ambra esterno e un bloom leggero |
| **Ritorno** | tutto il blocco **si desatura** verso il gradiente di quiete in un solo movimento (circa 0,6–1 s): base, range e reticolo insieme. Mai cella per cella, mai un overlay che sparisce lasciando vedere i tagli. |

## Regole

- La sagoma e il peso non cambiano mai: niente scale, distorsioni o tracciamenti animati, e la luce sostituisce il colore del testo invece di sommarsi (il font non diventa mai più spesso).
- L'ambra sale **dal basso verso l'alto**, nella stessa direzione dell'ombra di quiete.
- Il range segue la frase. Non è un cerchio attorno al cursore.
- Testi piccoli (card, etichette, mappa): **un solo colore**, mai sfumature di grigio. Vicino al cursore prendono una tinta ambra chiara e molto diffusa. Niente micro-faccette sotto i 32 px.
- Un numero di telefono, un indirizzo email o un orario non vanno mai a capo.

## Scala

| Nome | Uso | Misura sulla colonna da 1280 px |
| --- | --- | --- |
| `display` | titoli hero e sezioni | ~243 px, interlinea 0,9 |
| `titolo-card` | email e canali | 21–26 px |
| `testo` | paragrafi, FAQ | 16 px |
| `etichetta` | mappa, didascalie | 11–15 px |
