# Memento — Visual DNA verificato

**Riferimento: pagina Servizi standalone + Servizi nel Nav Hub**  
**Audit del 30 ottobre 2026 · revisione 1.1 del 30 ottobre 2026 · unità: CSS px**

Standalone: <https://mementoservizi.vercel.app/>  
Hub: <https://mementonav.vercel.app/#services-content>

Questo documento raccoglie l’audit del sito pubblicato e le modifiche richieste dopo la revisione 1.0. È il contratto di riferimento per uniformare altre pagine. La revisione 1.1 aggiorna esclusivamente questa specifica: non contiene modifiche al sito né nuove misure nel browser.

**Come usarlo:** leggere insieme alle 12 tavole di `Memento_Tavole_Tecniche.pdf`, che restano alla revisione 1.0. PDF, PNG, screenshot, misure JSON e ZIP non sono stati aggiornati. Per larghezze, margini e trattamento dei gradienti, **prevale questo markdown 1.1**; le vecchie quote nelle tavole e nei JSON documentano soltanto il sito misurato.

**Modifiche richieste — revisione 1.1:**

| Ambito | Regola aggiornata |
|---|---|
| Desktop/tablet ≥768 px | Area centrale all’80% del contenitore, centrata, con larghezza massima 1280 px |
| Tavola desktop/base | Massimo **1280 × 640 px**, rapporto 2:1; sotto il massimo scala proporzionalmente |
| Mobile ≤767 px | Carousel: **20% spazio laterale / 60% slide centrale / 20% spazio laterale**, per esporre slide adiacenti e background |
| Gradienti | Rampe regolarizzate e trattamento anti-banding; direzioni, palette, alpha strutturale e stati restano quelli del riferimento |

**Interpretazione operativa delle percentuali:** “padding 80%” indica l’occupazione orizzontale dell’area centrale, non `padding:80%` né un inset interno dell’80%. “20–60–20%” indica la ripartizione della larghezza mobile del carousel, non tre valori di padding CSS. Il padding interno `P` resta distinto. Il limite 1280 × 640 riguarda le tavole nel ramo desktop/base; i rapporti portrait e il limite verticale dei dialog restano quelli del §4.2.

## 1. Autorità, evidenza e limiti

| Sigla | Significato | Uso |
|---|---|---|
| O | Osservato nel browser | Screenshot, interazione o misura DOM |
| C | Verificato nel codice pubblicato | Formula, media query, messaggio, durata configurata |
| R1.1 | Specifica aggiornata su richiesta dell’utente | Regola da implementare; i valori derivati non sono nuove misure del sito |
| P | Proposta per il lavoro successivo | Non confondere con il riferimento attuale |

Priorità: R1.1 prevale su O/C e sulle tavole 1.0 soltanto per gli ambiti modificati sopra. Il resto dell’audit conserva validità come riferimento. Le formule e i criteri operativi dei §§4, 7–8, 12, 17–18 includono già gli aggiornamenti; non reimportare le vecchie dimensioni dai sorgenti allegati.

Quando una regola storica contraddice una successiva, vale il risultato della cascata, non il commento nel file. Sono caricati **19 fogli CSS**; le correzioni finali sono V29–V34 e `memento-start.css`. V34 annulla diversi effetti ancora presenti in V33. Copiare un singolo CSS intermedio produce un risultato diverso.

Verifiche: Chrome con WebGL per l’hub; standalone misurato a **360×800, 390×844, 820×1180, 844×390, 1440×1000 e 1920×1080**. Screenshot dei componenti principali a 1440 e 390; tablet a 820. Hub: percorso completo desktop e contesto alpha a390×844, con iframe e viewport entrambi390×844. Le dimensioni indicano il viewport CSS, non un modello di telefono. Non sono prove su hardware touch, Safari/iOS, zoom del testo al 200%, lettore di schermo o connessioni lente. Le durate riportate sono configurazioni, non benchmark di prestazione. I fotogrammi della scena animata non sono confrontabili pixel per pixel nel tempo.

Un browser cloud senza WebGL ha mostrato il fallback; l’audit interattivo è stato completato nel browser con WebGL. Quel fallback documenta un percorso di degradazione, non un guasto generalizzato del sito.

## 2. Diagnosi essenziale

1. **La trasparenza è strutturale.** Il documento embedded è trasparente; le grandi tavole sono nere opache; le tile del catalogo dissolvono davvero in alpha. Sono tre comportamenti diversi.
2. **Il contesto dell’hub cambia la lettura.** L’acqua sta sotto l’iframe, ma l’atmosfera sta sopra. Il fumo può coprire anche card opache e dialog. Non è un gradiente nero della pagina Servizi.
3. **La tipografia ha ruoli distinti.** Titoli di categoria distribuiti lettera per lettera; titoli delle card compatti; CTA finale a colore pieno. Un solo stile H1/H2 non riproduce il sistema.
4. **Le misure dipendono dal contenitore.** `cqw`, safe area, orientamento e altezza del viewport contribuiscono al risultato. Non basta impostare una percentuale di larghezza.
5. **Gli hover attuali sono contenuti.** V34 annulla lift, zoom, scorrimento del gradiente e luce sulle superfici. La CTA conserva una luce sul perimetro e una variazione cromatica della scultura.
6. **Le CTA Start escono dall’hub.** I link correnti puntano a `https://mementostudio.it/start` con `target="_top"`. È una scelta funzionale da rendere esplicita nel trasferimento.

Queste sono cause concrete di possibile divergenza tra una descrizione generica e il sito reale; non dimostrano da sole perché il precedente tentativo su Start sia fallito.

## 3. Inventario del percorso

| Ordine | Blocco | Composizione verificata |
|---|---|---|
| 1 | Apertura bundle | 6 tavole, prima “Brand online” |
| 2 | Catalogo | “Servizi di design.” + toggle Digitale/Fisico; 30 tile digitali / 14 fisiche |
| 3 | WEB DESIGN | 7 card |
| 4 | 3D DESIGN | 6 card |
| 5 | VIDEO | 8 card |
| 6 | VISUAL | 4 card |
| 7 | DESIGN | 6 card |
| 8 | BRANDING | 6 card |
| 9 | Invito finale | “Ready to start?” + scultura + chevron |

Le quantità del catalogo e delle categorie non vanno sommate come servizi unici: sono presentazioni/classificazioni diverse. Il documento Servizi non aggiunge una propria navbar visibile. Il titolo H1 è accessibile ma nascosto visivamente. Il flusso verticale è continuo, `scroll-snap-type:none`; le sezioni non sono vincolate a un’altezza di uno schermo.

Dialog servizio: quattro tavole, **Servizio → Cosa ottieni → Come lavoriamo → Parliamone**. Dialog bundle: risultato/offerta, componenti inclusi, processo, contatto; i componenti possono aprire il relativo servizio e permettere il ritorno al bundle. I testi e gli a capo editoriali appartengono ai dati, non a un generatore automatico di titoli.

## 4. Geometria comune

### 4.1 Simboli e formule

- `V`: larghezza del contenitore della sezione, normalmente uguale al viewport.
- `A=max(env(safe-area-inset-left),env(safe-area-inset-right))`: riserva laterale simmetrica minima.
- `W0`: larghezza nominale della tavola centrale, secondo la tabella R1.1 seguente.
- `W=min(W0,V-2A)`: larghezza finale, limitata soltanto se una safe area invade i margini nominali.
- `G=X=(V-W)/2`: margine esterno effettivo per lato e origine orizzontale della tavola centrale.
- `P`: inset interno del componente. **Gutter esterno e padding interno non sono lo stesso token.**
- `H`: altezza della tavola; `VH`: altezza utile del viewport/dialog.

