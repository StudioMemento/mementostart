# Movimento

Un solo tempo per tutto il sito. Le animazioni nascono dalla materia e dall'energia, non da transizioni CSS generiche.

## Curve

- **Entrate:** expo-out `cubic-bezier(.22, 1, .36, 1)` (token CSS `--ease`).
- **Respiri:** sinusoidi lente, mai sotto i 6 s di periodo, ampiezza ≤ 6%.
- **Decadimenti:** esponenziali. Ogni cella ha il suo tempo, così il ritorno non è mai sincrono.

## Tempi

| Elemento | Entra | Esce / decade | Note |
| --- | --- | --- | --- |
| Cella: ritardo verso la vicina | 0,10–0,32 s | | dipende dalla superficie |
| Cella: salita | 0,16–0,24 s | 0,9–2,2 s | riposo 0,8–2 s |
| Range dei testi | 0,45 s | 1,1 s | per cella |
| Base attiva dei titoli | 0,35 s | ~0,6 s | |
| Hover delle card | 0,12 s | ~0,3 s | |
| Impulso a cursore fermo | dopo 0,25 s | | eco a 2,6 s, poi niente |
| Sorgente (mappa) | ogni 1,6 s | | solo in hover |
| Deriva allo stop dello scroll | dopo 0,12 s | 1,6 s | curl noise |
| Caricamento | 1,8 s | | ×3,2 se l'utente interagisce |
| Particelle (schegge) | | 0,9–1,5 s | 45–125 px/s |

## Regole

- Niente loop decorativi infiniti: tutto ciò che si muove ha una causa (gesto, posizione, caricamento, sorgente) e una fine. A riposo nulla si muove: né luci, né riflessi, né camera. L'unica eccezione è la grana della pellicola, sotto la soglia del movimento.
- Il foglio dello sfondo non si muove mai: si muovono luce ed energia.
- Ogni movimento ha la sua versione per reduced motion (vedi `interazione-e-accessibilita.md`).
