# START V12 — VFX Refined

Verifica del 7 novembre 2026. Revisione della V11 dopo audit nel deploy pubblico.

## Risultato

30 controlli nel browser superati, 0 falliti. Verifica visiva separata di hero in uscita, card attiva, FAQ, mappa al bordo superiore e viewport mobile 390×844. Controlli di preservazione, sintassi, geometria e pacchetto passati; build completata.

## Cambiamenti osservabili

- Reveal vicino ai margini: fronti 24–48 CSS px, banda di frammentazione ±18 px e variazione locale contenuta. Il centro della pagina resta completo. Il bordo superiore entra gradualmente nei primi 100 px di scroll.
- Hero e CTA: il paint appartiene alle righe su cui viene applicata la maschera. Il testo originale si frammenta realmente, oltre alla texture decorativa.
- Card e FAQ: rimosso il clip rettangolare attorno al copy; la trama continua con attenuazione morbida precomputata e un minimo non nullo. Rimane leggibile nel nucleo.
- Mappa: inclusa nella maschera del wrapper, conservando iframe e collegamenti originali. Il focus protegge l’elemento durante l’interazione.
- Rendering: topologia più sparsa senza doppia fascia perimetrale, cache della base neutra e delle texture, aggiornamento a richiesta. Nessun nuovo frame a riposo dopo l’esaurimento delle interazioni; risveglio da input, scroll, resize, font, focus e observer.
- Colore preservato: base attiva 80%, pass locale 100%; nessuna saturazione automatica della card vicina.

## Misure

| Misura | Risultato |
| --- | --- |
| Suite browser | 30/30 PASS |
| Frame durante 900 ms di riposo | 0 (69 prima, 69 dopo) |
| Energie dopo il rilascio | Pointer e mesh neutri |
| Maschera hero parziale nel browser | 3.205 byte |
| Maschera mappa parziale nel browser | 3.830 byte |
| Maschera FAQ nel caso browser | 5.366 byte |
| Peggior maschera nei casi geometrici automatici | 5.447 byte |
| Mesh card 520×260, seed 391 | 954 → 145 spigoli |
| Mesh FAQ 1012×640, seed 391 | 2.353 → 626 spigoli |
| Costo JS registrato nella sessione QA | media 5,63 ms; p95 16,10 ms; 125 campioni |

I campioni JS comprendono interazioni, ricostruzioni di layout e resize; non misurano tutta la rasterizzazione/composizione del browser. La cadenza del browser remoto è limitata e non rappresenta gli FPS del dispositivo. Non si dichiara una garanzia di 60 fps.

## Verifiche decisive

La suite controlla il paint sul livello mascherato, maschere parziali effettive, geometria identica all’inversione, zona di lettura piena, mappa mascherata, immagini, FAQ, focus, touch release/cancel, overflow mobile, fallback, riavvio e unicità del motore.

I test matematici parsano anche il path SVG composto: winding coerente e campionamento della zona piena impediscono la cancellazione tra rettangolo centrale e triangoli sovrapposti. L’area intermedia dei frammenti resta entro le celle originali.

Eseguire `npm run verify` e `npm run build`. La pagina `docs/verification/v12/browser-harness.html`, servita dal server di sviluppo, riproduce la suite e i cinque stati visivi. `browser-results.json` contiene i risultati osservati.

## Limiti e consegna

La verifica mobile usa una viewport e Pointer Events sintetici, non un telefono fisico. Reduced motion e forced colors mantengono il fallback CSS/JS; la suite verifica la disattivazione esplicita, non il cambio delle preferenze del sistema operativo.

Il deploy pubblico non viene aggiornato dalla consegna dello ZIP. Usare la struttura completa per Vercel; l’HTML autonomo è incluso per utilizzi separati. Contenuti, navbar, font e dodici immagini approvate sono preservati. Report V7–V11 conservati come storico.
