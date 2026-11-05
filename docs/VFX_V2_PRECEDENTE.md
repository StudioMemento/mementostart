# Start — VFX Pass V2: revisione visiva e verifica

Data: 5 novembre 2026. Base: commit `71953ac700d64b4a59575299118b4fe80af76b71`, Start VFX V1. Specifica di revisione: `MEMENTO_VFX_MASTER_DIRECTION_V2(1).md` fornita dal committente.

Questo report distingue modifiche implementate, contesti osservati e controlli ancora aperti. Non è una certificazione completa della matrice V2 né una dichiarazione di conformità a tutti i criteri P0/P1. `VFX_V1_VERIFICA.md` descrive esclusivamente la consegna precedente.

## Correzioni implementate

| Riscontro / ID | Intervento V2 | Risultato da verificare sulla scena reale |
| --- | --- | --- |
| O01, T01–T04 | Wire interno con contrasto rame, poche facce e contorno sottile; alone ridotto e breve. La copertura e la geometria del testo base non cambiano. | Materia distinguibile fra S/W e G/E/T senza neon, buchi o glifi ispessiti. |
| O02, R05–R06 | Soglie fill meno disperse, fase wire ristretta e attenuazione del fronte separata dal reveal. Parametro del fronte: 38 px desktop / 24 px mobile. | Immagini e lettura prevalgono; il reticolo non occupa tutta la fascia visibile. |
| B02–B03 | Fascia interna da 8 px sulle card, geometria irregolare non ripetuta; segmenti triangolari condivisi deduplicati. | Bordo aderente, senza ritmo da cerniera o incroci artificialmente più luminosi. |
| B01, B07 | Conservato il campo di prossimità comune. | Segmenti vicini di più card reagiscono nel gutter; i lati lontani rimangono neutri. |
| R08–R09, F06 | Progresso spaziale deterministico e cache dei frammenti per superficie. | Pausa, ritorno e solo movimento del mouse non cambiano arbitrariamente il risultato dello scroll. |
| A01–A09 | Nuovo reticolo aperto, neutro, continuo fra margini e layout; accento locale e micro-tensione sul solo fondo. | Nessuna lastra piena o disco luminoso; rete subordinata a testo e immagini. |
| R12, A12 | Ambiente dietro il DOM opaco; occlusione attraverso le maschere reali. Esclusioni esplicite per superfici con ambiente proprio. | Nessun box nero residuo e nessun doppio ambiente sulle superfici escluse. |

L’intervento riguarda Start. Non modifica le altre preview citate dal documento unificato. Conserva DOM dei contenuti, font, immagini, collegamenti, padding, breakpoint e navbar V12. Nessuno sparkle è presente o rimodellato in questa pagina.

## Preset e compositing

| Voce | Valore corrente |
| --- | --- |
| Campo desktop / touch / navbar | 260 / 130 / 110 CSS px |
| Follow / attacco / rilascio | 70 / 120 / 380 ms |
| Intro / handoff verso scroll | 1.050 / 100 ms |
| Fasce scroll superiore / inferiore | 1,5–13% / 86–100% |
| Guadagno uscita | 0,55 rispetto all’ingresso |
| Celle reveal desktop / mobile | 26 / 20 px, con limite di complessità per superficie |
| Attenuazione fronte wire desktop / mobile | Parametro 38 / 24 px; caduta morbida, non taglio rettangolare |
| Particelle globali massime desktop / mobile | 48 / 20 |
| Particelle ambiente | 0; nessun emettitore |
| Nodi ambiente massimi desktop / mobile | 420 / 160 |
| Segmenti ambiente massimi desktop / mobile | 1.100 / 400 |
| Micro-tensione ambiente desktop / mobile | 1,5 / 0,75 px |
| DPR del solo canvas ambiente | Massimo 1,5 |

Lo scheduler è unico. Il coordinatore aggiorna due superfici SVG per contenuto e navbar e un canvas trasparente per l’ambiente; il modulo ambiente non installa loop o listener propri. La topologia del fondo è ancorata a righe e colonne nello spazio del documento, con seed stabili. Il guadagno scende gradualmente verso il layout. Il fondo cede le aree marcate con `data-mm-environment-owner`, `data-environment="own"` o `data-mm-environment="off"`.

File principali: `assets/vfx/config.js`, `math.js`, `engine.js`, `environment.js`, `vfx.css` e `boot.js`. Le maschere restano enhancements: il documento è leggibile senza gli effetti.

