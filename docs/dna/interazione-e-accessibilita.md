# Interazione e accessibilità

## Gesti

| Gesto | Risposta |
| --- | --- |
| **Puntatore in movimento** | sulle superfici: reazione a catena nel range (raggio 230 px); le card vicine svegliano le celle sul lato rivolto al cursore. Sullo sfondo: una scia proporzionale alla velocità, più leggera e sfocata dietro la colonna dei contenuti. |
| **Puntatore fermo** | il range resta ancorato al puntatore. Sullo sfondo: impulso, eco, silenzio. |
| **Ingresso su una superficie** | una piccola raffica di celle (5) nel punto d'ingresso, più la sorgente se c'è |
| **Vicinanza** | le superfici vicine rispondono al 25%, dal lato più vicino |
| **Touch** | raggio 110 px; il tocco è un impulso; nessuno stato di hover persistente |
| **Tastiera** | un breve impulso dove arriva il focus (`:focus-visible`); l'anello di focus resta del DOM, sempre visibile |
| **Apertura FAQ** | un impulso dall'immagine del pannello |

## Il DOM è la fonte di verità

- Layout, semantica, link, focus e click restano nel DOM. L'engine disegna le superfici registrate solo quando texture, font e misure sono pronti (`html.vfx-live`). Prima la pagina è DOM puro e già completa.
- Qualsiasi errore, la perdita del contesto WebGL o un browser senza WebGL riportano alla pagina DOM.

## Reduced motion

- Niente deriva, niente propagazione della catena, niente respiri.
- Gli hover restano, attenuati al 60%.
- Le fasce dello scroll non frammentano.
- Il caricamento è immediato: la pagina appare composta.
- La grana della pellicola è ferma.

## Profili di qualità

| Profilo | Risoluzione massima | Bloom | Particelle | Celle |
| --- | --- | --- | --- | --- |
| `high` | 2× | sì | 100% | ×1 |
| `medium` (touch) | 1,5× | sì | 60% | ×1,25 |
| `low` (renderer software, frame lenti) | 1× | no | 35% | ×1,6 |

- Il profilo scende da solo quando i frame superano 30 ms.
- `?vfx=high|medium|low` nell'URL blocca un profilo per i confronti.
- Misura reale: RTX 3070 Ti, 240 fps fissi a 1920×1080 e 3440×1440 in tutti gli stati.
