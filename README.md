# Memento START — V6 · revisione 6.6 — Overlay V7 Clean

Pagina HTML/CSS/JavaScript statica, coerente con il Master Visual DNA 1.1. Font Inter Variable, immagini WebP e icone Tabler sono locali. Nessuna dipendenza runtime da installare.

## File

Lo ZIP `V6.zip` contiene l’HTML autonomo e i sorgenti separati qui descritti.

- **MEMENTO_START_V6.html**: HTML autonomo con CSS, script, font, icone e immagini incorporati. Aprire nel browser. Google Maps e destinazioni esterne richiedono una connessione.
- **V6.zip**: sorgenti separati, configurazione e documentazione. Estrarre lo ZIP e usare `npm run dev` per la preview locale sulla porta 4173. Non serve `npm install`.

## Contatto diretto

Il form, la preparazione della bozza e il codice dell’endpoint sono stati rimossi. Dopo LET’S WORK / TOGETHER ci sono due card, affiancate su desktop e impilate su mobile:

- `mementoxdesign@gmail.com`
- `info@mementostudio.it`

Ogni card apre direttamente l’app di posta tramite `mailto:`. L’invio avviene nell’app scelta dall’utente. Le quattro card successive mostrano il numero **+39 328 545 4661**, WhatsApp, Instagram e Fiverr. Icona sopra al testo, contenuto in basso a sinistra e padding identico su tutte le sei card.

Le immagini hanno un gradient blur nella parte inferiore: tre bande di blur progressivo (1/3/7 px) e sfumatura scura proteggono il copy. A riposo sono in bianco e nero con overlay nero uniforme al 50%; hover e focus ripristinano colore e luminosità originali, rimuovendo l’overlay uniforme. Il trattamento inferiore di leggibilità resta attivo. Il chevron diagonale in alto a destra è bianco a riposo e ambra su hover/focus. Restano il bordo evidenziato, il colore ambra del titolo e il movimento minimo del chevron. Nessuno zoom dell’immagine.

## Struttura e interazioni

- Titolo LET’S WORK / TOGETHER su due righe: un solo gradiente verticale del DNA attraversa l’intero titolo, ambra in basso e bianco in alto. LET’S WORK resta quasi bianco. Ingresso in dissolvenza e messa a fuoco.
- Un pannello FAQ con titolo in alto a sinistra, prima domanda aperta, separatori in dissolvenza e immagine a destra con un solo soggetto su fondo nero puro: quattro soggetti riconoscibili in carbone con particelle e scie ambra: lampadina, cartella progetto, clessidra e dialogo. Le immagini cambiano insieme alla domanda aperta. Altezza minima 640 px desktop / 620 px mobile: tutte le risposte attuali rientrano senza cambiare altezza.
- Click, tap, Invio o Spazio aprono una domanda alla volta. Frecce/Home/End spostano il focus; Escape chiude. I `details` nativi funzionano anche senza JavaScript.
- SIAMO QUI: griglia desktop con mappa **3×2** e due card **1×1** sulla destra. La prima contiene icona location e **Piazza Trento 12 / 33085 Maniago (PN)**; la seconda icona orologio e **Lunedì — Venerdì / 14:00 — 18:00**.
- Su mobile la mappa occupa tutta la larghezza sopra le due card informative affiancate. Google Maps resta scura e monocromatica a riposo; su hover/focus riemerge il colore negli elementi della mappa, mantenendo scuro lo sfondo, full bleed nel proprio box. È incorporata la scheda ufficiale Studio Memento, con valutazione e link nativi alle recensioni quando disponibili nel layout Google. L’indirizzo apre esattamente il link fornito dallo studio. Le due card informative hanno immagini dedicate: pin di posizione e orologio, con bordi parzialmente dissolti in particelle, con gradient blur inferiore. Il pin è una rappresentazione concettuale della posizione. Controlli, logo, attribuzioni e link legali sono visibili e utilizzabili, senza overlay. L’angolo inferiore destro della mappa è rettangolare per non tagliare i crediti Google. L’indirizzo apre Maps anche con l’embed disattivato.
- Privacy & legal è senza immagini: titolo in alto, un gruppo Privacy e cookie con policy e preferenze, un gruppo Studio con nome, email e dati. Le informazioni non sono duplicate in una firma separata.
- CONTINUA IL VIAGGIO! occupa una sola riga e usa la sfumatura del DNA: ambra in basso, bianco in alto. Chevron geometrico non deformato.
- Le card appaiono in fade. Movimento ridotto e colori forzati gestiti dal CSS. La pagina non contiene nebbia.

## Configurazione

Modificare `assets/config.js`. Nell’HTML autonomo cercare `window.MEMENTO_CONFIG`.

| Campo | Valore / comportamento |
|---|---|
| `projectEmail` | mementoxdesign@gmail.com |
| `email` | info@mementostudio.it |
| `phone`, `whatsapp` | +39 328 545 4661, ereditato dalla versione precedente |
| `instagramUrl` | https://www.instagram.com/mementostudio.it/ |
| `fiverrUrl` | https://www.fiverr.com/studio_memento |
| `privacyUrl`, `cookiePolicyUrl`, `legalUrl` | Da collegare ai documenti definitivi. I dialog attuali consentono di richiederli via email. |
| `mapsUrl`, `mapsEmbedUrl` | Link della scheda Studio Memento e iframe ottenuto da Google Maps → Condividi → Incorpora una mappa. |
| `hubUrl` | https://mementonav.vercel.app/#start |

