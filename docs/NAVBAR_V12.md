# Memento — Overlay V12 / proporzioni Framer

Box e simboli più piccoli, lettere più distanziate e glow ambra interamente dentro il box. La distanza libera tra due box è il doppio della distanza dei box dal bordo inferiore, misurata al netto della safe area. Fascia mobile identica su desktop e tablet, senza salti ai breakpoint. Il renderer blur replica raggi, maschere e area misurati di nuovo nel riferimento Framer.

## Perché su Start non si vedeva

Nel Chrome del confronto è attiva la preferenza **Riduci trasparenza**. La versione installata su Start applicava `.veil { display:none }`: entrambi i blur avevano dimensioni 0 × 0. Aumentare il raggio non poteva risolvere il problema. Framer, nella stessa sessione, continuava a mostrare il proprio blur.

La V12 resta visibile con questa preferenza, come il riferimento richiesto. Non cambia alcuna impostazione del browser o del sistema operativo. Mantiene il rispetto di movimento ridotto e colori ad alto contrasto. Se desideri esplicitamente seguire la preferenza di trasparenza del sistema, puoi aggiungere l’attributo `respect-system-transparency` a `memento-nav`; `blur="off"` permette invece di spegnerlo direttamente.

## Installazione su Start e sulle altre pagine

1. Sostituisci **tutta la cartella `navigation/`** con quella di questo ZIP. Non sovrapporre altre patch del blur.
2. Mantieni **un solo bootstrap** e usa lo snippet della pagina, presente in `integration/`. La query `v=12.0.0` evita di riusare i moduli della versione precedente.
3. Ricarica la pagina dopo l’aggiornamento. Rimuovi eventuali vecchi elementi Framer che duplicano logo, navbar e blur.

Snippet per Start, prima di `</body>`:

```html
<script defer src="/navigation/bootstrap.js?v=12.0.0"
  data-memento-page="start"
  data-memento-hub="https://mementostudio.it"></script>
```

| Pagina | `data-memento-page` |
|---|---|
| Studio | `memento` |
| Services | `services` |
| Projects | `projects` |
| LevelUp | `levelup` |
| Start | `start` |

Per HTML statico copia `navigation/` accanto a `index.html`; per Vite/React/Next.js usa `public/navigation/`. Usa una sola dichiarazione viewport con `viewport-fit=cover` per le safe area.

Il rendering è nuovo; il bridge di navigazione rimane compatibile con il protocollo V2. Nell’hub, dopo l’handshake, il figlio nasconde il proprio overlay per lasciare visibile quello del contenitore. Se usi ancora Framer come contenitore esterno, togli gli overlay Framer quando installi quello nuovo nel contenitore: un iframe non può rimuoverli al posto tuo.

## Installazione nell’hub

L’hub esistente importa già `mountNav` da `navigation/navbar.mjs`: sostituisci la cartella, **senza aggiungere un secondo bootstrap**.

La patch inclusa assicura che il logo apra la home e le icone aprano direttamente le pagine:

```bash
node integration/patch-hub.mjs /percorso/del/progetto-hub
```

Riconosce l’handler V2, quello V3/V4 e la correzione V5/V6. Se la correzione è già presente non modifica nulla. Crea un backup prima di scrivere e si ferma su un controller sconosciuto. Non pubblica e non copia la cartella al tuo posto.

## Cosa viene replicato

Otto livelli nativi CSS per ciascun bordo, con raggi **0,0546875 → 7 px**, maschere sovrapposte a intervalli del 12,5% e area pari al 20% della viewport. Il bordo superiore è ruotato di 180°. Sono gli stessi valori e la stessa struttura misurati nel riferimento Framer.

Non ci sono gradienti neri colorati, maschere SVG con rumore o un solo blur enorme sfumato in opacità. Il fondo resta trasparente; si sfoca il contenuto reale che passa sotto. Su un fondo perfettamente uniforme il blur non produce un cambiamento visibile: usa immagini o testo per valutarlo.

Il contenitore viene montato direttamente sotto `body`, con opacity 1 e senza filtro o maschera sul contenitore esterno, per non interrompere il campionamento dello sfondo.

## Navbar e logo