Le sezioni bundle/categoria e il dialog hanno `container-type:inline-size`. Le tile hanno il proprio contenitore per il testo espresso in `cqw`. Il `cqw` del titolo tile è riferito alla tile, non alla pagina.

| Intervallo | Regola R1.1, prima dell’eventuale limite safe area |
|---|---|
| V ≤ 767 | Carousel bundle/categoria e tavole dialog: `W0=.60V`; margini `.20V` per lato |
| V ≥ 768 | Tavole, catalogo e CTA: `W0=min(.80V,1280px)`; margini `(V-W0)/2` |

L’80% è la larghezza prima del tetto massimo: a V1600 si raggiungono W1280/H640; sopra V1600 la tavola resta 1280 × 640 e aumentano i margini. A V1440 la nuova quota è W1152/H576: imporre contemporaneamente W1280 e l’80% a quel viewport sarebbe contraddittorio. Usare `80%` del contenitore, evitando `80vw` se la sezione non occupa tutto il viewport.

**Ambito mobile:** il 20–60–20 si applica alla slide centrale e al suo allineamento; lo stage del carousel rimane largo V. I due spazi laterali sono trasparenti e devono lasciare vedere le tavole adiacenti e il background dell’hub. Non restringere lo stage al 60% né nascondere le slide ai bordi della card centrale. L’heading della categoria segue W; i controlli mantengono le hit area del §9.

Catalogo, toggle e CTA mobile conservano la larghezza precedente per non comprimere griglia e testo: `Gc=clamp(32px,8.5vw,52px)`; `SLc=max(Gc,safeLeft)`; `SRc=max(Gc,safeRight)`; `Wc=V-SLc-SRc`. A390, Wc323,70 mentre la slide W234. Non applicare il 60% globalmente a `body`, alla griglia o ai form. Da768, catalogo e CTA usano lo stesso W delle tavole; i vecchi cap1960/1720 e il gutter5.5vw non governano più questi wrapper.

### 4.2 Dimensioni e padding per componente

| Componente | Desktop / base | Portrait ≤767 | Portrait 768–1023 |
|---|---|---|---|
| Bundle H | W/2 | W/.74 | W/1.25 |
| Categoria H | W/2 | W/.82 | W/1.25 |
| Bundle P | clamp(24,.044W,58) | clamp(20,.065W,42) | clamp(20,.065W,42) |
| Categoria P | clamp(24,.044W,66) | clamp(20,.065W,32) | clamp(24,.044W,66) |
| Popup P | clamp(24,.044W,66) | clamp(20,.065W,32) | clamp(24,.062W,42) |
| Popup H | min(W/2,spazio), min 120 | min(W/.65,spazio), min 120 | min(W/1.12,spazio), min 120 |

`spazio=altezza dialog-144-safeTop-safeBottom`. Il popup è centrato verticalmente: `Y=(altezza dialog-H)/2`. Il corpo interno del popup ha un ulteriore inset di **1 px**, quindi una copia a `left:P` inizia a `X+1+P` rispetto al bordo esterno. L’altezza del dialog può seguire `visualViewport` attraverso `--dialog-height` e `--dialog-top`.

Portrait è una condizione reale `(orientation:portrait)`, non un sinonimo di “mobile”. A 844×390 si applica il ramo landscape: con R1.1 W675,20 e categoria/bundle H337,60; padding verticale categoria 44; titolo card `clamp(26,.058W,48)`; bundle P=20. Nel popup landscape con altezza ≤600, inset `clamp(18,.06H,26)`, copy 14 px e titolo limitato anche dall’altezza. La CTA passa a min-height 220, padding 28 e titolo `clamp(32,5vw,58)`. Per le altre eccezioni dei popup commerciali vale il sorgente allegato, ricalcolando le dimensioni dipendenti da W.

### 4.3 Quote aggiornate e misure storiche

**R1.1 — valori calcolati, safe area nulla, tavola attiva ferma; arrotondati a 0,01 px.** H640 è il massimo del ramo 2:1, non un’altezza fissa imposta al portrait.

| Viewport | G slide per lato | W slide | H bundle | H categoria | W catalogo/CTA |
|---|---:|---:|---:|---:|---:|
| 360×800 | 72 | 216 | 291,89 | 263,41 | 296 |
| 390×844 | 78 | 234 | 316,22 | 285,37 | 323,70 |
| 820×1180 | 82 | 656 | 524,80 | 524,80 | 656 |
| 844×390 | 84,40 | 675,20 | 337,60 | 337,60 | 675,20 |
| 1440×1000 | 144 | 1152 | 576 | 576 | 1152 |
| 1600×1000 | 160 | 1280 | 640 | 640 | 1280 |
| 1920×1080 | 320 | 1280 | 640 | 640 | 1280 |

**O — misure storiche della revisione 1.0, conservate per leggere le tavole originali. Non sono i target R1.1.**

| Viewport | G | W | H bundle | H categoria | Titolo categoria | Tile W×H | CTA W×H |
|---|---:|---:|---:|---:|---:|---:|---:|
| 360×800 | 32 | 296 | 400 | 360,98 | 42,92 | 142×157,77 | 296×320 |
| 390×844 | 33,15 | 323,70 | 437,43 | 394,75 | 46,94 | 155,85×173,17 | 323,70×358,79 |
| 820×1180 | 36 | 748 | 598,40 | 598,40 | 108,46 | 179,50×179,50 | 748×270 |
| 844×390 | 36 | 772 | 386 | 386 | 111,94 | 185,41×185,41 | 772×220 |
| 1440×1000 | 79,20 | 1281,60 | 640,80 | 640,80 | 185,83 | 242,50×242,50 | 1281,59×374,40 |
| 1920×1080 | 105,60 | 1708,80 | 854,40 | 854,40 | 190 | 324,16×324,16 | 1708,79×450 |

Differenze di centesimi dipendono da arrotondamenti del browser e coordinate trasformate. Per testare le misure usare la tavola attiva ferma: i rettangoli delle tavole laterali includono prospettiva e scala.

### 4.4 Ritmo verticale

| Elemento | Regola corrente |
|---|---|
| Apertura bundle | top `clamp(96,8vw,160)+safeTop`; bottom `clamp(28,4vw,64)` |
| Controlli bundle | margin-top 12; altezza 44 |
| Catalogo | padding-block 32/96; ≤767: 16/64 |
| Intestazione catalogo | min-height 96; padding top max(14,safeTop), bottom 24; ≤767 bottom 20 e gap 20 |
| Distanza catalogo/griglia | `#catalogue-groups` margin-top 12; ≤767: 8 |
| Categoria | padding-block `clamp(64,6vw,110)`; ≤767:54; landscape basso:44 |
| Titolo categoria/card | margin-bottom 18 del wrapper heading |
| Controlli categoria | margin-top 14; ≤767:18; altezza 44 |
| Sezione CTA | top `clamp(72,9vw,144)`; bottom `max(90,safeBottom)` |

A 1440 la prima tavola parte a y=115,20, non a y=0. A 390 parte a y=96. Non comprimere quello spazio a 24 px copiando V30: V31 lo sovrascrive. Questi offset restano invariati. Le altezze complessive storiche delle sezioni categoria (circa1134,86 a1440 e1401,18 a1920) appartengono alla revisione1.0: con R1.1 ricalcolarle da W, tipografia e spazi verticali. Superare la viewport resta possibile.

## 5. Catalogo, griglia e toggle

Il wrapper segue W da768 px e Wc su mobile, come definito nel §4.1. Colonne, gap, ratio e padding delle tile non cambiano nella revisione1.1.

