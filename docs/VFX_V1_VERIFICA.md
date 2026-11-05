# Start — VFX Pass V1

Data: 4 novembre 2026. Revisione sorgente: 6.8.0. Base: Start V6 / 6.7 con overlay navbar V12 Framer.

## Risultato

- Titolo, testi delle card, FAQ, testi informativi, footer e icone ricevono un campo di prossimità condiviso.
- Il materiale combina contorno ambra, bagliore e trama triangolare ritagliata nelle forme del testo. Il testo piccolo usa meno intensità e dettaglio.
- I bordi reagiscono anche quando il cursore attraversa lo spazio tra due card. Il solo hover non applica una rete alle fotografie.
- L’intro percorre scia, reticolo, reveal e pieno. Lo scroll è continuo e reversibile: nessuna animazione one-shot riavviata a una soglia.
- Le maschere controllano il DOM effettivo. Font, immagini, collegamenti, padding e composizione della base sono preservati.
- Il motore comprende un solo scheduler e un solo stato del puntatore. Due superfici SVG permettono il compositing del contenuto sotto il blur della navbar e delle icone sopra di esso. Il glow della navbar è ritagliato nei box.

## Parametri

| Parametro | Valore |
| --- | --- |
| Raggio desktop / touch / navbar | 260 / 130 / 110 CSS px |
| Inseguimento / attacco / rilascio | 70 / 120 / 380 ms |
| Intro / interruzione in scroll | 1.050 / 100 ms |
| Preparazione massima / recupero assoluto | 200 / 1.400 ms |
| Uscita / ingresso | 2–16% / 80–100% della viewport |
| Intensità uscita | 0,55 rispetto all’ingresso |
| Particelle massime desktop / mobile | 120 / 48, condivise |
| Passi alpha della maschera | 24, raggruppati in path |

Configurazione: `assets/vfx/config.js`. Geometria del campo e triangolazione: `assets/vfx/math.js`. Bootstrap indipendente: `assets/vfx/boot.js`. Rendering e lifecycle: `assets/vfx/engine.js`.

## Verifiche eseguite

Ambiente browser: Chrome 155 su Linux remoto, DPR 1. Larghezze CSS esaminate: 1440, 1024, 768, 390 e 360. La pagina di prova usa un iframe alto 900 px; l’area effettiva può essere 15 px più stretta dove il browser riserva spazio alla scrollbar.

| Controllo | Evidenza / esito |
| --- | --- |
| Hero e glifi | Contorno allineato al testo reale, senza modifica della forma o del tracking. Corretto l’offset causato dalla scrollbar usando la larghezza del documentElement. |
| Card adiacenti | Campo nel gutter visibile su più bordi e testi contemporaneamente; centro delle foto pulito nello stato di hover. |
| Intro | Ispezionato il reveal intermedio a 520 ms: tipografia e tavole compaiono per celle, senza traslazione. |
| Scroll avanti e indietro | Percorso automatico di 10 s, andata e ritorno; maschere basate sulla posizione, senza accumulo di particelle. |
| Resize responsive | Nessun overflow orizzontale alle larghezze controllate. Corretto il riuso di maschere parziali dopo un cambio di dimensioni. |
| Estremo inferiore | A 360 px il footer “CONTINUA IL VIAGGIO!” e il chevron tornano pieni a fine pagina. |
| FAQ | Apertura con Invio a 390 px, risposta corretta e stato nativo details preservato. |
| Mappa | Embed Google caricato con controlli e attribuzioni visibili. Il pass agisce sul wrapper, senza accesso all’interno dell’iframe. |
| FX off | Zero maschere attive, overlay nascosti, contenuto pieno. |
| Cleanup | Dopo destroy: zero superfici SVG, zero maschere, API rimossa; main visibile e FAQ aperta ancora leggibile. |
| Regressione contenuti | Confronto fra HTML base e aggiornato: testo e destinazioni di link, immagini e iframe identici. Hash invariati per 52 asset originali, CSS base e file navbar inclusi. |

