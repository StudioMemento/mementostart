# Memento START — VFX Pass V2

Pagina HTML/CSS/JavaScript statica, coerente con il Master Visual DNA 1.1. Font Inter Variable, immagini WebP e icone Tabler sono locali. Nessuna dipendenza runtime da installare.

## File

Lo ZIP `MEMENTO_START_VFX_V2_VERCEL.zip` contiene l’HTML autonomo e i sorgenti separati qui descritti. Base: Start VFX V1, commit `71953ac700d64b4a59575299118b4fe80af76b71`, derivata da Start V6 con overlay V12 Framer.

- **MEMENTO_START_VFX_V2.html**: HTML autonomo con CSS, script, font, icone, immagini e VFX incorporati. Google Maps e destinazioni esterne richiedono una connessione. Per verificare anche il bridge della navbar usare la versione servita via HTTP.
- **index.html + assets/ + navigation/**: versione da caricare su Vercel. Estrarre lo ZIP e usare `npm run dev` per la preview locale sulla porta 4173. Non serve `npm install`.
- **qa/**: pagina di prova facoltativa, con larghezze responsive, FX on/off, scroll, cursore, fotogrammi dell’intro e cleanup.

## VFX Pass V2

La revisione segue `MEMENTO_VFX_MASTER_DIRECTION_V2`: più materia leggibile nella tipografia e meno rete sulle fasce di transizione. Il layout, i contenuti, gli asset originali e la navbar restano quelli della base.

Il campo cursore è condiviso fra testi e bordi, anche nel gutter. Sui titoli grandi si distinguono wire rame, poche facce e contorno con alone breve; il pieno della lettera resta continuo. Le email usano un accento più semplice. I bordi hanno geometria irregolare aderente alla fascia interna, senza una texture ripetuta lungo tutta la cornice. Il centro delle fotografie resta libero dalla rete durante hover.

Ingresso di circa 1.050 ms: scia rada → reticolo → pieno. Lo scroll resta continuo e reversibile, con una fase wire più breve e soglie di reveal meno disperse. Il materiale non viene riavviato quando una card rientra in vista. I bordi condivisi, gli occhielli e i tagli diagonali conservano la loro geometria.

Il nuovo Reticolo continuo usa un canvas trasparente dietro i contenuti: fili neutri, zone nere, luce locale e micro-tensione. Le superfici opache lo coprono attraverso la stessa maschera di reveal del contenuto. Il grafo si arresta a quiete e non emette particelle. Gli attributi `data-mm-environment-owner`, `data-environment="own"` e `data-mm-environment="off"` riservano la superficie a un ambiente dedicato.

Configurazione in `assets/vfx/config.js`: raggio 260 px desktop, 130 px touch, 110 px navbar; follow 70 ms, attacco 120 ms, rilascio 380 ms; fasce scroll 1,5–13% e 86–100%; massimo 48 triangolini desktop / 20 mobile, ambiente incluso. L’ambiente attuale usa zero particelle; il tetto è disponibile alle transizioni. Il coordinatore e lo scheduler sono condivisi: due superfici SVG compongono pagina e navbar, un canvas disegna il fondo.

Per confrontare: `/?fx=off`. Per diagnosi: `/?fxdebug=1`; `/?fxdebug=1&fxintro=520` congela l’ingresso a 520 ms. L’API `window.MementoVFX` espone `setEnabled(boolean)`, `refresh()`, `destroy()` e metriche diagnostiche. Nessun controllo tecnico è aggiunto alla pagina pubblica.

Con movimento ridotto il contenuto è pieno e il fondo statico; con FX off, colori forzati o errore vengono rimossi gli effetti e le maschere. Il bootstrap conserva i timer di sicurezza. Il touch non annulla lo scroll nativo; il pass non legge o modifica l’interno di Google Maps.

Verifica, misure e limiti: `docs/VFX_V2_VERIFICA.md`. Il report V1 è storico. Comandi: `npm run check`, `npm run check:vfx`, `npm run export`. La revisione 2.1 completa il tentativo recuperato, ottimizza le cache e corregge il resize delle maschere fuori schermo. La misura prestazionale su hardware reale resta aperta. Non sono certificati 60 fps, Safari, alto DPR o hardware mobile.

## Contatto diretto

Il form, la preparazione della bozza e il codice dell’endpoint sono stati rimossi. Dopo LET’S WORK / TOGETHER ci sono due card, affiancate su desktop e impilate su mobile:

- `mementoxdesign@gmail.com`
- `info@mementostudio.it`

Ogni card apre direttamente l’app di posta tramite `mailto:`. L’invio avviene nell’app scelta dall’utente. Le quattro card successive mostrano il numero **+39 328 545 4661**, WhatsApp, Instagram e Fiverr. Icona sopra al testo, contenuto in basso a sinistra e padding identico su tutte le sei card.

Le immagini hanno un gradient blur nella parte inferiore: tre bande di blur progressivo (1/3/7 px) e sfumatura scura proteggono il copy. A riposo sono in bianco e nero con overlay nero uniforme al 50%; hover e focus ripristinano colore e luminosità originali, rimuovendo l’overlay uniforme. Il trattamento inferiore di leggibilità resta attivo. Il chevron diagonale in alto a destra è bianco a riposo e ambra su hover/focus. Restano il bordo evidenziato, il colore ambra del titolo e il movimento minimo del chevron. Nessuno zoom dell’immagine.

## Struttura e interazioni

- Titolo LET’S WORK / TOGETHER su due righe: un solo gradiente verticale del DNA attraversa l’intero titolo, ambra in basso e bianco in alto. LET’S WORK resta quasi bianco. Ingresso triangolare del VFX Pass V2.
- Un pannello FAQ con titolo in alto a sinistra, prima domanda aperta, separatori in dissolvenza e immagine a destra con un solo soggetto su fondo nero puro: quattro soggetti riconoscibili in carbone con particelle e scie ambra: lampadina, cartella progetto, clessidra e dialogo. Le immagini cambiano insieme alla domanda aperta. Altezza minima 640 px desktop / 620 px mobile: tutte le risposte attuali rientrano senza cambiare altezza.
- Click, tap, Invio o Spazio aprono una domanda alla volta. Frecce/Home/End spostano il focus; Escape chiude. I `details` nativi funzionano anche senza JavaScript.
- SIAMO QUI: griglia desktop con mappa **3×2** e due card **1×1** sulla destra. La prima contiene icona location e **Piazza Trento 12 / 33085 Maniago (PN)**; la seconda icona orologio e **Lunedì — Venerdì / 14:00 — 18:00**.
- Su mobile la mappa occupa tutta la larghezza sopra le due card informative affiancate. Google Maps resta scura e monocromatica a riposo; su hover/focus riemerge il colore negli elementi della mappa, mantenendo scuro lo sfondo, full bleed nel proprio box. È incorporata la scheda ufficiale Studio Memento, con valutazione e link nativi alle recensioni quando disponibili nel layout Google. L’indirizzo apre esattamente il link fornito dallo studio. Le due card informative hanno immagini dedicate: pin di posizione e orologio, con bordi parzialmente dissolti in particelle, con gradient blur inferiore. Il pin è una rappresentazione concettuale della posizione. Controlli, logo, attribuzioni e link legali sono visibili e utilizzabili, senza overlay. L’angolo inferiore destro della mappa è rettangolare per non tagliare i crediti Google. L’indirizzo apre Maps anche con l’embed disattivato.
- Privacy & legal è senza immagini: titolo in alto, un gruppo Privacy e cookie con policy e preferenze, un gruppo Studio con nome, email e dati. Le informazioni non sono duplicate in una firma separata.
- CONTINUA IL VIAGGIO! occupa una sola riga e usa la sfumatura del DNA: ambra in basso, bianco in alto. Chevron geometrico non deformato.
- Le card appaiono attraverso la maschera triangolare. Movimento ridotto e colori forzati mantengono il contenuto pieno. La pagina non contiene nebbia.

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

La pagina mantiene la trasparenza nell’hub; la versione standalone conserva il fondo base `#121212`. Il reticolo V2 è un layer trasparente, senza riempimento opaco aggiuntivo.

Overlay **12.0.0 Framer** integrato integralmente dal kit allegato, comprese le nuove icone e i tracciati originali del logo. Blur Framer con otto livelli nativi CSS per bordo, raggi da 0,0546875 a 7 px e area del 20% della viewport; fondo trasparente.

Logo e navbar condividono una fascia da 320 px, con margini laterali minimi di 20 px. Lettere alte 11 px, box da 40 px, simboli da 34 px e aree cliccabili da 48 px. La distanza libera fra i box è il doppio della distanza dal basso, al netto della safe area. **Start resta attivo** con luce ambra interamente ritagliata nel box; icone inattive monocromatiche. Nessun dot o tooltip.

Il blur resta visibile anche con **Riduci trasparenza** attivo, come previsto dal kit V12. L’attributo opzionale `respect-system-transparency` ripristina il rispetto automatico della preferenza; `blur="off"` spegne direttamente l’effetto. Movimento ridotto e colori ad alto contrasto mantengono i comportamenti previsti dal kit. Gli spazi iniziale e finale della pagina restano quelli della revisione precedente.
Bootstrap unico `/navigation/bootstrap.js?v=12.0.0` con `data-memento-page="start"` e `data-memento-hub="https://mementostudio.it"`. Home e pagine usano i link pubblici `/`, `/studio`, `/services`, `/projects`, `/levelup`, `/start`. Il bridge mantiene il protocollo `memento:navigation` versione **2**, compresa la compatibilità con `mementonav.vercel.app`.

In standalone l’overlay è visibile; nell’hub, dopo l’handshake, rimane soltanto quello del parent. In un iframe senza handshake compare dopo 1,2 secondi. La cartella `navigation/` contiene anche il componente host aggiornato: se Start è aperta dentro un hub già pubblicato, il suo overlay appartiene all’hub e la stessa cartella va aggiornata nel progetto parent.

“CONTINUA IL VIAGGIO!” invia `RETURN` al parent quando connesso; in standalone apre `https://mementostudio.it/#start`. Gli inset iniziale e finale tengono hero e footer fuori dal blur a riposo. FAQ, dialoghi e controlli da tastiera mantengono il comportamento esistente.

L’HTML autonomo contiene gli stessi moduli, font e asset. Provenienza in `docs/navbar-v12-assets.md`; controlli di integrazione e limiti in `docs/navbar-v12-verifica.md`.

## Vercel

Importare la cartella come progetto statico: Framework **Other**, nessun comando di build/installazione, output **`.`**. La configurazione è già in `vercel.json`; entry point `index.html`. Questo pacchetto non pubblica automaticamente il sito. Sostituire i file del progetto Start con il contenuto dello ZIP, mantenendo `index.html`, `assets/` e `navigation/` alla radice. L’HTML `MEMENTO_START_VFX_V2.html` è una preview autonoma; l’entry point Vercel resta `index.html`.

## Verifica e licenze

La revisione 6.7 usa esclusivamente la cartella `navigation/` del kit V12 Framer, con moduli versionati per evitare la cache precedente. La verifica locale della nuova integrazione è descritta in `docs/navbar-v12-verifica.md`.

I report precedenti `design-qa.md` e `docs/navbar-v12-verifica.md` descrivono la base V6. Il report della revisione attuale è `docs/VFX_V2_VERIFICA.md`; `docs/VFX_V1_VERIFICA.md` rimane come storico. Nessuna email inviata durante le prove.

Tutte le **12 immagini** sono state rielaborate per la revisione 6.1. I soggetti comunicano direttamente il contesto: busta, laptop con simbolo email, smartphone in chiamata, marchi WhatsApp e Instagram, laptop con portfolio per Fiverr, lampadina, cartella progetto, clessidra, fumetti di dialogo, pin e orologio. Il corpo dell’oggetto resta leggibile; particelle carbone e ambra e scie vorticose si concentrano ai margini. Ogni immagine ha una luce ambra dall’alto a destra, con caduta verso il basso a sinistra, su fondo nero puro. Il trattamento B/N a riposo e colore all’interazione è conservato nelle card; nelle FAQ i colori sono visibili subito.

Le immagini sono raster, non simulazioni animate di particelle. Le email si adattano proporzionalmente a destra per mantenere visibili le scie. Prompt prodotti con ImageGen in `docs/image-prompts-v61.md`. Il pacchetto include solo le immagini effettivamente utilizzate.

L’embed Google resta nativo. La catena CSS mantiene identici inversione, contrasto e saturazione fra i due stati; cambia soltanto la desaturazione. Questo mantiene scure le superfici neutre durante l’interazione. I colori del tema scuro sono adattati dal filtro CSS. Controlli, rating, collegamento alle recensioni, logo e crediti restano accessibili; nessun overlay copre l’interfaccia.

Il font originale Inter Variable usa la licenza in `docs/Inter-OFL.txt`; icone Tabler in `docs/Tabler-LICENSE.txt`. Chevron con viewBox quadrato, stroke 0,8 e scaling uniforme. Le licenze sono incorporate anche nell’HTML autonomo.

Gradienti del DNA campionati con PCHIP float; ancoraggi esatti ed errore sotto 1/255. Comandi: `npm run check`, `npm run gradients`, `npm run export`.