| Proprietà | Specifica |
|---|---|
| Colonne | ≥1100:5; 768–1099:4; ≤767:2 |
| Gap | desktop/tablet `clamp(10,1.2vw,22)`; ≤767:16 verticale /12 orizzontale |
| Tile | aspect-ratio 1; ≤767 aspect-ratio .9 (altezza=larghezza/.9) |
| Copy tile | left/right 14, bottom 16; ≤767 left/right 10, bottom 14 |
| Titolo | sempre visibile, nessun reveal del testo necessario |
| Heading catalogo | relativo, non sticky; background trasparente; nessun backdrop blur |
| Toggle | 2 colonne, gap4, padding4, taglio esterno10; pulsanti taglio7 |
| Toggle desktop | 260×52; ogni pulsante124×44; padding10×18; icone20×20 |
| Toggle ≤767 | occupa la larghezza disponibile, testo14, padding laterale10; icone19×19 |
| Selezionato | testo `#edbf80`, fondo `#c4955621` |
| Inattivo | testo `#99958f`; fondo trasparente |
| Hover | testo `#f5dcc0`; transizioni colore .3s / fondo .4s |
| Focus | outline1 `#ecc089`, offset−4 |

Il cambio filtro rigenera il catalogo e aggiorna `aria-pressed`; la diversa quantità di tile cambia l’altezza del documento. Il contesto di scroll deve restare utilizzabile. Non forzare la stessa altezza vuota per i due filtri.

## 6. Tipografia: assegnare un ruolo prima di scegliere la misura

Font principale **Inter Variable**, asset `assets/fonts/InterVariable.woff2`, pesi 100–900, `font-display:swap`; fallback `Helvetica Neue, Arial, sans-serif`. Corpo base 16 px, peso400, letter-spacing .018em, colore `#f3f0ea`. I pesi 350/380/420/450 sono valori variabili reali: non arrotondarli a 300/400/500.

Computed styles verificati: `font-optical-sizing:auto`, `font-kerning:auto`, `font-feature-settings:normal`, `font-variation-settings:normal`. Conservare l’adattamento ottico del font; non fissare arbitrariamente un asse ottico per tutti i titoli. Le ricostruzioni tipografiche nelle tavole usano Inter; gli screenshot restano la prova del rendering originale del browser.

| Ruolo | Dimensione base | Peso | Interlinea | Tracking | Colore |
|---|---|---:|---:|---:|---|
| Categoria gigante | min(.145W,W/U,190) | 350 | 1.16 | 0 | gradiente categoria |
| Titolo card categoria | clamp(30,.062W,106) | 380 | 1.12 | −.055em | gradiente titolo |
| Titolo bundle | .069W | 420 | 1.12 | −.065em | gradiente titolo |
| Titolo popup servizio | .081W, limitato dal fit editoriale | 420 | 1.12 | −.065em | gradiente titolo |
| Popup output/processo | .058W, con fit editoriale | 420 | 1.12 | −.065em | gradiente titolo |
| Copy categoria | clamp(14,.017W,23) | 400 | 1.45 | eredita .018em | `#c6c2bc` |
| Copy popup | clamp(15,.0154W,23) | 400 | 1.45 | −.025em | `#dedbd5` |
| Intro bundle | clamp(15,.018W,25) | 400 | 1.3 | eredita .018em | `#c6c2bc` |
| Kicker bundle | 10 | 500 | normale | .12em | `#c8a579` |
| Lista bundle | clamp(13,.014W,20) | 400 | 1.3 | −.02em | `#bfb7ab` |
| Heading catalogo | clamp(32,4vw,64) | 380 | 1 | −.035em | `#f3f0ea` |
| Titolo tile | clamp(14,8cqw,25) | 400 | 1.24 | −.015em | gradiente titolo |
| CTA finale | clamp(38,6.6vw,112) | 380 | 1.12 | +.012em | pieno `#f0ede7` |

`U`: WEB DESIGN6.65; 3D DESIGN5.7; VIDEO3.10; VISUAL3.57; DESIGN4.1; BRANDING5.30. La categoria è un flex di singoli caratteri con `justify-content:space-between`. Le lettere hanno `flex:0 0 auto`. Il gradiente è sul titolo intero e **non riparte su ogni lettera**. Non imitare questo effetto con letter-spacing enorme.

**Varianti portrait ≤767:** titolo card e bundle=.108W; popup hero=.143W; output/processo=.087W; CTA popup finale=.125W. Copy categoria `clamp(14,3.5vw,20)`; copy popup `clamp(15,.038W,22)` (≤370 il ramo precedente imposta14); titolo tile `clamp(13,9.5cqw,20)`; heading catalogo `clamp(27,6.8vw,42)`; CTA finale `clamp(38,9vw,64)` e36 a≤370. Con R1.1 a390, W234: titolo card/bundle25,27 e popup hero33,46 prima dell’eventuale fit editoriale; heading catalogo27 e tile14,81 restano invariati perché il wrapper del catalogo mobile mantiene Wc323,70.

**Tablet portrait 768–1023:** titolo card/bundle=.085W; popup hero=.11W. La copy popup occupa67%; l’intro bundle è limitata a23 px; la lista bundle usa16 px. Le varianti output/processo e start dei popup commerciali hanno ulteriori limiti nel foglio master: mantenere gli stessi dati `titleUnits` per riproduzioni esatte.

**Protezione dei glifi:** categoria gigante padding-block `.04em .12em`. Titoli card e `.item-master-gradient`: padding `.06em .09em .18em .015em` con margini negativi equivalenti. Titoli tile: padding `.04em .08em .16em .01em`, margini negativi equivalenti. Servono a non tagliare discendenti, accenti e sbordi; non sono spazi aggiuntivi da sommare ai gutter.

Il titolo bundle usa un contenitore senza gradiente e span `.item-master-gradient` nelle righe. I titoli dei popup sono composti editorialmente. Il fit dei popup usa `min(dimensione del ruolo,(W−2P)/titleUnits)` per limitare il testo alla larghezza disponibile: una nuova frase richiede misurazione e controllo, non solo la sostituzione della stringa. Nei popup la CTA testuale ha peso450, line-height1.2, tracking−.035em, font `clamp(16,.022W,26)`, colore#f4f1ec e hit-height≥44; portrait≤1023 font16/gap16; landscape basso font14. È ancorata a bottomP, mentre il titolo della tavola start sta a bottom(P+64).

## 7. Colori e gradienti esatti

Gli stop e gli angoli seguenti restano i riferimenti cromatici. Il CSS riportato è quello rilevato nell’audit1.0; la revisione1.1 richiede inoltre il trattamento smooth/anti-banding del §7.1. Copiare soltanto questi tre `linear-gradient` non certifica l’assenza di bande.

```css
--memento-title-gradient: linear-gradient(135deg,
  #f5f3ef 0%, #f5f3ef 34%, #eee4d6 61%, #ddbb8b 81%, #c98b42 100%);
--memento-category-gradient: linear-gradient(0deg,
  #c98b42 0%, #dfba86 24%, #eee5d7 53%, #f5f3ef 83%, #f5f3ef 100%);
--memento-frame-gradient: linear-gradient(135deg,
  #d8d1c3c7 0%, #aaa28f66 27%, #716a5e57 62%, #8c744b75 83%, #d9913de0 100%);
```

Titoli: bianco caldo in alto a sinistra, ambra in basso a destra. Categoria: bianco in alto, ambra in basso (`0deg` CSS punta verso l’alto: lo stop0 è in basso). Il frame contiene alpha, il titolo no. La distribuzione visibile dipende dal rettangolo su cui è applicato il gradiente.

