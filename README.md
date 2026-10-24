# Memento Start — V02

Pagina contatti responsive, pronta per un progetto statico su Vercel.

## Pubblicazione

1. Estrai lo ZIP. `index.html`, `vercel.json` e la cartella `assets` devono trovarsi nella radice del progetto.
2. Carica il contenuto nel progetto Vercel utilizzato per Start, oppure in un repository collegato a Vercel.
3. Framework Preset: **Other**. Output Directory: **.**. Nessun comando di installazione o build: `vercel.json` contiene già queste impostazioni.

Il pacchetto non richiede Node, npm, React, servizi di immagini o font esterni in produzione. Non è stato pubblicato automaticamente.

## Uso

- Tocca **Email** per aprire il form.
- Su touch/pen, scorri a sinistra nella tavola per aprire il form; scorri a destra nelle aree libere per tornare ai contatti. Il piccolo suggerimento appare solo sui dispositivi touch.
- Campi, link, pulsanti, selezione del testo, gesti a più dita e bordi dello schermo sono esclusi dalla navigazione swipe. Lo scroll verticale e il pinch zoom restano disponibili.
- Nome, email e messaggio sono obbligatori. Il telefono è facoltativo.
- La bozza rimane nei campi passando fra contatti, form e riepilogo. Viene mantenuta nella pagina aperta, non salvata sul dispositivo; ricaricare la pagina può cancellarla.
- **Escape** torna ai contatti. Se un campo ha il focus, il primo Escape lo rilascia. Su dispositivi touch, il tasto Invio dei campi a riga singola passa al campo successivo.
- Il messaggio cresce automaticamente fino a un limite di altezza; oltre quel limite si può scorrere al suo interno.

## Invio email e configurazione

L'invio attuale **prepara un'email nell'app di posta dell'utente**. Non è un backend di invio e non mostra una falsa conferma di ricezione. I messaggi lunghi restano completi nel riepilogo e si possono copiare.

Modifica il blocco JSON `memento-contact-config` in `index.html` per cambiare email, telefono, WhatsApp, Instagram, testo WhatsApp, informativa privacy o visibilità del titolo. I contatti sono quelli del file precedente; non è stata verificata l'abilitazione WhatsApp del numero.

`endpoint` è facoltativo: inserisci un URL HTTPS quando avrai un backend reale. Deve accettare POST JSON e restituire una risposta HTTP 2xx con `{"ok":true}` soltanto dopo aver accettato il messaggio. Non inserire segreti nel frontend. Se l'endpoint è su un dominio diverso, deve consentire le richieste CORS dall'origine della pagina.

Payload: `schemaVersion`, `requestId`, `contact` (`name`, `email`, `phone`, `message`), `source`, `website_hp`. Il backend deve validare i dati, gestire antispam/limiti e deduplicare `requestId`. Errori e timeout mantengono la bozza e offrono l'alternativa email.

## Responsive e accessibilità

- Dimensioni del titolo relative allo spazio disponibile, interlinea completa e larghezza massima su ultrawide.
- Breakpoint del componente a 300, 600, 800 e 1000 px; fallback con media query per browser senza container query.
- Card in due o quattro colonne, form in una o due colonne, padding condiviso fra testo, card e modulo.
- Safe area dei dispositivi con notch, layout specifico per landscape basso e altezza naturale della pagina durante l'apertura della tastiera.
- Campi almeno 16 px, bersagli touch da 44–48 px, stato di focus visibile, etichette e messaggi accessibili.
- Animazioni brevi e rispetto di `prefers-reduced-motion`; colori forzati supportati per il titolo e i controlli.

## Asset e prestazioni

- WebP responsive a 480, 800, 1200 e 1536 px; il browser sceglie con `srcset` e `sizes`.
- Immagine principale prioritaria; immagine del form caricata in modo differito.
- Inter locale, ridotto ai caratteri latini/estesi e ai pesi 370–400 usati dalla UI; gli altri alfabeti usano i font di sistema. L'asse ottico resta variabile.
- Font, CSS, moduli JavaScript e immagini hanno nomi con hash e cache lunga. L'HTML viene rivalidato. Se modifichi manualmente un asset, cambia il suo nome e aggiorna i riferimenti per evitare copie vecchie in cache.
- Nessun framework, tracker, cookie, scroll hijacking o ciclo di animazione continuo.

## Embed

Usa l'URL della pagina pubblicata in un iframe Framer. `showTitle:false` nasconde START se il titolo viene gestito dal contenitore.

Per un'altezza automatica, imposta `parentOrigin` all'origine esatta del sito ospite, per esempio `https://mementostudio.it`. Il frame emette solo `{type:'memento:contact:resize',height}`: il parent deve verificare origine e `event.source` e applicare l'altezza. Senza ricevitore, assegna al frame un'altezza adeguata e consenti lo scroll. Non vengono trasmessi dati del form via postMessage.

## Verifica eseguita

32 controlli in DOM simulato: navigazione touch, esclusione dei campi, multitouch, bordi, annullamento dei gesti, conservazione della bozza, validazione, testo lungo, copia, errori e stato di invio. Le risposte dell'endpoint sono simulate; nessun messaggio reale è stato inviato.

Sintassi JavaScript, parsing CSS, riferimenti degli asset, decodifica WebP, archivio ZIP e dimensioni tipografiche controllati. Il calcolo delle larghezze usa le metriche del font a 17 larghezze rappresentative fra 280 e 3440 px.

Il browser della sessione non accede all'anteprima locale: non è stato possibile effettuare un collaudo visivo o misurare Lighthouse, CLS o frame rate sui dispositivi reali. Prima dell'uso pubblico controlla il risultato nel contenitore Framer e su iOS/Android, compreso il passaggio alle app di posta e WhatsApp.

## Riferimenti e licenza

- [Configurazione Vercel](https://vercel.com/docs/project-configuration/vercel-json)
- [Cache degli asset](https://vercel.com/docs/caching/cache-control-headers)
- Inter: Copyright © 2016 The Inter Project Authors. Licenza SIL Open Font License 1.1 in `OFL-Inter.txt`. Font sottoposto a subset e limitazione dell'asse peso per questa UI.
- Visual delle poltrone: asset generato per il precedente contact form Memento, ricampionato e ottimizzato in WebP.
