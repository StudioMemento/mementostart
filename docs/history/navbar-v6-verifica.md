# Verifica overlay ricostruito — START 6.5

## Metodo e risultato

Verifica in Chromium headless, con richieste servite dai file del pacchetto. Il confronto visivo usa la pagina reale durante lo scroll, su desktop, mobile e rasterizzazione a scala 0,6×. Le immagini di controllo restano materiale di lavoro e non sono incluse nel sito.

Il precedente overlay accumulava scostamenti fino a due livelli RGB su un campo uniforme #111. Il nuovo usa un solo backdrop per bordo, senza gradienti colorati. Sui campi uniformi #111 e #121212 la variazione misurata è al massimo un livello RGB su 255, dovuta alla composizione a 8 bit; sul nero è zero. Non si dichiara assenza matematica di quantizzazione su ogni display/browser.

Il blur è misurato su strisce alternate confrontando il contrasto RMS dello stesso contenuto con e senza effetto. Il campione è al 30% dell’estensione della fascia, contando dal bordo. Il contrasto al centro resta invariato entro l’1%. Il controllo negativo con l’overlay precedente supera il limite del nuovo test sul fondo uniforme.

| Viewport CSS | Scala raster | Riduzione contrasto alto / basso | Canvas uniforme |
|---|---|---|---|
| 1280 × 800 | 1× | 89.1% / 89.1% | 18–19 su fondo 18 |
| 390 × 844 | 1× | 88.7% / 88.7% | 18–19 su fondo 18 |
| 3413 × 1343 | 0.6× | 89.5% / 90.4% | 18–19 su fondo 18 |

## Geometria e interazioni

Verificati 320×568, 390×844, 768×1024, 1440×900, 1920×1080 e 844×390. Nessun overflow orizzontale; logo caricato; bordi del primo e ultimo box allineati con il logo entro 0,6 CSS px. Box 44 px e icone 34 px desktop / 32 px mobile; landscape basso 42/30 px. Le aree cliccabili sono 48×48 px.

Start è l’unica voce corrente. Verificati cinque link pubblici e il click su Start, navigazione da tastiera, movimento ridotto, FAQ, Escape, dialoghi, mailto e spazio finale del footer. Gli host simulati pubblico e tecnico completano l’handshake, nascondono l’overlay del child e ricevono il ritorno esplicito al mondo senza ricaricamento. Verificata anche l’apertura dell’HTML autonomo da file.

Contenuti e asset di Start, SVG del logo, sprite delle icone e moduli del protocollo sono confrontati byte per byte con il pacchetto precedente. Le modifiche riguardano l’overlay, gli inset dedicati, l’export e la documentazione.

## Limiti

La verifica riguarda Chromium e il pacchetto locale; non è una prova del sito pubblicato o di Safari/Firefox. Google Maps è esclusa dalla verifica locale dell’overlay; la sua configurazione è conservata. La preferenza di sistema per ridurre la trasparenza disabilita intenzionalmente il blur. Nei browser privi di backdrop-filter il componente mantiene i controlli senza aggiungere fasce scure. La pagina dentro un hub usa l’overlay del parent: occorre distribuire la stessa cartella navigation anche nel progetto hub per aggiornarlo.
