# Memento Start V4 — pacchetto Vercel

Pagina completa delle tavole R4, con l’ultima modifica alla chiusura: **Continua ad esplorare!** e chevron verso il basso, solo tipografia e SVG. Nessuna immagine, superficie o sfumatura viene aggiunta in quest’area: il blending appartiene al sistema di navigazione dell’hub.

## Pubblicazione

1. Estrai lo ZIP.
2. Sostituisci i file del progetto Vercel di Start con il contenuto estratto. `index.html` e `vercel.json` devono essere nella directory principale del progetto.
3. Usa il preset **Other**, nessun comando di installazione o build, directory di output `.`. Il file `vercel.json` include la configurazione statica.
4. Pubblica il progetto e verifica l’URL di Start dentro l’hub.

È un sito statico: non richiede Node, pacchetti npm o variabili d’ambiente. Se usi Git, aggiorna il repository collegato al progetto Vercel. L’archivio è pronto per il caricamento dei file estratti; non è stato eseguito un deploy in questa consegna.

## Contatto già funzionante

Per impostazione predefinita il pulsante è **Prepara email**. Il modulo valida nome, email e idea, poi prepara un messaggio indirizzato a `info@mementostudio.it`. La persona deve aprire la propria app di posta e completare l’invio. Può copiare il testo, rileggerlo e modificarlo. Nessun messaggio viene dichiarato inviato senza una conferma effettiva.

WhatsApp e Chiama mantengono i recapiti del pacchetto precedente. Non sono presenti tracker, salvataggi dei campi nel browser o servizi di invio esterni preconfigurati.

Per attivare un invio diretto e l’informativa privacy, modifica il blocco JSON `memento-contact-config` in `index.html`. Le opzioni e il contratto del servizio sono descritti in `docs/IMPLEMENTAZIONE.md`. Non inserire chiavi segrete nell’HTML.

## Nell’hub

- Documento e spazi fra le sezioni trasparenti fin dal caricamento nell’iframe.
- Protocollo `memento:tide` v1, bridge v014, con supporto scrub e compatibilità precedente.
- Lo scroll continuato ai bordi passa il controllo all’hub. Il clic o Invio su **Continua ad esplorare!** invia `END` nella sessione attiva.
- L’hub è responsabile dello stage e dell’animazione. Questo ZIP contiene la pagina Start, non modifica l’hub.
- In standalone il clic sull’invito apre `https://mementonav.vercel.app/#start`; lo scroll da solo non provoca navigazioni.

## Contenuto

- `index.html`: struttura, copy e configurazione.
- `assets/`: immagini WebP, font Inter locale, gradienti e comportamento.
- `vercel.json`: configurazione di pubblicazione statica.
- `docs/`: logica della pagina, specifiche e provenienza delle immagini.

Verificati: form e bozza, otto viewport fra 320 e 1920 px, alpha nell’iframe, footer senza immagini, handshake/uscita del bridge con un hub di prova. Non è stato modificato né collaudato un deploy di produzione con questi file.
