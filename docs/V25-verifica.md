# V25 — verifica

15 novembre 2026.

- Build TypeScript/Vite con prerender riuscita.
- 37 test automatici in cinque file superati.
- Parametri del nuovo allegato verificati, con override layers 5 e grain 0; valori omessi risolti con i default del componente.
- 14 asset, sette moduli degli effetti e configurazione dei contatti preservati rispetto alla V23.
- Shader originali conservati salvo proiezione del canvas (V24), colori delle immagini a riposo su mobile e rimozione della grana (V25).
- Verifiche browser responsive: navbar al primo caricamento/in cima, immagini a colori sul layout mobile, un solo impulso per contatto, prosecuzione dopo pointercancel, titolo distante nel fallback, cleanup, FAQ, popup, focus, mappa e scroll.

## Limite concreto

Il browser di prova non crea contesti WebGL. I controlli sugli eventi touch usano PointerEvent sintetici nella pagina reale; non costituiscono una prova fisica di Safari. Le prove del renderer automatiche usano oggetti simulati dove necessario e non misurano gli FPS.

La prova grafica GPU e il confronto della fluidità su iPhone restano da eseguire. Cinque layer aumentano il lavoro del background: sono conservati il limite a 30 render/s, DPR massimo 1 e la riduzione adattiva della risoluzione.

## Prova sul dispositivo

1. Aprire il deploy di prova a freddo: navbar visibile subito, senza arrivare in fondo alla pagina.
2. Controllare le cinque fibre sovrapposte, il glow rosso/ambra, la rotazione e l’assenza della grana.
3. Verificare immagini a colori prima del primo tocco.
4. Toccare uno spazio libero vicino al bordo: l’onda deve raggiungere il lato opposto e accendere anche i titoli.
5. Iniziare uno swipe: la pagina deve scorrere subito e l’impulso già avviato deve proseguire. Ripetere tocchi ravvicinati.
6. Ripetere con la barra Safari aperta/chiusa, in orizzontale e dopo un ritorno alla pagina.
7. Verificare FAQ, popup e chiusura con ripristino del focus. Dentro Google Maps i gesti rimangono quelli nativi dell’iframe.

Non è stato eseguito alcun deploy pubblico.
