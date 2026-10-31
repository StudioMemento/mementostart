# Memento Start V4 — implementazione

Versione 4, 31 ottobre 2026. Riferimenti: Visual DNA 1.1, contenuti R4 e richiesta finale «Continua ad esplorare!».

## Struttura e dimensioni

Tre momenti: hero con form integrato; quattro domande/risposte illustrate; invito tipografico finale. Nessun carosello, accordion o titolo decorativo START/INSIEME/DOMANDE.

| Proprietà | Regola |
|---|---|
| Wrapper ≥768 px | `min(80vw, 1280px)` con rispetto delle safe area |
| Hero desktop | rapporto base 2:1, fino a 1280 × 640 px |
| Altezza con form, errori o testi lunghi | automatica se il contenuto richiede più spazio |
| Tablet 768–1099 px | due colonne, campi Nome/Email impilati, altezza minima 540 px |
| Wrapper mobile | margini `clamp(32px, 8.5vw, 52px)` e safe area |
| Mobile hero | domanda → foto sfumata → form, unica cornice |
| FAQ | 2 × 2 desktop/tablet, quattro card impilate mobile |
| Font | Inter Variable locale, 16 px negli input, titoli 350/380 |
| Background standalone | `#0b0c0d` |
| Background embed | html/body/main trasparenti dal primo script nell’head |
| Chiusura | testo esatto + chevron SVG, nessuna immagine/bordo/superficie |

L’80% indica la larghezza utile del contenitore: non è un padding CSS dell’80%. La geometria mobile 20/60/20 appartiene ai caroselli; questa pagina non ha caroselli. Il modulo mantiene una larghezza leggibile.

Le maschere ereditate dal DNA hanno curve morbide e dithering; i titoli e le cornici mantengono gli ancoraggi cromatici con interpolazione PCHIP. Le foto delle card si dissolvono sul parent, il testo resta indipendente. Le cornici delle FAQ si dissolvono in basso a riposo e si completano all’hover. Nessun ingrandimento della foto, lift o animazione automatica. `prefers-reduced-motion` elimina transizioni e scroll fluido.

## Configurazione del form

Il JSON con id `memento-contact-config` contiene:

| Campo | Uso |
|---|---|
| `email` | Destinatario delle bozze mailto |
| `phone` | Numero internazionale del collegamento Chiama |
| `whatsapp` | Numero internazionale senza `+` per WhatsApp |
| `whatsappMessage` | Testo iniziale WhatsApp |
| `endpoint` | Vuoto: bozza email. URL HTTPS valido: invio diretto POST |
| `privacyUrl` | Link HTTPS a una vera informativa; vuoto: collegamento non mostrato |
| `responseTime` | Eventuale tempo di risposta confermato dal titolare, non una promessa inventata |
| `parentOrigin` | Opzionale; origine HTTPS destinataria delle sole notifiche di altezza |

Nessuna telefonata, email o chat viene aperta automaticamente. Il visitatore deve attivare il collegamento.

### Contratto facoltativo per l’invio diretto

Configurare un endpoint reale prima di cambiare la modalità di invio. Il client imposta automaticamente «Invia messaggio» quando `endpoint` è un URL HTTPS valido.

```json
{
  "schemaVersion": 1,
  "requestId": "uuid-per-contenuto",
  "contact": {
    "name": "Nome",
    "email": "nome@example.com",
    "message": "La tua idea"
  },
  "source": "memento-contact",
  "website_hp": ""
}
```

Invio JSON, credenziali omesse, timeout 15 secondi, redirect non seguito. Il server deve validare i dati, gestire antispam/rate limit e deduplicare `requestId`; in caso di dominio diverso deve consentire CORS per l’origine della pagina. Solo una risposta HTTP riuscita con JSON `{ "ok": true }` mostra «Messaggio ricevuto.». Questa conferma significa accettazione del server, non prova di consegna nella casella email.

Altri esiti mostrano «Non riusciamo a confermare l’invio. Il testo è ancora qui.». Il testo resta modificabile; sono disponibili nuovo tentativo e fallback alla bozza. La modalità predefinita non usa questo endpoint.

### Bozza e accessibilità

Tre campi obbligatori, limiti 100/254/4000 caratteri. Errori visibili associati ai campi, annuncio accessibile e focus sul primo errore. L’email viene codificata con `encodeURIComponent`; oltre 1800 caratteri di URL viene chiesto di copiare il testo completo, poi aprire la posta. Copia usa Clipboard API oppure offre il testo selezionabile.

«Modifica» ripristina gli stessi valori. «Parliamone» torna al contenitore del modulo senza cancellare la bozza né forzare l’apertura della tastiera mobile. Nessun localStorage/sessionStorage dei dati. La bozza vive nella pagina finché l’iframe è mantenuto dall’hub; un reload o la distruzione dell’iframe la rimuove.

## Contratto di navigazione

Il bridge esegue solo dentro un iframe, ricava l’origine dal referrer e verifica sempre `event.source === parent`, `event.origin`, `channel`, `version`, `sessionId`, `stageId`. Non legge né invia i contenuti del form al parent.

| Messaggio | Direzione | Funzione |
|---|---|---|
| INIT | parent → Start | Inizializza sessione e supporto scrub |
| READY | Start → parent | Annuncia bridge v014, supportsEnd/supportsScrub |
| VISIBILITY | parent → Start | Attività, fase, bordo e posizione |
| SCROLL | Start → parent | Sole metriche top/viewport/height |
| INPUT | Start → parent | Delta ai bordi, modalità scrub |
| END | Start → parent | Uscita esplicita o scroll continuato legacy |
| ESCAPE | Start → parent | Richiesta chiusura da tastiera |

La chiusura usa `data-tide-exit-selector="#mm-explore"`; clic principale o Invio, senza modificatori, invia `END` con `reason: "explicit-explore"` solo nella sessione attiva in fase content. Il contenuto non disegna lo stage e non esegue il blending. Nel codice dell’hub analizzato `END` in stato CONTENT richiama `movePage(0,{loop:true})`.

Durante la compilazione il bridge è bloccato con `#mm-form:focus-within`; rispetta input editabili, scroll annidato, direzione del gesto e modali. Reinizializzare lo scroll non azzera i campi. In assenza di handshake resta un link reale verso l’hub.

Per un iframe con sandbox, il parent deve consentire script e la normale apertura dei collegamenti scelta dal visitatore; se il referrer è rimosso il bridge non può negoziare una sessione. Non è aggiunta alcuna apertura automatica dello stage in standalone.

## Verifica e limiti

Preview browser a 1440×900, 1600×1000, 1920×1080, 820×1180, 844×390, 390×844, 360×800, 320×700. Verificati assenza di overflow, dimensioni, immagini, trasparenza, bozza e protocollo tramite parent di prova. Il test locale del bridge non sostituisce il controllo del blending nella versione pubblicata dell’hub. Nessun endpoint di invio reale configurato o testato.
