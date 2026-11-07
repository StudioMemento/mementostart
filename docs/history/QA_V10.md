# Verifica — Start V10 Lowpoly Amber

7 novembre 2026. Questo rapporto riguarda la versione V10 e sostituisce, per i controlli di sorgente, le dichiarazioni di preservazione della V9. I report e le tracce V9 eventualmente conservati sono storico.

## Risultato verificato

Eseguiti `npm run check` e `npm run verify` nel progetto integrato. Entrambi completati con codice di uscita zero.

| Controllo | Evidenza |
| --- | --- |
| Contenuti e composizione | Confronto esatto del `<main>` con la base, applicando esclusivamente dodici sostituzioni di `src` e la correzione della CTA ufficiale con `_top`. Restano verificati testi, ordine, classi, dimensioni delle immagini, contatti, struttura FAQ e markup mappa. |
| Regressioni del confronto | Il medesimo controllo rifiuta mutazioni di email, classe della griglia e larghezza immagine. |
| Font e navigazione | Hash della base verificati sui file conservati; le quattro sole modifiche di stile navbar per il monocromo sono invertite prima del confronto. Modifiche estranee o un bundle incoerente non passano. |
| Informative e CTA | Fixture Node che esegue gli event handler reali: URL vuoti, spazi, valori non stringa, HTTP, JavaScript e URL con credenziali attivano i pannelli locali. Un URL HTTPS configurato apre la destinazione prevista. Controllati apertura/chiusura/focus dei pannelli, contatti e CTA ufficiale `_top`. |
| Geometria VFX | Seed e triangolazione deterministici, edge unici, area del poligono, tagli, limiti di campo e displacement, propagazione nel grafo, curl con due versi e reversibilità. Il clipping V10 è confrontato con l’area analitica su quattro dimensioni di card, con controlli vuoto/pieno e reverse esatto. |
| Nuove immagini | Dodici file WebP effettivi, dimensioni lette dagli header binari e confrontate con manifest e markup. Payload complessivo: 304.092 byte. Nessun vecchio `src` è renderizzato da `index.html`. |
| Pacchetto | Riferimenti locali risolti, ID unici, riferimenti accessibili validi, sintassi JavaScript, un bootstrap VFX. Export V10 rigenerato e verificato con font e tutti i nuovi WebP incorporati, senza dipendenza da file locali. |

Le immagini sostituite sono escluse dai controlli hash dei file conservati perché sono una modifica esplicitamente richiesta. Il confronto del markup e i controlli binari sui nuovi asset ne verificano l’integrazione; una revisione visuale resta necessaria per giudicare la composizione fotografica.

## Verifiche browser V10

La fixture `qa.html` è stata eseguita sul browser di verifica, con iframe da 1280 × 900 e 390 × 844 px. Entrambe le esecuzioni finali hanno superato **14 controlli su 14**. Le tracce originali sono conservate in:

- `docs/verification/v10/desktop-v10-qa.json`
- `docs/verification/v10/mobile-v10-qa.json`

I controlli coprono assenza di overflow orizzontale, due canvas decorativi fissi, titoli neutri, caricamento delle immagini, esclusività del colore sulla card attiva e ritorno all’idle, un impulso touch e nessun impulso su cancel, apertura dei due pannelli informativi, esclusività e cambio delle FAQ, CTA ufficiale e reversibilità delle maschere effettivamente applicate ai target visibili.

Il confronto reverse attende due frame del renderer e confronta il medesimo layout e la stessa posizione di scroll; le geometrie in cache non applicate agli elementi fuori campo non costituiscono output visibile e sono escluse dal confronto. Il controllo delle FAQ è idempotente rispetto allo stato iniziale.

La revisione visuale del responsabile d’integrazione ha controllato titoli, colori, immagine attiva esclusiva, quiete monocroma e screenshot degli stati desktop/mobile. Questi giudizi non sono dedotti dai soli test Node.

## Misure e limiti

Le tracce contengono i campioni del motore, non un benchmark di dispositivo: 64 campioni desktop e 18 mobile. Il tempo medio JavaScript FX registrato è circa 10,49 ms desktop e 2,92 ms mobile, con inizializzazione/layout inclusi. Il costo di rasterizzazione, compositing e GPU non è separato. Gli intervalli medi RAF registrati sono circa 825 ms e 705 ms, con campioni oltre un secondo: il browser/iframe di verifica è stato fortemente rallentato. **Queste misure non certificano 60 fps.**

Touch e pointercancel sono eventi sintetici della fixture. Il viewport da 390 px non è un telefono fisico. Non sono certificati dispositivi iOS/Android reali, Safari, pinch zoom nativo, prestazioni GPU o crescita di memoria a lungo termine. Reduced motion e fallback sono implementati, ma non fanno parte dei 14 controlli browser V10 elencati qui.

Per l’embed sul sito pubblico, il contenitore deve usare un iframe a viewport intero (per esempio `height:100dvh`) con scroll interno. Il background rimane fisso rispetto al viewport del proprio documento. Se il wrapper espande l’iframe fino all’altezza di tutti i contenuti e fa scorrere il documento esterno, non si ottiene lo stesso comportamento. Il wrapper Framer pubblico non è stato modificato da questo pacchetto.

I pannelli privacy/cookie sono informazioni locali sul funzionamento della pagina e un contatto per richiedere i documenti completi. Non sono informative legali complete; gli URL ufficiali sono configurabili quando forniti.

## Riproduzione

```sh
npm run check
npm run verify
```

`npm run verify` rigenera l’HTML autonomo V10. L’eventuale warning npm relativo a `http-proxy` proviene dall’ambiente di esecuzione e non indica un errore del progetto.

## Fallback e accessibilità — browser V10

Fixture controllate in Chrome: 5/5 pass (`docs/verification/v10/fallback-v10-qa.json`). Movimento ridotto simulato: nessuna animazione, testo leggibile; renderer Canvas indisponibile: fallback leggibile; focus: card senza maschera; disattivazione: contenuti visibili; dispose: rimozione canvas, maschere e copie decorative. Le fixture riproducibili sono `qa/interaction.html` e `qa/fallback.html`, da servire dalla radice del progetto.
