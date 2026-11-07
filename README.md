# Memento START — V11 / VFX Calibrated

Correzione della V10 basata sulle tavole Ambra V2 e sulla regola della tab attiva V4. Il markup, le dodici immagini lowpoly, i contatti, la mappa, le FAQ e la navbar sono preservati.

- Typo: facce ambra e reticolo dentro i glifi, risposta locale al cursore e al fronte di reveal.
- Tab: rete fine al perimetro e leggibile anche nel nucleo; bordo illuminato soltanto vicino al campo.
- Coordinate: larghezza reale del canvas in CSS pixel, senza errore della scrollbar; aggiornamento anche quando un dialogo cambia la larghezza disponibile.
- Background: topologia irregolare stabile, facce carbone tenui, linee e luce ambra locale. Nessuna scia curva disegnata.
- Scroll: fronte ampio, costruzione e distruzione reversibili, centro di lettura completo. La copertura dipende dalla posizione, le emissioni si esauriscono separatamente.
- Colore: immagine della tab attiva all’80% di saturazione; un secondo pass decorativo porta al 100% la zona raggiunta dal campo. Il resto della tab mantiene i propri FX. Le tab vicine non si colorano per sola prossimità.
- Input: mouse, penna e touch, impulso al rilascio e cancellazione senza impulso duplicato; fallback leggibile e reduced motion.

## Parametri principali

I valori sono in `assets/vfx.js`, oggetto `CONFIG`: range mouse 370 CSS px, touch 220 CSS px, fascia scroll 20% del viewport. Sono parametri di questa implementazione, non misure estratte dalle tavole.

## Informazioni privacy e cookie

I pannelli locali descrivono il comportamento effettivo della pagina e consentono di richiedere le informative complete. **Non sostituiscono una privacy policy o cookie policy completa.** Non sono stati inventati dati del titolare, basi giuridiche, tempi di conservazione o altri elementi non forniti.

Quando disponibili, inserire gli URL HTTPS ufficiali in `privacyUrl`, `cookiePolicyUrl` e `legalUrl` dentro `assets/config.js`. Lasciarli vuoti mantiene i pannelli locali. Le preferenze mappa valgono per la visita corrente; non costituiscono una piattaforma di gestione del consenso dell’intero sito Framer.

## Deploy Vercel

Estrarre lo ZIP e usare come radice la cartella che contiene `index.html`.

| Impostazione | Valore |
| --- | --- |
| Framework preset | Other |
| Install command | Vuoto |
| Build command | Vuoto |
| Output directory | `.` |
| Entry point | `index.html` |

`vercel.json` è incluso. Il pacchetto è statico e non richiede dipendenze da installare. La consegna dello ZIP non aggiorna automaticamente il dominio pubblico.

`MEMENTO_START_V11_VFX_CALIBRATED.html` è l’export autonomo con CSS, JavaScript, font e immagini incorporati. Google Maps e i collegamenti esterni richiedono Internet. Per il deploy usare preferibilmente la struttura completa dello ZIP.

## Sviluppo e verifiche

Usare Node.js 20 o successivo.

```sh
npm run dev -- --port 4173
npm run check
npm run verify
npm run export
npm run build
```

- `check`: asset locali, ID, riferimenti accessibili, sintassi JavaScript e configurazione statica.
- `verify`: preservazione del contenuto, regressioni dei collegamenti, invarianti geometriche, integrità e dimensioni reali dei nuovi WebP, export autonomo.
- `export`: rigenera `MEMENTO_START_V11_VFX_CALIBRATED.html`.
- `build`: crea `dist/` per un hosting statico o una preview.

La verifica di preservazione ammette solo le dodici sostituzioni immagini e la destinazione della CTA nel blocco semantico principale. Font e moduli navbar sono confrontati con la base; le quattro modifiche di stile della navbar per il monocromo sono normalizzate esplicitamente. Le immagini precedenti non devono essere presenti nel pacchetto finale.

## File principali

| File | Ruolo |
| --- | --- |
| `index.html` | Struttura semantica, contenuti e associazione dei nuovi asset |
| `assets/polish.css` | Direzione monocroma e correzioni visive |
| `assets/vfx.js` | Motore, input, background fisso, reveal e lifecycle |
| `assets/vfx-math.js` | Geometria, campo e calcolo della copertura |
| `assets/vfx.css` | Composizione dei layer e risposte di immagini, glifi e icone |
| `assets/start.js` | Contatti, FAQ, mappa e pannelli informativi |
| `assets/config.js` | Dati pubblici dello studio e destinazioni |
| `assets/lowpoly/` | Dodici nuovi WebP e manifest |

API diagnostica: `window.MementoStartVFX.getMetrics()`, `.invalidateLayout()`, `.setEnabled(false)`, `.setEnabled(true)` e `.dispose()`. La disattivazione lascia i contenuti leggibili. Evitare un secondo bootstrap navbar o motore nello stesso documento.

## Verifica e limiti

`QA_V11.md` contiene i risultati di questa revisione. I report V7–V10 sono storico. I controlli comprendono preservazione dei contenuti, geometria deterministica, driver di reveal effettivamente utilizzato, pacchetto statico e interazioni nel browser.

Una viewport mobile e Pointer Events sintetici non equivalgono a una prova fisica su iPhone o Android. Non è certificato un frame rate di 60 fps; la cadenza del browser remoto non è una misura affidabile delle prestazioni su dispositivo. Verificare il wrapper Framer finale: preferire iframe a viewport intero con scroll interno. Il pacchetto non aggiorna automaticamente il dominio pubblico.