| Ruolo | Valore | Da non confondere con |
|---|---|---|
| Root standalone | `#0b0c0d` | vecchio token `--bg:#0f0f0f` |
| Tavole grandi | `#000000` | trasparenza della pagina |
| Fondo CTA | `#07090a` | acqua dell’hub |
| Root hub | `#080a0b` | fondo standalone |
| Ambra finale titolo | `#c98b42` | colore hover CTA |
| Hover CTA | `#dfad6b` | arancio dell’hub |
| Dot attivo | `#f2a10a` | gradiente titolo |
| Freccia hover card | `#e4ad63` | dot attivo |
| Accento hub | `#ff7950` | ambra Servizi |

### 7.1 Gradienti smooth e anti-banding — R1.1

Obiettivo: transizioni continue, senza gradini, anelli, strisce o grana percepibile. Il termine corretto del difetto da evitare è **banding**. La revisione riguarda le rampe spaziali di colore e alpha; non modifica le curve temporali di hover, carousel o viaggio dell’hub.

| Aspetto | Prescrizione |
|---|---|
| Palette e orientamento | Conservare colori, angoli, posizioni degli stop e alpha di riferimento dei §§7–8; non aggiungere nero o cambiare l’ambra |
| Profilo alpha | Ricostruire una curva continua attraverso gli ancoraggi delle tabelle8.2/8.3 con interpolazione cubica monotona per tratti (PCHIP), senza overshoot. Conservare le zone pienamente opache/trasparenti. Le oscillazioni dei singoli pixel delle maschere1.0 non sono un profilo da copiare |
| Profilo colore | Per regolarizzare i passaggi fra stop, usare PCHIP per ciascun canale sRGB e per alpha, preservando i valori degli ancoraggi; valutare in precisione float, con componenti limitate a[0,1]. I tratti con ancoraggi uguali restano costanti |
| Compositing | Gestire RGB e alpha premoltiplicati nel compositing/ridimensionamento per evitare aloni. Le maschere devono modificare l’alpha della foto o del frame, non dipingere una velatura nera sul parent |
| Quantizzazione | Conservare precisione float o almeno16 bit durante la preparazione. Quantizzare soltanto all’uscita; non accumulare salvataggi successivi a8 bit |
| Dithering finale | Se l’uscita è a8 bit, usare blue noise statico, a media zero, con ampiezza massima ±1/255 per canale interessato, soltanto nelle transizioni. Alpha0 e alpha1 dei plateau rimangono esatti. Il dither non deve diventare texture, flicker o una grana sovrapposta al testo |
| Formato maschere | Alpha lossless; evitare JPEG e compressione che produca blocchi. Campionare alla risoluzione utile e mantenere `mask-size:100% 100%`; non ingrandire una piccola rampa raster |
| Ambito | Foto board desktop, foto tile, frame tile a riposo, fade esterno carousel, gradienti titolo/categoria/frame e rampe decorative CTA. Per la maschera dell’hub preservare anche altezza/posizione/stato del §14: migliora la rampa, non cambia il viaggio |

**Inviluppo e dither sono due cose diverse:** la curva prima del dither deve essere regolare e monotona in ciascun tratto monotono; i minimi scostamenti finali entro ±1/255 servono a distribuire l’errore di quantizzazione. Non applicare blur globale a fotografia, testo o frame per nascondere le bande. Se si campiona la curva in una LUT o in più stop CSS, l’errore massimo rispetto alla curva di riferimento deve restare ≤1/255 per canale.

Verificare il risultato alla dimensione finale, a zoom100%, sia sul fondo standalone sia sopra il parent animato. Controllare anche hover/focus e i passaggi dell’hub: nessun bordo scuro aggiunto, nessun artefatto di quantizzazione, nessuna banda visibile nelle zone scure. La rimozione della maschera del frame su hover/focus resta quella del §10. Questo è un criterio da collaudare sul rendering reale; l’aggiornamento del markdown non certifica già il risultato su ogni display.

## 8. Superfici, alpha e maschere

### 8.1 Chi dipinge cosa

| Superficie | Standalone | Embedded |
|---|---|---|
| html | `#0b0c0d` se data-embedded=false | trasparente |
| body, main, sezioni, stage carousel | trasparenti | trasparenti |
| Board bundle/categoria/popup | nero opaco + `.card-surface` nera | identico |
| Tile catalogo | trasparente + immagine con alpha | identico, lascia vedere il parent |
| CTA finale | `#07090a` opaco | identico |
| Dialog | trasparente | trasparente |
| Backdrop dialog | rgba(4,6,7,.12), blur18 | stesso blur del documento figlio |

`catalogo-surface.js` imposta `data-embedded` in base al confronto tra window e parent. L’assenza di colore nel documento figlio è necessaria per vedere il parent. Rendere nero body o una sezione copre l’acqua anche se l’iframe dichiara background trasparente.

### 8.2 Fotografie nelle tavole

Desktop: immagine allineata a destra, **width78%, height100%, x22%, top0**, `object-fit:cover`, `object-position:center`, `transform:none`. Nei popup le percentuali sono relative al corpo interno (inset1). La foto può essere ritagliata da `cover`; “soggetto intero” non è una regola desktop.

Maschera originale: **`photo-left-v33.png`**, 2048×1024, `center/100% 100% no-repeat`. R1.1 richiede una versione regolarizzata secondo §7.1, con gli ancoraggi sotto; il file originale resta evidenza dell’audit. È l’unica dissolvenza della foto: da sinistra verso destra. Nessuna dissolvenza superiore, destra o inferiore. La maschera fonde la foto con il nero della card, non direttamente con il parent.

| Posizione x, riga centrale | 0% | 10% | 20% | 30% | 40% | 50–100% |
|---|---:|---:|---:|---:|---:|---:|
| Alpha 0–255, campioni1.0 e ancoraggi R1.1 | 0 | 24 | 118 | 221 | 255 | 255 |

Portrait ≤1023: nessuna maschera, `object-fit:contain`, width100%. Categoria top22%/height60%; bundle top28%/height54%; popup top22%/height58%; popup commerciale processo top36%/height44%; popup commerciale start top22%/height50%. Il contenitore rimane nero. Il risultato mobile/tablet mostra talvolta il rettangolo più chiaro della fotografia: è una caratteristica osservata degli asset e del ramo senza maschera, non un bordo CSS da ricreare.

### 8.3 Tile e frame catalogo

Nell’audit1.0 la foto usa **`tile-bottom.png`**, il frame a riposo **`frame-bottom.png`**, entrambi2048×1024 scalati100%×100%. Per R1.1 regolarizzare le due rampe separatamente secondo §7.1 e gli ancoraggi sotto. Conservare la differenza fra fade della fotografia e fade del frame; non riprodurre le oscillazioni irregolari dei profili originali.

| y, colonna centrale | 0% | 10% | 50% | 80% | 90% | 100% |
|---|---:|---:|---:|---:|---:|---:|
| Tile alpha 0–255, ancoraggi R1.1 | 255 | 255 | 237 | 84 | 43 | 0 |
| Frame alpha 0–255, ancoraggi R1.1 | 255 | 255 | 255 | 110 | 59 | 0 |

Il testo è un layer distinto, non subisce questa maschera. Al passaggio o al focus, la maschera del frame viene rimossa: il bordo diventa continuo; la foto mantiene la propria dissolvenza.

### 8.4 Dissolvenza esterna del carousel

`F=max(0,(V-W)*.43)`, usando W aggiornato del §4.1. La maschera orizzontale del carousel passa per alpha0 a x0, .1 a .2F, .5 a .5F, .898 a .8F, 1 a F; resta1 fino a V−F e si specchia sull’altro lato. Interpolare gli ancoraggi con la rampa smooth del §7.1, senza spostarne le posizioni. È alpha reale, non una copertura nera.