## Integrazione nel Nav Hub

La pagina mantiene la trasparenza nell’hub; la versione standalone ha un canvas uniforme `#121212`, equivalente allo sfondo precedente in Chromium.

Overlay **7.0.0 Clean** integrato integralmente dal kit allegato: otto livelli nativi CSS per bordo, con raggi da 0,0546875 a 7 px e area pari al 20% della viewport. Maschere CSS sovrapposte sfocano il contenuto reale; il fondo resta trasparente. Le vecchie fasce della V6 e il relativo modulo sono rimossi.

Il blur resta visibile anche con **Riduci trasparenza** attivo, come previsto dal kit V7. L’attributo opzionale `respect-system-transparency` ripristina il rispetto automatico della preferenza; `blur="off"` spegne direttamente l’effetto. Movimento ridotto e colori ad alto contrasto mantengono i comportamenti previsti dal kit. Gli spazi iniziale e finale della pagina restano quelli della revisione precedente e non modificano il renderer.
Le icone sono 34 px su desktop e 32 px su mobile, dentro box da 44 px e aree cliccabili da 48 px. Logo e navbar condividono la stessa larghezza: massimo 400 px, 80% del viewport sui dispositivi stretti. I bordi esterni del primo e dell’ultimo box coincidono con quelli del logo. **Start resta attivo** con bagliore ambra; le altre voci sono monocromatiche. Nessun dot.

Bootstrap unico `/navigation/bootstrap.js?v=7.0.0` con `data-memento-page="start"` e `data-memento-hub="https://mementostudio.it"`. Home e pagine usano i link pubblici `/`, `/studio`, `/services`, `/projects`, `/levelup`, `/start`. Il bridge mantiene il protocollo `memento:navigation` versione **2**, compresa la compatibilità con `mementonav.vercel.app`.

In standalone l’overlay è visibile; nell’hub, dopo l’handshake, rimane soltanto quello del parent. In un iframe senza handshake compare dopo 1,2 secondi. La cartella `navigation/` contiene anche il componente host aggiornato: se Start è aperta dentro un hub già pubblicato, il suo overlay appartiene all’hub e la stessa cartella va aggiornata nel progetto parent.

“CONTINUA IL VIAGGIO!” invia `RETURN` al parent quando connesso; in standalone apre `https://mementostudio.it/#start`. Gli inset iniziale e finale tengono hero e footer fuori dal blur a riposo. FAQ, dialoghi e controlli da tastiera mantengono il comportamento esistente.

L’HTML autonomo contiene gli stessi moduli, font e asset. Provenienza in `docs/navbar-v7-assets.md`; controlli di integrazione e limiti in `docs/navbar-v7-verifica.md`.

## Vercel

Importare la cartella come progetto statico: Framework **Other**, nessun comando di build/installazione, output **`.`**. La configurazione è già in `vercel.json`; entry point `index.html`. Questo pacchetto non pubblica automaticamente il sito. Sostituire i file del progetto Start con il contenuto dello ZIP, mantenendo `index.html`, `assets/` e `navigation/` alla radice. L’HTML `MEMENTO_START_V6.html` è una preview autonoma; l’entry point Vercel resta `index.html`.

## Verifica e licenze

La revisione 6.6 usa esclusivamente la cartella `navigation/` del kit V7 Clean, con moduli versionati per evitare la cache precedente. La verifica locale della nuova integrazione è descritta in `docs/navbar-v7-verifica.md`.

V6 verificata in Chrome a 320, 390, 768, 1024, 1600 e 1920 px: nessun overflow dei testi controllati. Verificati hover, immagini FAQ, griglia della sede e titolo. Dettagli e limiti in `design-qa.md`. Nessuna email inviata durante le prove.

Tutte le **12 immagini** sono state rielaborate per la revisione 6.1. I soggetti comunicano direttamente il contesto: busta, laptop con simbolo email, smartphone in chiamata, marchi WhatsApp e Instagram, laptop con portfolio per Fiverr, lampadina, cartella progetto, clessidra, fumetti di dialogo, pin e orologio. Il corpo dell’oggetto resta leggibile; particelle carbone e ambra e scie vorticose si concentrano ai margini. Ogni immagine ha una luce ambra dall’alto a destra, con caduta verso il basso a sinistra, su fondo nero puro. Il trattamento B/N a riposo e colore all’interazione è conservato nelle card; nelle FAQ i colori sono visibili subito.

Le immagini sono raster, non simulazioni animate di particelle. Le email si adattano proporzionalmente a destra per mantenere visibili le scie. Prompt prodotti con ImageGen in `docs/image-prompts-v61.md`. Il pacchetto include solo le immagini effettivamente utilizzate.

L’embed Google resta nativo. La catena CSS mantiene identici inversione, contrasto e saturazione fra i due stati; cambia soltanto la desaturazione. Questo mantiene scure le superfici neutre durante l’interazione. I colori del tema scuro sono adattati dal filtro CSS. Controlli, rating, collegamento alle recensioni, logo e crediti restano accessibili; nessun overlay copre l’interfaccia.

Il font originale Inter Variable usa la licenza in `docs/Inter-OFL.txt`; icone Tabler in `docs/Tabler-LICENSE.txt`. Chevron con viewBox quadrato, stroke 0,8 e scaling uniforme. Le licenze sono incorporate anche nell’HTML autonomo.

Gradienti del DNA campionati con PCHIP float; ancoraggi esatti ed errore sotto 1/255. Comandi: `npm run check`, `npm run gradients`, `npm run export`.
