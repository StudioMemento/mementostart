# Verifica Start V9 / R4

7 novembre 2026. Base: `MEMENTO_START_V8_NAV_OVERLAY_VERCEL.zip`, versione recuperata 10. Specifica: handoff R4 allegato.

## Risultati

Il blocco `<main>` è identico alla base. Hash SHA-256 invariati per 42 file: configurazione e azioni Start, immagini, font e intero kit navbar. Nessuna foto è stata sostituita con una tavola generata.

Tre controlli automatici completati: preservazione; invarianti geometriche; pacchetto con asset, riferimenti accessibili, sintassi JavaScript ed export autonomo. La fixture da 520 × 260 px ha 413 vertici e 1091 edge unici e copre l’area del poligono con i due tagli. Il test controlla seed, area, campo limitato, displacement, impulso sul grafo, curl nei due versi e reversibilità.

La suite browser finale ha superato **11 controlli su 11**: foto attiva esclusiva; gap senza recupero colore; esaurimento particelle; scroll fermo; reverse sulle stesse maschere; un solo impulso al rilascio; nessun impulso aggiuntivo su cancel; focus rivelato; cleanup; movimento ridotto; renderer indisponibile. Il reverse confronta le maschere applicate ai target visibili dopo il passaggio di frame reali.

Controlli visuali in Chrome 156, Linux x86_64, DPR 1: 1280 × 900, 820 × 900 e 390 × 844; nessun overflow orizzontale rilevato. Osservati hover laptop, maglia locale, testo e icona, scroll, griglia mobile e titoli. Il pseudo-contenuto decorativo non duplica il nome accessibile nell’albero di Chrome.

FAQ aperta con la risposta corretta; dialogo preferenze aperto e chiuso; mappa disattivata con ricomparsa di “Mostra Google Maps”. Nessun collegamento email o social è stato attivato per inviare messaggi.

## Implementazione effettiva

| Area | Comportamento |
| --- | --- |
| Fondo | Coordinate documento, seed fisso, campionamento a distanza variabile; quiete monocroma, campo ambra locale. |
| Card | Topologia propria con fasce irregolari al perimetro, celle interne più ampie; foto attiva distinta dalla prossimità. |
| Testo e icona | Texture triangolare procedurale in cache, ritagliata dal testo CSS e dalla maschera dell’icona. Nessuna suddivisione del testo in lettere. |
| Propagazione | Fronte dal tratto vicino al puntatore verso il seguito della stringa; cooldown e riarmo dopo l’uscita. |
| Loading e scroll | Maschere SVG alpha per faccia con copertura continua. Composizione unica di intro e scroll; maschera rimossa a reveal completo. |
| Touch | Pointer Events passivi, un’origine primaria; tempi di arrivo del rilascio calcolati sulle adiacenze. Cancel senza impulso. |
| Particelle | Pool massimo 64, 24 sotto 700 px; vita reale breve, curl nei due versi. Nessun emitter continuo a puntatore fermo. |
| Accessibilità | Canvas senza eventi/focus; pseudo-contenuto con alternativa accessibile vuota. Focus leggibile; reduced motion senza animazioni o maschere. |
| Lifecycle | Un RAF, observer condivisi, pausa su documento nascosto, intro non ripetuta al resume. Dispose rimuove canvas, maschere, listener, observer e geometrie. |

## Scelte e differenze

- **Canvas2D + maschere SVG/CSS**, non WebGL: il renderer WebGL era una proposta tecnica. Nessuna libreria esterna o seconda scena 3D.
- Il micro-reticolo nei glifi ha movimento interno nullo per conservare kerning e allineamento; la propagazione ne controlla maschera e intensità.
- Mappa e legal rimangono interamente leggibili durante lo scroll. La mappa riceve solo il bordo; tile e controlli non sono catturati o ricolorati.
- La mappa conserva il singolo taglio alto-sinistra della V8. Le altre card conservano alto-sinistra/basso-destra: precedenza del DOM reale sulle tavole.
- Il reveal usa celle più larghe della maglia hover per contenere il costo del DOM. La copertura agisce sul contenuto reale.
- Consegnate tracce JSON. **Non sono stati prodotti screencast video** di mouse, touch o scroll.

## Misure e limiti

`performance.now()` misura il lavoro JavaScript del motore. Non separa GPU, compositing CSS, rasterizzazione o costo della mappa. I campioni includono picchi di inizializzazione/layout e non sono benchmark di device reali.

Il browser remoto ha mostrato intervalli RAF anche vicini a 1000 ms nelle fixture iframe. I campioni lenti sono conservati nei JSON: **60 fps non certificati**. Le misure complete sono in `desktop-hover.json`, `mobile-390.json`, `tablet-820.json` e `final-suite.json`.

Il mobile è un viewport responsive di Chrome desktop. Touch, cancel, reduced motion e renderer indisponibile sono esercitati tramite fixture controllate; non sono prove fisiche su iPhone/Android, pinch zoom nativo o Safari. Non sono stati eseguiti un profilo heap prolungato o una prova reale avanti/indietro tra tutte le pagine. L’iframe nascosto da un wrapper esterno va verificato nel contenitore finale; la pausa su `document.hidden` è implementata.

## Copertura R4

| Criteri | Riscontro |
| --- | --- |
| V01–V08 | Quiete/hover/gap/card osservati; campo, topologie, poligono e attenuazione verificati. |
| V09–V15 | Testo/icona, foto attiva e titoli osservati; esaurimento particelle verificato. La qualità temporale della propagazione va valutata dal vivo. |
| V16–V17 | Release/cancel sintetici superati; scroll e pinch fisici da provare. |
| V18–V21 | Tracce loading, maschere reali, freeze e reverse verificati. Timing percepito non certificato nell’ambiente remoto. |
| V22 | Driver da posizione e assenza di replay implementati; cronologia tra pagine non testata. |
| V23–V24 | Geometria preservata; tre larghezze controllate; rotazione fisica e altri browser da verificare. |
| V25–V27 | Focus, reduced motion, fallback, FAQ e preferenze mappa verificati; destinazioni originali conservate. |
| V28 | Dispose verificato; un engine nel codice. Memoria su sessione prolungata non certificata. |
| V29 | Main e 42 file originali confrontati automaticamente. |
| V30 | Device reali e 60 fps non verificati. |

## Riproduzione

`npm run verify` esegue i controlli di sorgente. `npm run export` rigenera l’HTML autonomo. `MementoStartVFX.getMetrics()` espone le misure correnti per una successiva prova sui dispositivi dello studio. Questa consegna è il prototipo integrato da valutare in movimento, senza attribuire alle tavole statiche valore di benchmark.