Con R1.1 a1440: F123,84; inizio card144 → la rampa termina20,16 px prima della card centrale. A390: F67,08; card78 → margine10,92 px. Questa maschera sfuma le tavole laterali ai bordi del viewport; lo stage resta largo V e i lati non ricevono un fondino opaco. **Non aggiungere una vignettatura alla tavola attiva.** La maschera verticale animata dell’hub è un altro livello, descritto più avanti.

### 8.5 Asset e composizione

I render mostrano materiali scuri, riflessi caldi, dispositivi/oggetti a destra e zona per il testo a sinistra. Il colore delle luci è già negli asset. Nessuna impostazione CSS può ricostruire esattamente materiali, illuminazione o prospettiva. Per una replica usare le fotografie, il font, la scultura CTA e le icone originali; per nuovi soggetti trattare l’immagine come una nuova scelta da verificare, non promettere identità tramite un prompt generico “premium dark”. Le maschere nel pacchetto sono quelle dell’audit1.0: la specifica R1.1 richiede le rampe regolarizzate del §7.1, senza cambiare composizione, superfici o comportamento portrait. Nessun asset è stato rigenerato con questa revisione del documento.

## 9. Frame, tagli, icone e controlli

Tagli soltanto **in alto a sinistra e in basso a destra**. Bordo1 px, raggio0. `corner-cut=clamp(16px,1.5vw,24px)`:21,6 a1440;16 sulle tavole a390. Tile≤767:12. CTA:20 desktop/16 mobile. Non tagliare tutti e quattro gli angoli.

Il frame è un anello `polygon(evenodd,...)`, non `border` su un rettangolo successivamente tagliato. L’interno è traslato1 px e le diagonali correggono l’intersezione di `.4142px` per mantenere lo spessore perpendicolare. Geometria esterna:

```css
clip-path: polygon(var(--corner-cut) 0,100% 0,
  100% calc(100% - var(--corner-cut)),calc(100% - var(--corner-cut)) 100%,
  0 100%,0 var(--corner-cut));
```

Per l’anello completo copiare il poligono da `catalogo-polish-v29.css`, non disegnarlo a occhio. Frame board: alpha `.22+.78*slideFocus`; frame tile .76 a riposo e1 su hover/focus.

| Controllo | Hit area / grafica |
|---|---|
| Dot categoria/popup desktop |44×44; punto5×5, attivo scala1.65 →8,25 |
| Dot bundle desktop |44×44; punto6×6 per specificità `#bundle-controls`, attivo9,90 |
| Dot categoria ≤767 |width clamp(26,7vw,38), height44; a390=27,3×44 |
| Dot bundle/popup ≤767 |width clamp(32,9vw,44), height44; a390≈35,1×44 |
| Dot inattivo |chiaro, alpha .8 nella cascata; hover scala1.2, attivo ambra |
| Glow dot attivo |`0 0 13px #d8994f45` |
| X popup |hit44×44; icona20×20; nessun disco/fondo/blur |
| X posizione |top Ycard−44; right max(8,(V−W)/2−44) |

Il gruppo dots non contiene frecce laterali: quelle dello hub appartengono alla navigazione 3D, non al componente card. La freccia sulla card è un caret ruotato−45°, cioè un invito diagonale ad aprire. Il chevron CTA finale rimane orizzontale.

## 10. Stati e hover: matrice da implementare

| Componente | Riposo | Hover/focus | Vietato attribuirgli dal vecchio CSS |
|---|---|---|---|
| Tile catalogo |foto e titolo fermi; frame sfumato; freccia alpha0 |frame continuo alpha1; freccia alpha1/ambra |lift−3px, zoom1.025, brightness1.05, gradiente scorrevole |
| Tavola attiva |nero opaco; frame continuo; composizione ferma |freccia chiara→ambra; focus outline |tilt guidato dal mouse, glow del piano |
| Tavole laterali |trasformazioni di prospettiva del carousel |click seleziona la tavola |apertura immediata del contenuto mentre è laterale |
| Titolo popup |gradiente fisso |CTA testuale collegata cambia colore |spostamento di6px del chevron, annullato daV34 |
| X |opacity.82 |opacity1; icona ruota90° e si scalda |cerchio o fondino |
| CTA finale |titolo pieno, scultura monocroma, frame neutro |titolo/chevron ambra, scultura colorata, luce sul bordo |alzare la card o spostare il testo |

V34: `.surface-light{display:none!important}` e `::after` luminosi delle card disattivati. La scultura CTA passa da `grayscale(1) brightness(.8)` a `grayscale(0) brightness(1)`; il contenitore immagine da opacity.58 a.94. La foto delle tile non riceve questi filtri.

### 10.1 CTA finale completa

Min-height desktop `clamp(270,26vw,450)`; padding `clamp(28,4.4vw,76)`. Mobile min-height `clamp(340,92vw,460)`, padding28×24, testo in due righe, allineamento in basso; ≤370 min-height320, padding22×18. Fondo#07090a. Titolo colore#f0ede7→#dfad6b, senza gradiente.

Scultura desktop: width46%, height145%, right7%, top−22%; contain; maschera sinistra trasparente→opaco al25%. Mobile: width92%, height82%, right−4%, top−9%. L’overflow è nascosto intenzionalmente; il taglio della scultura sul frame non è un difetto di immagine.

Luce di bordo: SVG `.start-rim`, due tracce, morbida6 px/blur2/opacity.65 e nitida1,4 px. Gradiente radiale:0 `#ffe4b5` alpha1; .28 `#dfad6b` alpha.95; .68 `#c98a40` alpha.5;1 `#c98a40` alpha0. Raggio `clamp(90,.16*width,180)`. Il punto luce è proiettato sul punto più vicino del perimetro; segue il percorso più breve, con avvicinamento .18 per frame. È un effetto del bordo, non un alone sotto il puntatore nel piano. Attivazione pointer fine/hover; riduzione movimento elimina l’inseguimento animato.

Durate: testo/chevron .65s; immagine/opacity .75s; comparsa rim .5s. Curva `cubic-bezier(.22,1,.36,1)` salvo comparsa rim `ease`. Focus finale outline2 ambra offset−5.

## 11. Movimento e interazione dei carousel

**Autoplay disattivato** nei mount di categorie, bundle e popup (`autoplay:false`). La classe generica contiene un default true e intervalli9s, ma non è il comportamento attivo. Non aggiungere autoplay leggendo solo il costruttore.

Sia `d` la distanza continua dall’indice attivo; `a=abs(d)`. La card centrale ferma ha d0, scale1, yaw0, offset0. Le card laterali ruotano sull’asse Y; non sono screenshot piatti più piccoli.

| Parametro | Categoria / popup ≥768 | Categoria / popup ≤767 | Bundle ≥768 | Bundle ≤767 |
|---|---:|---:|---:|---:|
| Stride |.69W|.94W|.64W|.78W|
| Scala |.9^a|.97^a|.88^a|.88^a|
| Y |+.025H×min(a,2.6)|+.008H×min(a,2.6)|−.065H×min(a,2)|−.035H×min(a,2)|
| Yaw |−sign(d)×min(38,24a)|−sign(d)×min(22,12a)|−sign(d)×min(62,48a)|−sign(d)×min(62,32a)|
| Perspective |2000|1100|2000|1100|

Durante il passaggio, se a<1, X aggiunge un arco `sign(d)*sin(pi*a)*W*(.20 desktop/.08 mobile)`. `slideFocus=1-smoothstep(0,1,min(a,1))`. Copy/titolo/CTA: alpha `clamp((slideFocus-.18)/.82,0,1)`; immagine `.52+.48*slideFocus`; frame `.22+.78*slideFocus`. Mantenere la sincronizzazione dei layer: una CTA visibile su una card senza titolo è un errore.

