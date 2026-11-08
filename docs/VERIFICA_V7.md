# Start V7 — Verifica dell’integrazione

6 novembre 2026. Base: `V6 (5)(2).zip`, Start V6 revisione 6.5.0. Overlay: kit 12.0.0 da `O V E R L A Y(3).zip`.

## Confronto dei sorgenti

Tutti i file di `navigation/` sono identici al kit allegato. Tutti gli asset della pagina sono identici alla base, salvo il nome della variabile e il commento in `navigation-insets.css`; valori CSS equivalenti. `index.html` cambia solo nella query `?v=12.0.0` del bootstrap. Le animazioni leggere originali in `motion.js` sono preservate. Nessuna cartella, bootstrap o motore VFX è presente.

## Controlli eseguiti

- `npm run check`: asset, ID, riferimenti accessibili, sintassi JavaScript, gradienti e configurazione statica superati.
- `npm run export`: HTML autonomo generato.
- I 24 controlli originali del kit V12 sono passati, inclusi tracciati del logo, blur, URL e protocollo del bridge.
- HTML autonomo: cinque script eseguibili validati sintatticamente; nessun riferimento locale residuo per asset o bootstrap; nessun motore VFX.

## Browser

Chromium: pagina principale a 1363 × 936 px e iframe di prova da 320, 390, 768, 1024 e 1280 px di larghezza. Nei viewport desktop lo spazio utile è ridotto dalla scrollbar nativa.

| Controllo | Esito |
|---|---|
| Overlay singolo, versione 12.0.0, Start attiva | Confermato |
| Logo e navbar allineati | Confermati visivamente su mobile e desktop |
| Box da 40 × 40 px | Confermati ai breakpoint controllati |
| Blur superiore e inferiore | 16 livelli presenti; blur visibile sul contenuto sotto la navbar |
| Overflow orizzontale della pagina | Assente ai breakpoint controllati |
| Hero, email, titoli canale e CTA finale | Nessun overflow nei testi controllati |
| FAQ “Costi e tempi?” | Apertura riuscita, risposta corretta, domanda precedente chiusa |
| Tastiera nella navbar | Freccia sinistra da Start porta il focus a LevelUp |
| Dialog privacy | Apertura e chiusura riuscite |
| URL della navigazione | Corrispondenti alle sei destinazioni pubbliche del kit |
| Fallback iframe senza handshake | Overlay standalone visibile |

Nessuna comunicazione inviata. La verifica mobile riguarda le dimensioni responsive, non dispositivi fisici. Il bridge è coperto dai controlli sorgente del kit; non è stato collaudato nell’hub pubblico.

Il browser ha verificato i sorgenti separati. L’HTML autonomo è stato generato e validato sintatticamente; la sua apertura non è stata completata perché la preview condivisa è passata a un altro progetto durante il controllo. Il file locale è presente. Il dominio Vercel non è stato pubblicato o modificato.