## Evidenze disponibili

Ambiente osservato: Chrome 155 su Linux remoto, DPR 1. Sono state esaminate viste desktop a 1440 e 1024 CSS px con hero, gutter, centro fotografia e fotogrammi dell’intro. Sono stati acquisiti screenshot di questi contesti e sei frame del load.

| Controllo V2 eseguito | Evidenza osservata |
| --- | --- |
| FAQ a 390 px | Invio apre “E se ho già qualcosa?”; il DOM nativo mostra la risposta corretta. |
| Footer a 360 px | Il contenuto finale torna pieno al limite inferiore dello scroll. |
| Viewport bassa 768×480 | Hero leggibile nella vista esaminata. |
| FX off | Zero maschere attive. |
| Cleanup | Zero superfici SVG, zero maschere, zero canvas ambiente; opacità del main pari a 1. |

Questi risultati documentano i contesti effettivamente provati; non estendono automaticamente la verifica a ogni voce Q01–Q18 della specifica.

Le immagini documentano stati statici a scala di pagina. Non è disponibile in questa verifica una registrazione continua di hover/rilascio/scroll: gli screenshot non certificano assenza di shimmer, continuità del movimento o frame mancati. I frame V1 presenti nello storico non devono essere scambiati per evidenze V2.

## Prestazioni: criterio ancora aperto

I timer del motore misurano il lavoro JavaScript nelle chiamate effettivamente eseguite. Non misurano il tempo GPU né l’intero frame di rendering. I percentili seguenti non sono un confronto controllato FX off/on e non vanno interpretati come costo aggiuntivo del pass.

| Campione remoto V2 | Campioni | Lavoro JS mediano | Lavoro JS p95 | Altri dati |
| --- | ---: | ---: | ---: | --- |
| Percorso cursore | 23 | 4,1 ms | 78,0 ms | Intervallo rAF mediano circa 1.016 ms. |
| Scroll | 13 | 43,0 ms | 414,5 ms | 10 costruzioni cache, 152 letture di box, 456 scritture di maschere; rAF mediano 1.016,4 ms, p95 1.283,1 ms. |

La cadenza del browser remoto mostra forte throttling. Questo limita l’interpretazione del movimento e il numero di campioni, ma non annulla i picchi di lavoro JavaScript osservati. Il budget prestazionale di produzione non è dimostrato e non risulta soddisfatto da questi campioni: la costruzione della cache e lo scroll richiedono profiling in primo piano prima di dichiarare fluidità a 60 fps. Non vengono riportate stime GPU né percentuali di frame mancati ricavate da questo ambiente.

## Controlli ancora da completare

- Browser Safari/WebKit, eventuale Firefox e alto DPR.
- Desktop fisico con GPU integrata e telefono rappresentativo; CPU/GPU e frame time attendibili.
- Touch, cancel, pan e pinch reali; drag della mappa.
- Zoom, ingrandimento del testo, viewport bassa/orizzontale e tastiera mobile.
- Cambio effettivo delle preferenze di sistema reduced-motion/forced-colors.
- Registrazione continua per hover, rilascio, scroll lento/rapido, inversione e interazioni concorrenti.

Il fallback viene mantenuto nel codice: reduced motion rende pieni i contenuti e statico il fondo; FX off e forced colors rimuovono maschere ed effetti. Una prova tramite API verifica il ramo di spegnimento ma non equivale all’emulazione della preferenza di sistema.

## Riproduzione e distribuzione

Avviare `npm run dev` e aprire `/qa/`. Confrontare gli stessi contenuti con FX off/on; usare le viste hero, gutter e fotografia, quindi fotogrammi intro, scroll, FAQ, fine pagina e cleanup. `/?fxdebug=1` espone le metriche; `/?fx=off` ripristina il contenuto senza pass. I controlli pubblici della pagina non includono questa UI tecnica.

`npm run check` controlla riferimenti, asset, sintassi e gradienti; `npm run check:vfx` controlla proprietà del campo e della triangolazione; `npm run export` ricrea `MEMENTO_START_VFX_V2.html`. I risultati dei comandi e della matrice responsive vanno associati allo stato finale del sorgente; non certificano da soli la fedeltà visiva.

La consegna prevista comprende preview privata e `MEMENTO_START_VFX_V2_VERCEL.zip`. Il pacchetto è predisposto per aggiornare Vercel; questa revisione non aggiorna automaticamente il dominio Vercel di produzione.