Moto manuale: molla criticamente smorzata con omega1/145 in millisecondi; follow durante drag tau32ms; non è una semplice transition CSS con durata fissa. Il sorgente `catalogo-carousel.js` definisce limiti, wrapping, z-index e soglie di assestamento. Riduzione movimento porta direttamente alla destinazione.

| Input | Risposta |
|---|---|
| Click card attiva |apre il dettaglio |
| Click card laterale |porta quella card al centro |
| Click dot |selezione con percorso ciclico più breve |
| Drag orizzontale |prende possesso dopo6 px e rapporto orizzontale/verticale>1.1 |
| Movimento verticale |oltre8 px resta scroll nativo; pinch-zoom non catturato |
| Flick |soglia18 px e rapporto1.15; soppressione click dopo drag450ms |
| Wheel orizzontale |intent abs(dx)>1.1×abs(dy), soglia12 normalizzata; raggruppa il gesto, quiet160ms |
| Tastiera |ArrowLeft/Right, Home/End; non intercettare campi editabili |

Titoli categoria: reveal una volta con IntersectionObserver threshold.2, da opacity.48/y18 a opacity1/y0, .85s sulla curva Memento. Scrollbar: rail sovrapposto16 px (12 mobile), thumb2 px a destra3 (2 mobile), min-height32, opacity.32; hover/scroll/drag thumb3 px, opacity.85, colore#e0b57d. Non riserva una colonna vuota.

## 12. Dialog: entrata, lettura, uscita

Il dialog nativo occupa tutto il viewport, senza bordo né ombra propria. La tavola conserva W e la geometria del sistema. Entrata opacity0→1 in .28s ease-out; backdrop0→1 in .45s ease-out. Il blur finale è18 px. La chiusura usa `dialog.close()`: non introdurre una lunga animazione di uscita non prevista.

**R1.1 — quote derivate per il popup servizio, safe area nulla e senza riduzioni aggiuntive del fit editoriale:**

| Viewport | Card X / Y | W / H | P | Copy X / Y, incluso inset1 | Titolo hero | X chiusura X / Y | Dots Y |
|---|---|---|---:|---|---:|---|---:|
| 1440×1000 | 144 / 212 | 1152 / 576 | 50,69 | 195,69 / 263,69 | 93,31 | 1296 / 168 | 800 |
| 1600×1000 | 160 / 180 | 1280 / 640 | 56,32 | 217,32 / 237,32 | 103,68 | 1440 / 136 | 832 |
| 390×844 | 78 / 242 | 234 / 360 | 20 | 99 / 263 | 33,46 | 312 / 198 | 614 |

Sono calcoli della nuova specifica, non misure già verificate nel browser. Le quote dei popup conservate nelle tavole/JSON appartengono alla1.0 e sono superate per geometria e tipografia dipendente da W. Le immagini originali del dialog mobile includono anche l’inizio del fade: l’opacità0 di quei fotogrammi non è lo stato di lettura.

Apertura: memorizza scroll, hash e focus; blocca il body; focus sul titolo; hash `#servizio/{id}` o `#bundle/{id}`. Chiusura: ripristina hash, scroll e focus. Escape chiude il dialog. Il click fuori chiude solo se il pointerdown era fuori e il gesto non si è spostato oltre8 px; un trascinamento che esce dalla card non deve diventare una chiusura. Le tavole inattive hanno `aria-hidden`, tabindex−1 e contenuto inert.

Il dialog contiene quattro tavole, navigabili con dots, drag e tastiera. I testi devono essere selezionabili; un input o textarea non deve subire le scorciatoie del carousel. I popup commerciali possono contenere link interni ai servizi: non appiattirli in un’unica immagine.

## 13. Hub: stratificazione reale

Dal fondo verso il primo piano:

| z-index parent | Layer | Effetto sul contenuto |
|---:|---|---|
| base | html/body#080a0b | fallback scuro |
| 1 | `#scene-layer`, canvas3D | scena e acqua dietro il documento |
| 6 | `#page-layer` | iframe, traslazione verticale, opacity, maschera verticale |
| dentro6 | `#frame-host` | quando popup aperto: backdrop blur16 + brightness.78 |
| dentro6 | iframe trasparente | documento Servizi; dialog nel top layer del figlio |
| 7 | `#journey-input` | intercetta input durante SCRUBBING; blocca click nell’iframe |
| 8 | `#atmosphere` | canvas alpha, pointer-events none, nebbia davanti anche al dialog |

Il top layer di un dialog nell’iframe non supera il compositing del parent. Ecco perché la nebbia dell’hub può attraversare visivamente una card nera senza che quella card sia semitrasparente. I due blur non sono sommabili come un unico “blur34”: operano su layer diversi. L’atmosfera superiore non viene sfocata dal backdrop del figlio o dal frame-host sottostante.

**Stato CONTENT:** page-layer opacity1, translateY0, edge0; scene-ui nascosta; root figlio trasparente. L’acqua continua sotto la pagina. Target di rendering dichiarato30Hz nella lettura/60Hz nel viaggio; non è una misura FPS. Il frame non viene appiattito in un’immagine statica.

**Popup aperto:** messaggio figlio `memento:services:surface` con `overlayOpen:true`; parent imposta `data-services-modal=true`; `#frame-host` passa a `backdrop-filter:blur(16px) brightness(.78)` con transition.35s. Il dialog figlio aggiunge il proprio backdrop18px/rgba(4,6,7,.12). Chiusura invia false e riporta il frame-host a none. Verificato nel browser.

## 14. Hub: dal caricamento all’uscita

### 14.1 Sequenza verificata

1. **BOOT:** il parent carica la scena3D. Se WebGL manca, mostra fallback con link diretti e tentativo di ripristino. Nessuna prova di tempi di rete o CLS è stata eseguita.
2. **SCENE / Services:** la scena è selezionata; frecce laterali disponibili. Hover sul titolo può precaricare la sezione; l’inizio del viaggio la prepara comunque.
3. **Preparazione iframe:** il parent crea `#section-frame` sulla URL Servizi. Il figlio esegue il bridge e imposta la superficie embedded. Al load il parent invia INIT; la sola emissione load non equivale a handshake completo. Dopo15s senza caricamento previsto appare l’avviso con accesso diretto.
4. **SCRUBBING / entry:** ingresso tramite freccia/titolo o scroll; camera va verso l’acqua; documento sale dal basso; nebbia e lente accompagnano il passaggio. I click nell’iframe sono bloccati durante questa fase.
5. **CONTENT:** hash parent `#services-content`, pagina leggibile e scroll nativo; filtri, carousel e popup appartengono al figlio.
6. **Uscita dal bordo superiore:** scroll verso l’alto quando il figlio è all’inizio inverte il viaggio d’ingresso; ritorno a `#services`.
7. **Uscita dal fondo:** dopo avere raggiunto il fondo, ulteriore scroll verso il basso avvia il viaggio `loop`; documento sale oltre lo schermo, la camera compie un arco e torna alla **stessa scena Services**. Non seleziona Projects automaticamente.
8. **SCENE ripristinata:** page-layer hidden/inert; scena nuovamente interattiva; focus al titolo. Dopo l’uscita è stata verificata la selezione Projects e il ritorno a Services tramite le frecce.

L’apertura diretta di `#services-content` raggiunge il contenuto dopo la preparazione della scena. La CTA Start è una diramazione distinta: il link `_top` porta fuori dal documento hub, non attiva il viaggio `loop`.

### 14.2 Contratto del bridge

