# Start — VFX V2, completamento e correzioni 2.1

5 novembre 2026. Base recuperata: `e67244d56c46c15fc68005a215a934db311e13aa`.
Il precedente tentativo V2 era già presente nel repository ma la preview era ancora alla versione 2. Il suo report è conservato in `VFX_V2_PRECEDENTE.md`.

## Risultato

La revisione completa il pass V2 sulla sola pagina Start. HTML dei contenuti, copy, link, font, immagini, CSS di layout, breakpoint e navbar V12 sono invariati rispetto alla base recuperata. Nessuna nuova immagine e nessuna modifica alle altre pagine. Start non contiene lo sparkle della CTA standalone.

- Typo: wire interno più leggibile, celle da 15 CSS px, poche facce e contorno locale. Il pieno resta intatto; nessuna emissione di particelle durante hover.
- Bordi: fascia interna di 8 px, con risposta condivisa nel gutter. Il centro delle foto resta privo di rete in stato stabile.
- Reveal: conservata la maschera reale e reversibile; fronte wire breve e centro utile pieno. Eliminata una seconda maschera globale che attenuava nuovamente il materiale del cursore.
- Fondo: reticolo aperto, neutro, document-anchored; niente emissione continua. Range compatto anche su viewport sotto 600 px.
- Cache: geometrie SVG costruite fuori dal DOM prima dell’inserimento; spigoli del reveal calcolati una volta e riusati; fascia bordo generata senza serializzare la parte interna scartata. Limite celle per superficie ridotto a 1.800 come valore di progetto (il conteggio reale dipende dagli arrotondamenti della griglia).
- Scroll: attraversare una soglia dell’IntersectionObserver non forza più la rilettura del layout intero. Il percorso di prova ha registrato zero letture complete del layout durante lo scroll.
- Resize: corretto il riuso di maschere con dimensioni vecchie per card fuori schermo. Ora vengono invalidate e ricostruite al rientro. Il difetto era visibile nella card legal passando da desktop a mobile.
- FAQ: l’apertura invalida il proprietario interessato, evitando la ricostruzione di tutte le card.

## Verifiche effettive

Ambiente: Chromium 155, Linux remoto, DPR 1. Non è una certificazione browser/dispositivi completa.

| Prova | Evidenza |
|---|---|
| Hero attiva | Frame a scala reale: trama locale dentro S/W e G/E/T, base e occhielli continui; nessun collegamento fra glifi. |
| Gutter desktop | Bordi vicini di più card reagiscono; foto centrali pulite. |
| Scroll giù/su | Campo reversibile, ritorno alla hero; scheduler fermo nello stato stabile. |
| FAQ a 390 px | “E se ho già qualcosa?” apre la risposta corretta. Nessun overflow orizzontale. |
| Desktop → 360 px → fine pagina | Card legal e CTA finali leggibili dopo l’invalidazione delle maschere; nessun overflow. |
| Tablet 768×480 e 1024×900 | Hero leggibile, nessun overflow; `maskMismatches: []`. |
| FX off | Zero maschere inline attive. |
| Cleanup | Zero overlay SVG, zero maschere inline, motore rimosso. |
| Verifiche di codice | Riferimenti locali, ID, accessibilità strutturale, sintassi JS, gradienti, campo, estremi, reversibilità e topologia passano. |
| Confronto base | `git diff` conferma nessuna variazione a contenuti, immagini, font, stile base o navbar. |

La pagina `/qa/` include selettori responsive, punti campione, intro congelabile, percorso cursore, scroll, spegnimento e cleanup. Il campo `maskMismatches` segnala una maschera con dimensioni diverse dalla propria superficie: deve restare vuoto dopo i resize.

## Prestazioni e limiti

Il percorso scroll remoto di 10 secondi ha raccolto 16 chiamate di rendering: lavoro JavaScript mediano 6,9 ms e p95 45,1 ms, 7 costruzioni cache, 0 letture complete di layout. La cadenza rAF mediana osservata era circa 1.016 ms: il browser remoto è fortemente rallentato e questo non è un benchmark a 60 fps. I timer JS non includono rasterizzazione o GPU. Il dato non è un confronto controllato con il pass precedente.

Restano da verificare Safari/WebKit, alto DPR, zoom, preferenze reali reduced-motion/forced-colors, touch/pinch su telefono, hardware desktop con GPU integrata e misure CPU/GPU in primo piano. Il fallback spento è stato verificato; non equivale al test di ogni preferenza di sistema. Nessuna registrazione continua è allegata: i frame osservati non certificano assenza di shimmer su tutti i dispositivi. Non viene dichiarato soddisfatto un budget 60 fps.

## Riproduzione e consegna

- `npm run dev`: server locale, senza installare dipendenze.
- `npm run check` e `npm run check:vfx`: controlli di sorgente e matematica.
- `npm run export`: rigenera `MEMENTO_START_VFX_V2.html` autonomo.
- `/?fx=off`: confronto senza effetti; `/?fxdebug=1`: metriche.
- `/?fxdebug=1&fxpointer=600,500`: punto campione fisso, solo per diagnosi.

Lo ZIP per Vercel include `index.html`, `assets/`, `navigation/`, configurazione statica, sorgenti, QA, documentazione e HTML autonomo. Il dominio Vercel non viene aggiornato automaticamente. La preview privata viene pubblicata sul sito Start VFX esistente mantenendone l’accesso.
