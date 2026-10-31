# Memento Start — contenuti e logica V4

31 ottobre 2026. Questa versione applica la direzione essenziale delle tavole R4 e l’ultima modifica alla chiusura.

## Sequenza

1. **Da dove si parte?** Il visitatore capisce subito che basta scrivere. Il form è già disponibile.
2. **Ti stai chiedendo…** Quattro dubbi, quattro risposte sempre visibili, ciascuna con una fotografia sfumata.
3. **Continua ad esplorare!** Solo testo e chevron verso il basso. Lo scroll continua nel sistema di navigazione, che gestisce il blending e il ritorno allo stage.

## Hero

| Elemento | Copy esatto |
|---|---|
| H1 | Da dove si parte? |
| Risposta | Da un messaggio. |
| Firma | Con Gianluigi e Nuru. |
| Campo 1 | Nome / Il tuo nome |
| Campo 2 | Email / nome@email.it |
| Campo 3 | La tua idea / Vorrei… |
| CTA predefinita | Prepara email |
| CTA con servizio di invio configurato | Invia messaggio |
| Rassicurazione | Senza impegno. |
| Privacy, con URL reale configurato | Informativa privacy |
| Alternative | WhatsApp ↗ / Chiama ↗ |

Un’unica board illustrata: domanda a sinistra, form a destra. Su mobile: domanda, foto, form. Nessuna card annidata per il form, nessun campo telefono, nessun selettore di servizio o budget.

## Quattro risposte

| Domanda | Risposta | Fotografia |
|---|---|---|
| Basta un’idea? | Sì. La mettiamo a fuoco insieme. | Schizzi e modello |
| E se ho già qualcosa? | Partiamo da quello. | Identità e materiali coordinati |
| Costi e tempi? | Chiari nella proposta. Prima di partire. | Proposta e penna |
| Scrivervi mi impegna? | No. Decidi dopo la proposta. | Due poltrone per il confronto |

Tutte le risposte visibili, senza accordion. Griglia 2 × 2 su desktop, colonna su mobile. «Parliamone ↗» torna al form senza cancellare valori né aprire automaticamente la tastiera.

## Chiusura definitiva

**Continua ad esplorare!**

Chevron SVG rivolto in basso, sotto la scritta. Nessuna immagine, card, cornice, superficie opaca o sfumatura di sfondo, né una riproduzione dello stage. Testo e chevron sono un unico collegamento accessibile anche da tastiera. La nav hub realizza il blending; Start mantiene l’alpha.

Nell’iframe con sessione attiva il clic richiede il ritorno tramite `END`. Il normale scroll usa il bridge esistente. In standalone solo il clic apre l’hub; non ci sono redirect automatici allo scroll.

## Stati del contatto

| Stato | Copy |
|---|---|
| Bozza predefinita | Email pronta. / Aprila nella tua app di posta e completa l’invio. |
| Bozza lunga | Email pronta. / Copia il testo completo, poi apri l’email e incollalo. |
| Azioni bozza | Apri email / Copia il testo / Modifica / Rileggi il messaggio |
| Invio in corso, solo con endpoint | Invio in corso… |
| Accettazione confermata dall’endpoint | Messaggio ricevuto. / Ora tocca a noi. Ti risponderemo via email. |
| Esito non confermato | Non riusciamo a confermare l’invio. Il testo è ancora qui. |

Nessun successo simulato. La modalità bozza richiede sempre il completamento dell’invio nell’app di posta. La bozza resta nella pagina fino a reload/distruzione dell’iframe; non viene salvata in storage persistente.
