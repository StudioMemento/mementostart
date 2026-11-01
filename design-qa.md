# Design QA — Memento START V6

final result: passed

## Riferimenti e confronto

La struttura approvata della revisione 5.6 è il riferimento. L'ultima richiesta modifica la direzione delle immagini e il colore della mappa durante hover. Confronti affiancati realizzati fra catture V5.6 e V6 allo stesso viewport di 1600×900: contatti a riposo, FAQ con la seconda domanda aperta, sede a riposo. Dimensioni dei pannelli, font, copy, bordi, padding e allineamenti corrispondono. Differenze intenzionali: immagini particellari e adattamento proporzionale delle email per conservare le scie.

## Esito visivo

Tutte le 12 immagini sono WebP locali nuovi, con superfici carbone frammentate, accenti ambra, granelli e scie vorticose su fondo nero puro. Ogni immagine è stata ispezionata e poi verificata nel componente. Nessun placeholder o immagine precedente referenziata. Le aree testuali restano libere; blur progressivo 1/3/7 px conservato. Le FAQ mostrano un soggetto astratto a destra; su mobile l'immagine attenuata non impedisce la lettura.

## Browser e interazioni

- Chrome cloud: pagina sorgente e HTML autonomo aperti e verificati.
- Hover contatto: grayscale(0), overlay 0, chevron rgb(237,189,124); a riposo restano grayscale(1) e overlay .5. Padding delle sei card identico: 35.504 px al viewport desktop di confronto.
- Quattro FAQ: cambio domanda e immagine verificati; prima aperta al caricamento. Pannello 640 px desktop, 620 px mobile.
- Maps: hover e ritorno a riposo verificati con movimento reale del puntatore. Inversione .92, hue-rotate 180deg, contrasto .92 e saturazione .72 rimangono invariati; cambia solo grayscale da 1 a 0. Sfondo scuro in entrambi gli screenshot. Scheda Studio Memento e link nativo alle recensioni visibili nel layout desktop Google, attribuzioni non coperte.
- Hero: un solo gradiente verticale sull'h1; nessun gradiente separato sui due span.
- HTML autonomo: 12/12 immagini incorporate e caricate; FAQ interattiva; font locale Inter; filtro mappa corretto.
- Nessun errore/warning della pagina nei log del tab QA e dell'HTML autonomo. Il tab principale contiene solo messaggi preesistenti dell'estensione del browser, estranei alla pagina.

## Responsive

| Viewport | Larghezza contenuto | Altezza FAQ | Overflow controllato |
|---|---:|---:|---|
| 320×844 | 272 px | 620 px | nessuno |
| 390×844 | 323.6875 px | 620 px | nessuno |
| 768×900 | 602.390625 px | 640 px | nessuno |
| 1024×900 | 807.1875 px | 640 px | nessuno |
| 1600×900 | 1268 px | 640 px | nessuno |
| 1920×900 | 1280 px | 640 px | nessuno |

Catture mobile aggiuntive: contatti a 320 px, FAQ e sede a 390 px. Numero telefonico può andare su due righe nelle card più strette, senza fuoriuscire dal padding.

## Verifiche tecniche

`npm run check` superato: riferimenti locali, ID univoci, riferimenti accessibili, sintassi JavaScript, gradienti DNA e output statico. Export autonomo generato e verificato nel browser. Le licenze font/icone restano nel pacchetto e nell'HTML autonomo.

P0: nessuno. P1: nessuno. P2: nessuno. P3: nessuno necessario per questa revisione.

## Limiti conservati

Le scie sono parte delle immagini raster, non particelle animate. La mappa usa l'embed nativo Google con un adattamento cromatico CSS; la disposizione dei controlli e la scheda recensioni dipendono dal viewport e da Google. Le destinazioni dei documenti legali restano configurabili. Nessuna pubblicazione richiesta o effettuata.
