# Memento START — V6

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
- Un pannello FAQ con titolo in alto a sinistra, prima domanda aperta, separatori in dissolvenza e immagine a destra con un solo soggetto su fondo nero puro: quattro forme astratte in carbone con particelle e scie ambra. Le immagini cambiano insieme alla domanda aperta. Altezza minima 640 px desktop / 620 px mobile: tutte le risposte attuali rientrano senza cambiare altezza.
- Click, tap, Invio o Spazio aprono una domanda alla volta. Frecce/Home/End spostano il focus; Escape chiude. I `details` nativi funzionano anche senza JavaScript.
- SIAMO QUI: griglia desktop con mappa **3×2** e due card **1×1** sulla destra. La prima contiene icona location e **Piazza Trento 12 / 33085 Maniago (PN)**; la seconda icona orologio e **Lunedì — Venerdì / 14:00 — 18:00**.
- Su mobile la mappa occupa tutta la larghezza sopra le due card informative affiancate. Google Maps resta scura e monocromatica a riposo; su hover/focus riemerge il colore negli elementi della mappa, mantenendo scuro lo sfondo, full bleed nel proprio box. È incorporata la scheda ufficiale Studio Memento, con valutazione e link nativi alle recensioni quando disponibili nel layout Google. L’indirizzo apre esattamente il link fornito dallo studio. Le due card informative hanno immagini dedicate: portale e orologio astratti, parzialmente dissolti in particelle, con gradient blur inferiore. L’ingresso è una rappresentazione concettuale, non una fotografia della sede. Controlli, logo, attribuzioni e link legali sono visibili e utilizzabili, senza overlay. L’angolo inferiore destro della mappa è rettangolare per non tagliare i crediti Google. L’indirizzo apre Maps anche con l’embed disattivato.
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

Root, body e pagina sono alpha; in iframe viene normalizzato il color scheme per preservare la trasparenza reale sul parent. Nessuna fog: l’atmosfera appartiene al Nav Hub. Le card conservano le superfici del DNA.

Bridge **Tide v014**, canale `memento:tide`, versione 1. Conservati INIT/READY, VISIBILITY, INPUT, SCROLL, ESCAPE ed END. Il footer emette END con `explicit-explore` quando il parent è connesso; standalone apre il Nav Hub. Le FAQ con focus e i dialog proteggono la navigazione da tastiera. Gli origin consentiti sono nell’attributo `data-tide-parents` dello script finale.

## Vercel

Importare la cartella come progetto statico: Framework **Other**, nessun comando di build/installazione, output **`.`**. La configurazione è già in `vercel.json`; entry point `index.html`. Questo pacchetto non pubblica automaticamente il sito.

## Verifica e licenze

V6 verificata in Chrome a 320, 390, 768, 1024, 1600 e 1920 px: nessun overflow dei testi controllati. Verificati hover, immagini FAQ, griglia della sede e titolo. Dettagli e limiti in `design-qa.md`. Nessuna email inviata durante le prove.

Tutte le **12 immagini** sono state rigenerate per V6: due email, quattro canali di contatto, quattro FAQ, indirizzo e orari. Gli oggetti sono suggeriti da frammenti e superfici carbone, con parti mancanti, granelli ambra e traiettorie vorticose che escono dalla sagoma. Il fondo è nero puro. Sono immagini raster con scie disegnate nella composizione, non una simulazione animata di particelle. Le scie delle email restano integre grazie al contenimento proporzionale a destra. Prompt in `docs/image-prompts-v6.md`. Nessuna immagine precedente inutilizzata è inclusa nello ZIP.

L’embed Google resta nativo. La catena CSS mantiene identici inversione, contrasto e saturazione fra i due stati; cambia soltanto la desaturazione. Questo mantiene scure le superfici neutre durante l’interazione. I colori del tema scuro sono adattati dal filtro CSS. Controlli, rating, collegamento alle recensioni, logo e crediti restano accessibili; nessun overlay copre l’interfaccia.

Il font originale Inter Variable usa la licenza in `docs/Inter-OFL.txt`; icone Tabler in `docs/Tabler-LICENSE.txt`. Chevron con viewBox quadrato, stroke 0,8 e scaling uniforme. Le licenze sono incorporate anche nell’HTML autonomo.

Gradienti del DNA campionati con PCHIP float; ancoraggi esatti ed errore sotto 1/255. Comandi: `npm run check`, `npm run gradients`, `npm run export`.