Screenshot inclusi in `docs/evidence/`: reveal a metà ingresso e campo condiviso nel gutter. Le schermate includono la barra della pagina QA; questa barra non compare su `index.html`.

## Prestazioni osservate e limiti

Le misure seguenti riguardano esclusivamente il tempo JavaScript del motore durante le chiamate effettivamente eseguite, rilevato con performance.now(). Non includono il tempo totale di rendering, rasterizzazione, compositing o GPU. Non equivalgono al frame time totale e non dimostrano 60 fps.

| Scenario finale | Campioni | Lavoro JS mediano | p95 | Note |
| --- | ---: | ---: | ---: | --- |
| Puntatore, percorso di 15 s, 1024×900, DPR 1 | 32 | 0,9 ms | 2,0 ms | Cache calda; zero build, zero letture layout e zero scritture maschera nel campione. |
| Scroll andata/ritorno di 10 s, 1024×900, DPR 1 | 15 | 9,7 ms | 55,0 ms | Include 10 build di cache e 171 letture di box. 620 scritture di path delle maschere. |

Il browser remoto ha mostrato intervalli requestAnimationFrame mediani intorno a 1.016 ms, compatibili con forte throttling della pagina/iframe. I campioni sono pochi e inadatti a una certificazione di fluidità. Nel controllo precedente, prima del raggruppamento delle maschere, lo scroll aveva mostrato 19,5 ms mediani e 104,4 ms p95: il confronto è indicativo, non un benchmark controllato. Restano picchi di costruzione della cache; profilare su un browser in primo piano prima di dichiarare un budget di produzione.

Non misurati: GPU, frame time su hardware fisico, alto DPR, Safari/iOS e Android, tap/pinch reali, drag della mappa. Il fallback è stato attivato dall’API; la preferenza di sistema reduced-motion e forced-colors è gestita nel codice/CSS ma non è stata commutata nell’ambiente remoto. La pagina QA offre “Fallback statico”, che non pretende di emulare tale preferenza.

## Robustezza e integrazione

Il documento è visibile per default. Il bootstrap installa i timer prima della classe temporanea di occultamento; in caso di font lenti, errore o mancato avvio viene ripristinata la pagina. L’intro viene saltata con movimento ridotto, colori forzati, anchor o navigazione di ritorno. Focus e selezione proteggono i contenuti dalla maschera. I listener touch non annullano lo scroll nativo.

Il rendering si ferma quando il puntatore si assesta e non c’è un’intro attiva; osservatori e listener vengono rimossi nel teardown. La geometria fuori vista viene limitata dalla cache. La navbar V12 e il suo protocollo di handshake restano quelli della base.

Lo scroll è calcolato nel documento Start. Un iframe senza scroll interno rimane pieno ai limiti. Se in futuro l’host sposta e ritaglia l’intero iframe attraverso il proprio scroll, occorre collegare un contesto viewport condiviso: questo pass non implementa un nuovo protocollo cross-origin per lo scroll dell’host. Il bridge esistente di navigazione/visibilità è preservato.

## Riprodurre i controlli

1. `npm run dev` e aprire `/qa/` sul server locale.
2. Scegliere una larghezza, usare il campo nel gutter e confrontare FX on/off.
3. Usare i fotogrammi dell’intro e poi tornare a “Intro live”.
4. Eseguire il percorso cursore e lo scroll; leggere le metriche riportate sotto l’iframe.
5. Verificare FAQ, fine pagina, fallback e cleanup. “Load” ricrea il documento dopo il cleanup.

`npm run check` verifica riferimenti, asset, sintassi e gradienti. `npm run check:vfx` verifica estremi del campo, centro leggibile, documenti corti, reversibilità, fasi, triangolazione deterministica e copertura senza buchi. `npm run export` rigenera l’HTML autonomo. Questi controlli non sostituiscono il collaudo visivo e il profiling sul dispositivo finale.

La consegna contiene i sorgenti statici e la preview privata. Il dominio Vercel esistente non è stato aggiornato automaticamente.