Canale `memento:tide`, versione1, `sessionId` e `stageId`. Il figlio valida `event.source===parent`, l’origin atteso, canale/versione e identificatori. Parent→child INIT: `{embedded:true,scrub:true}`. Child→parent READY: bridgeVersion v014, supportsEnd true, supportsScrub true. VISIBILITY abilita/disabilita l’input; INPUT trasmette delta e boundary start/end; ESCAPE chiede ritorno; SCROLL comunica lo stato di scroll. Il parent valida source/origin/sessione e rifiuta delta non finiti o oltre2400.

Il protocollo superfici è separato: richiesta `memento:services:request-surface`, risposta `memento:services:surface`, version1 e boolean overlayOpen. **Il parent gestisce questo effetto solo per slug services.** Copiare la CSS di un dialog su Start non attiva automaticamente il blur della scena: occorre mantenere o generalizzare esplicitamente questo contratto (P).

Nel ramo scrub corrente, il figlio inoltra input verso l’alto solo a scrollTop≤2 e verso il basso solo quando scrollTop+viewport≥scrollHeight−3. Dialog aperti, editing di campi e contenitori annidati che possono ancora scorrere impediscono il passaggio improprio dell’input. Le vecchie soglie700ms/72px del ramo END legacy non definiscono il comportamento corrente `scrub:true`.

### 14.3 Curva del viaggio: valori riproducibili

`ramp(a,b,t)=smoothstep(clamp((t-a)/(b-a),0,1))`; `pulse(t,a,b,c,d)=ramp(a,b,t)*(1-ramp(c,d,t))`.

| Parametro | Ingresso, p0→1 | Uscita loop, t0→1 |
|---|---|---|
| Panel Y / altezza viewport |1−ramp(.34,.97,p)|−ramp(.02,.56,t)|
| Opacity documento |ramp(.30,.72,p)|1−ramp(.22,.62,t)|
| Caption |1−ramp(.06,.30,p)|ramp(.78,1,t)|
| Edge verticale |pulse(p,.25,.45,.82,1)|pulse(t,0,.12,.72,1)|
| Cloud |pulse(p,.07,.36,.58,.96)|pulse(t,.02,.30,.56,.91)|
| Lens |pulse(p,.12,.42,.55,.91)|pulse(t,.04,.34,.48,.88)|

Edge effettivo=`edge*min(140px,.15VH)`. Maschera del parent: transparent→black a edge, black fino a VH−edge, poi transparent. Si applica durante il passaggio all’intero iframe; a CONTENT edge0. Non deve permanere come fade del footer della pagina.

Camera acqua: altezza6.8, pitch−78°, FOV52°. Ingresso con deviazione laterale .28×sin(pi*smooth(p)). Loop: arco verticale6.4, avanti3.1, laterale.55; ritorna alla posa della stessa scultura. Canvas3D immobile nel layout: si muovono camera e panel. Chromatic massimo5.8px×lens; distortion.014×lens, modulati dall’energia effettiva. Non sostituire con una transizione CSS blur della pagina.

Ingresso su click nominale2.9s; ritorno nominale3.15s. Scroll: distanza `clamp(.95VH,760,1200)`, moltiplicata1.12 nel loop; checkpoint.42, idle.38s, inputOmega6. Il rilascio sceglie il checkpoint e assesta in `1.35+.9*span` secondi, con frenata della velocità. Frame lenti o tab in background possono allungare il tempo reale: non interpretare le costanti come SLA.

## 15. Accessibilità, degradazione e stati particolari

O/C: etichette dei carousel e dei controlli, stato `aria-pressed`, dialog nativo con titolo, ritorno focus, tavole inattive non tabulabili, live region; focus visibile su tile/toggle/CTA. A390 è stata provata anche una navigazione orizzontale con trascinamento mouse, senza apertura accidentale del popup. Questa non sostituisce una prova touch su telefono.

`prefers-reduced-motion`: riduce o elimina animazioni/transition e assesta direttamente i carousel; hub conclude la transizione corrente. `forced-colors`: rimuove maschere e gradienti decorativi, usa colori di sistema e ripristina la scrollbar. Questi rami sono verificati nel codice, non certificati su tutte le piattaforme.

Il target del dot categoria a390 è27,3×44, non44×44. È più piccolo di un obiettivo progettuale44×44; non viene qui dichiarata una violazione WCAG, che richiede valutare criterio applicabile e spaziatura. Contrasto del testo sopra nebbia animata e blur non è certificato da questo audit. Non sono state inviate richieste di contatto.

Nel DOM esiste un dialog legacy `#lead-dialog` con form e preparazione email. Le CTA correnti esaminate dirigono invece a Start con `_top`. Quel form non è stato usato come master visivo approvato per una futura pagina Start; la sua mera presenza nel sorgente non equivale a un percorso corrente verificato.

## 16. Criticità e decisioni da separare dalla replica

| ID / priorità | Evidenza attuale | Impatto | Passo successivo proposto |
|---|---|---|---|
| A1 · alta |19 CSS, molte regole disattivate da patch successive (C) |un master parziale riattiva effetti obsoleti |estrarre componenti/token dalla cascata finale, senza incollare patch storiche |
| A2 · alta |atmosfera z8 passa davanti al testo e al dialog (O/C, E09/E20/E22) |leggibilità variabile nell’hub |definire una zona protetta o attenuare l’atmosfera in CONTENT/modal; è una modifica, non la baseline |
| A3 · alta |Start usa target_top su dominio esterno (O/C) |interrompe il percorso interno del Nav Hub |decidere esplicitamente routing esterno o ingresso nella sezione Start dell’hub |
| A4 · media |foto portrait senza maschera e in contain (O/C, E12/E17) |rettangoli/livelli di nero visibili |armonizzare i neri degli asset o progettare una maschera portrait dedicata, senza reintrodurre vignette globali |
| A5 · media |blur parent collegato solo a services (C) |nuovi dialog di altre pagine possono sembrare diversi |definire un protocollo overlay condiviso e validato |
| A6 · media |dot mobile categoria27,3px di larghezza (O) |precisione richiesta al tocco |valutare hit area maggiore mantenendo il punto visivo5px |
| A7 · verifica |Safari/touch/zoom/testo lungo/contrasto dinamico non collaudati |rimangono rischi di compatibilità |eseguire questa matrice sui dispositivi finali prima di estendere il master |

Punti riusciti da preservare: allineamento comune tra tavole e griglia nei viewport verificati; distinzione chiara tra navigazione verticale e orizzontale; immagini e titolo coordinati sullo stesso stato del carousel; focus e ritorno al contesto del dialog; separazione tra fotografia e maschera; CTA finale riconoscibile senza cambiare linguaggio geometrico.

## 17. Trasferimento alle altre pagine, inclusa Start

**Contratto di portabilità (P, fondato sui valori verificati):**

| Famiglia | Cosa riusare | Cosa richiede una decisione per pagina |
|---|---|---|
| Shell documento |root embedded trasparente, safe area, flusso nativo |routing, eventuale header, protocollo overlay |
| Heading categoria |Inter350, distribuzione caratteri, gradiente verticale, fit |quali titoli hanno davvero funzione di separatore |
| Board editoriale |nero opaco, frame1px, insetP, foto e titolo separati |rapporto mobile, composizione nuovo soggetto, testo |
| Tile |griglia, alpha inferiore, frame su hover/focus |contenuto, numero colonne se cambia il tipo di informazione |
| Dialog |centratura, blur18, X44, focus, chiusura sicura |tavole necessarie, moduli, validazioni |
| CTA |cornici/scultura/stati del componente finale |destinazione link e copy |
| Form Start |font, colori, geometria e focus come base |campi, errori, disabled, successo e tastiera: stati non definiti dalle card |

Non applicare il gradiente a tutti i testi. Non rendere tutte le superfici trasparenti. Non trasformare ogni sezione in una card gigante. Non usare il titolo di categoria come heading di un campo form. Non incorporare la nebbia del parent dentro le immagini del figlio.

