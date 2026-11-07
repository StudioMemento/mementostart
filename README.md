# Memento START — V9 / VFX R4

Integrazione dell’handoff R4 sulla Start V8 con navbar overlay V12.1.0. HTML principale, copy, contatti, immagini, font e navigazione originali sono conservati.

## Cosa cambia

- Fondo con triangolazione irregolare monocroma e ambra locale.
- Rete indipendente su ogni card: minuta sul bordo, attenuata al centro; glow vicino all’interazione.
- Micro-reticolo dentro etichette e icone, con propagazione breve nel testo. Titoli secondari.
- Asset originale a colori soltanto sulla card in hover, touch o focus.
- Impulso lungo i legami al touch up; nessun impulso su pointercancel.
- Loading e scroll con maschere triangolari sul contenuto reale, reversibili.
- Un motore, due canvas decorativi, pool condiviso, movimento ridotto e fallback leggibile.

## Vercel

Estrarre lo ZIP e usare come radice la cartella con `index.html`.

| Impostazione | Valore |
| --- | --- |
| Framework | Other |
| Install command | Vuoto |
| Build command | Vuoto |
| Output directory | `.` |
| Entry point | `index.html` |

`vercel.json` è già configurato. Il pacchetto non modifica automaticamente il dominio Memento.

`MEMENTO_START_V9_VFX_R4.html` è la versione autonoma con CSS, JavaScript, font e immagini incorporati, utile anche per l’embed. Google Maps e le destinazioni esterne richiedono Internet. Per il deploy usare la struttura completa.

## Sviluppo

Nessuna dipendenza da installare.

```sh
npm run dev
npm run verify
npm run export
```

`assets/vfx.js` contiene configurazione e lifecycle; `assets/vfx-math.js` geometria e driver; `assets/vfx.css` compone le texture nei glifi originali. `assets/motion.js` mantiene il solo adattamento tipografico, perché il nuovo motore possiede il reveal. I dati dello studio restano in `assets/config.js`.

Non aggiungere un secondo bootstrap navbar o un secondo motore nello stesso documento. Il rendering va nel documento dei contenuti, anche in embed.

API: `window.MementoStartVFX.dispose()`, `.setEnabled(false)`, `.setEnabled(true)`, `.invalidateLayout()` e `.getMetrics()`. La disattivazione rimuove le maschere e lascia il contenuto leggibile. La pagina di produzione non contiene UI diagnostica.

## Verifica

`docs/VERIFICA_V9_R4.md` descrive risultati, limiti e differenze intenzionali. `docs/verification/` contiene tracce JSON del browser. Le tracce documentano stati e controlli; non sono screencast.

Il target di 60 fps e il comportamento su dispositivi fisici iOS/Android richiedono prove su quei dispositivi. Non sono certificati da questa sessione.

Documenti V7/V8 e precedenti conservati come storico. Licenze Inter e Tabler conservate.