- Fascia da 320 px per logo e navbar a tutte le larghezze: nessuna media query cambia le dimensioni al passaggio mobile/tablet/desktop. Le distanze tra i cinque box restano uguali.
- Eccezione per schermi molto stretti: larghezza limitata alla viewport meno 40 px, così a 320 px restano 20 px per lato. Framer in questa misura arriva invece a filo bordo.
- Le sette lettere usano i tracciati dell’SVG originale. Altezza costante 11 px, proporzioni inalterate e fascia allineata ai bordi esterni dei box. Le lettere più piccole lasciano più spazio tra loro. Disegno visibile a 19 px dall’alto; eventuale safe area rispettata.
- Box 40 × 40 px, raggio 10 px, simboli in SVG da 34 px, bordo neutro. Con fascia da 320 px: 30 px liberi tra i box e 15 px dal basso, più eventuale safe area. Area cliccabile 48 × 48 px. Su viewport da 320 px: fascia da 280 px, spaziatura 20 px e distanza inferiore 10 px; rapporto sempre 2:1.
- Memento usa esattamente il path e il poligono dell’SVG allegato. Facce triangolari, riflessi argento e ombre carbone sono ritagliati dentro la sagoma originale: cambia la finitura, non la shape. La luce ambra sale dal basso nello stato attivo.
- Projects è stato rigenerato quasi frontale, con base piena e senza vuoto in basso a sinistra. Services, LevelUp e Start mantengono i render V10. Inquadrature e luminosità sono calibrate per ogni soggetto: tutte le sagome terminano a circa 6,4 px dalla base del box; varia la scala per bilanciare forme piene e aperte.
- Inattive monocromatiche; hover al 25% di colore, senza testo. Attiva illuminata dal basso con glow morbido ritagliato interamente dentro gli angoli arrotondati; nessuna luce esterna, bordo ambra o dot. Sui dispositivi touch l’hover non viene applicato.
- Le etichette per le tecnologie assistive, i tasti freccia e il focus da tastiera restano disponibili.

| Elemento | URL |
|---|---|
| Logo in alto | https://mementostudio.it/ |
| Memento | https://mementostudio.it/studio |
| Services | https://mementostudio.it/services |
| Projects | https://mementostudio.it/projects |
| LevelUp | https://mementostudio.it/levelup |
| Start | https://mementostudio.it/start |

Gli URL sono pubblici anche quando la pagina viene aperta su Vercel. Le URL Vercel degli iframe in `STATIONS.url` restano separate per evitare ricorsioni.

## Anteprima e controlli

Apri `ANTEPRIMA.html` e usa **Controlli**: Soggetti, Icone, Testo, Griglia e Fondo uniforme funzionano offline. Nella preview online si apre Servizi live, con la tab Services attiva e il pannello chiuso; la pagina sottostante usa lo stesso fondo nero del riferimento Framer. I pulsanti Start live e Servizi live richiedono Internet. In Start live, solo nella demo, il vecchio logo e la vecchia navbar sono esclusi dall’inquadratura per osservare il nuovo overlay senza doppioni.

Il pulsante **Blur attivo / Blur disattivo** permette il confronto. **Verifica componente** controlla nel browser che i filtri siano realmente visibili, gli URL corretti e i box allineati. Nella demo il click sulle icone simula lo stato; nell’installazione apre la destinazione.

`preview/`, `tests/` e `ANTEPRIMA.html` servono alla revisione e non devono essere aggiunti alle pagine pubblicate. I file da integrare sono `navigation/` e lo snippet della pagina.

Verifiche sorgenti: `node tests/verify.mjs` con Node.js. Nessuna dipendenza da installare. Per rigenerare l’anteprima: `node build-preview.mjs`.

## Regolazioni opzionali

La V12 conserva il blur Framer e le misure mobile su ogni viewport. Evita di reinserire le vecchie variabili `--memento-blur-radius` e `--memento-blur-height`: non vengono usate dal nuovo renderer.

```css
memento-nav {
  --memento-overlay-width: 320px;
  --memento-overlay-gutter: 20px;
  --memento-overlay-logo-height: 11px;
}
```

Il componente non aggiunge padding a `body`. Se serve spazio per l’ultimo contenuto, applica `data-memento-content-insets` al solo contenitore dei contenuti, mantenendo lo sfondo a tutta altezza.

Questa consegna non aggiorna automaticamente i deploy di Start o delle altre pagine.

La vecchia variabile `--memento-overlay-mobile-width` non è più usata. Se avevi impostato `--memento-overlay-width: 400px` nel tuo progetto, rimuovi quell’override oppure portalo a `320px`. Per le nuove immagini sostituisci anche `navigation/assets/`.

La distanza inferiore si calcola dalla larghezza della fascia: `(fascia − 5 × 40 px) / 8`. La vecchia variabile `--memento-overlay-bottom` non è più usata. La safe area viene aggiunta al margine calcolato. Le sagome hanno un ulteriore margine interno comune di circa 6,4 px dalla base del box.