Ordine operativo: 1) mappare i componenti della pagina destinataria; 2) assegnare una famiglia; 3) applicare la geometria R1.1 e le rampe del §7.1, conservando gli altri token e asset; 4) definire esplicitamente i componenti nuovi; 5) testare standalone; 6) testare nello stesso hub, con entrata/popup/uscita. Consolidare i CSS è un lavoro successivo: questo audit non distribuisce un foglio “drop-in” che potrebbe cambiare la produzione senza verifica.

### Prompt di implementazione riutilizzabile

> Usa Memento_Visual_DNA.md revisione1.1 come specifica operativa. Le tavole e i JSON restano evidenze1.0: non copiarne le quote superate. Prima di modificare il layout mappa ogni componente ai ruoli del §17. Da768 px: area centrale80%, max1280; tavola desktop/base in rapporto2:1, max1280×640. Fino a767 px: carousel20%/60%/20%, stage a piena larghezza e lati trasparenti; catalogo e CTA mantengono il wrapper mobile del §4.1. Conserva padding internoP e rapporti portrait; ricalcola tutti i ruoli tipografici dipendenti da W. Applica il §7.1 per gradienti smooth/anti-banding, senza alterare palette o alpha strutturale. Mantieni font variabile, tre gradienti distinti, due soli angoli tagliati, frame1px e stati V34. Root embedded trasparente; board nere; tile con alpha; CTA con fondo proprio. Mantieni separati effetti del figlio e atmosfera del parent. Non aggiungere autoplay, zoom/lift, vignette o tracking arbitrario. Per stati non presenti nel riferimento esplicita l’estensione proposta. Verifica i sette viewport della tabella R1.1, tastiera, popup e intero ciclo hub; confronta la geometria con le quote aggiornate del §4.3 e controlla i gradienti sul rendering finale. Non dichiarare completato un match basandoti sul solo screenshot iniziale.

## 18. Criteri di accettazione per la replica

Criteri di verifica per implementare R1.1, **non test già eseguiti**: geometria±1 CSS px sui punti quotati; font/pesi e ancoraggi cromatici esatti, salvo il dither limitato del §7.1; rasterizzazione caratteri ammessa diversa tra sistemi. Per scene WebGL confronto di stati e stratificazione, non diff pixel assoluto. Calcolare con precisione piena e arrotondare soltanto la presentazione delle quote.

| Test | Accettazione |
|---|---|
| Desktop al massimo |a1600: G160 / W1280 / H640 / P56,32; a1920: G320 e stesse dimensioni; card, griglia e CTA allineate |
| Desktop sotto il massimo |a1440: G144 / W1152 / H576 / P50,69; nessun residuo delle vecchie quote1281,6×640,8 |
| Mobile390 |slide G78 / W234 / bundle316,22 / categoria285,37; catalogo Wc323,70 con due colonne; stage390 e lati visibili |
| Mobile360 |slide G72 / W216 / bundle291,89 / categoria263,41; catalogo Wc296 con due colonne; testo e controlli senza sovrapposizioni |
| Tablet |a820 quattro colonne; G82 / W656 / H524,8; ramo portrait attivo |
| Landscape basso |844×390: W675,2 / H337,6; scroll verticale; titolo card39,16; CTA min-height220 |
| Percentuali e safe area |80% è l’occupazione centrale prima del cap; mobile20–60–20 prima del vincolo safe area; non sommare questi margini ai vecchi gutter |
| Root alpha |standalone solo html scuro; embedded html/body/main trasparenti |
| Card |nero opaco; frame continuo1px; nessun fade top/right/bottom della foto desktop |
| Tile |alpha inferiore immagine; testo pienamente leggibile; frame hover completo |
| Gradienti |rampe continue e ancoraggi conformi al §7.1; nessun banding, alone o dither percepibile a zoom100% standalone/embedded; non aggiungere blur globale |
| Font |Inter locale caricata; categoria350/card380/bundle420; glifi non tagliati |
| Hover |nessun lift/zoom del catalogo; CTA cromatica e rim; X90° |
| Carousel |nessun autoplay; verticale nativo; drag non apre per errore; dots e tasti coerenti |
| Dialog |apertura/chiusura/X/Escape; scroll e focus ripristinati; inattivi inert |
| Hub ingresso |INIT/READY, hash CONTENT, y0/opacity1/edge0 |
| Hub overlay |blur figlio18; parent16/brightness.78; rimozione alla chiusura |
| Hub uscita |top inverte ingresso; fondo fa loop alla stessa Services; frecce tornano attive |
| Routing CTA |destinazione e target deliberati; nessuna assunzione di navigazione interna |
| Regressioni |riduzione movimento, forced colors, safe area, testo lungo e viewport bassi verificati |

## 19. Tracciabilità dei materiali

**Revisione1.1:** aggiornato esclusivamente `Memento_Visual_DNA.md`. I materiali elencati sotto, incluse le tavole e il markdown contenuto nello ZIP originale, restano alla1.0. Servono a ricostruire l’audit; per le modifiche richieste usare questa versione separata del markdown. Gli asset smooth e l’applicazione delle nuove quote al sito sono lavoro di implementazione successivo.

- `evidence/01-standalone-bundle.png`–`08-category.png`: componenti desktop e quattro tavole popup.
- `evidence/09-hub-content.png`: stesso componente nel contesto del parent.
- `evidence/10-cta-idle.png`, `11-cta-hover.png`: stati CTA reali.
- `evidence/12-mobile-entry.png`–`17-tablet-bundle.png`: responsive; E13 mostra anche focus tastiera, non lo stato idle.
- `evidence/18-hub-reverse-entry.png`: fotogramma di ritorno dal bordo superiore.
- `evidence/19-hub-scene.png`, `21-hub-exit.png`: scena prima/dopo la lettura.
- `evidence/20-hub-popup.png`: dialog con atmosfera del parent in primo piano.
- `evidence/22-hub-bottom.png`: contenuto quasi al fondo, scroll9045/altezza10050/viewport1000.
- `evidence/23-hub-loop.png`: fotogramma di uscita, non stato di lettura.
- `evidence/24-mobile-hub.png`: contesto embedded a390×844, root trasparente e frame a pieno viewport.
- `evidence/metrics-*.json`: 41 selettori/campione, bounding box, computed styles, variabili e pseudo-elementi.
- `evidence/popup-*.json`: geometria dialog e backdrop1440/390.
- `source/`: sorgenti pubblici effettivamente consultati; non è un export completo del repository o degli asset fotografici.
- `source/manifest.json`: URL origine, SHA-256 e dimensione dei file acquisiti.
- `Memento_Tavole_Tecniche.pdf`: 12 tavole; `tavole/`: corrispondenti PNG.

Fonti principali per argomento: geometria `catalogo-structure.css`, `catalogo-devices.css`, `catalogo-polish-v30.css`, V31/V32; alpha V30/V31/V33/V34; frame V29; CTA `memento-start.css` + `memento-visuals.js`; popup `catalogo-popup.css`, `catalogo-item-masters.css`, `catalogo-bundle-masters.css`; interazione `catalogo-carousel.js`, `catalogo-service-deck.js`, `catalogo.js`; integrazione `catalogo-surface.js`, `tide-child-bridge.js`, `hub-app.js`, `hub-style.css`, `hub-journey.js`, `hub-scroll.js`.

**Regola finale di lettura:** le modifiche R1.1 a geometria e gradienti sono esplicite e prevalgono sui valori storici. Le altre criticità rimangono parte dell’audit del sito corrente: risolverle su Start richiede una decisione successiva e non va confuso con la replica del riferimento.
