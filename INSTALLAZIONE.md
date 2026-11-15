# Start V26 — due modifiche collegate

1. Carica questo progetto su Vercel, sostituendo la versione di `mementostart.vercel.app`.
2. In **Framer → pagina Start → Custom Code → End of body**, incolla il contenuto di `FRAMER_START_FIX.html` e pubblica la pagina Framer. Mantieni l’embed URL esistente.

Il secondo passaggio è necessario su `mementostudio.it/start`: il documento pubblico recuperato il 15/11/2026 contiene un iframe dentro un contenitore alto `100vh`. Sui browser mobili quella misura può includere l’area occupata dalle barre del browser. La navbar interna può così finire sotto la parte visibile; al fondo lo scroll passa al documento esterno. Cambiare il solo CSS dentro l’iframe non corregge la misura del genitore.

Lo script interviene solo sulla pagina `/start` e sull’iframe di `mementostart.vercel.app`: usa l’altezza visibile del browser, toglie lo spazio da elemento inline e mantiene lo scroll nativo dentro Start. Aggiorna l’altezza al cambio delle barre/orientamento e ripristina il layout quando Framer rimuove l’embed. Nessun secondo menu viene aggiunto.

Il file deve essere inserito nel codice **della pagina Framer**, non in un altro widget Embed HTML e non in `index.html` di Vercel.

Prova finale su telefono: apri Start da zero con barre del browser visibili, controlla le cinque icone in basso; scorri fino al fondo e torna su, cambia orientamento; tocca in più punti. Non devono comparire cerchi né restare intere card coperte di triangoli. La sfumatura blur deve dissolversi verso il contenuto. La resa GPU e il comportamento delle barre su telefono reale richiedono questa prova: non sono simulati dal solo test desktop.

Nessun deploy pubblico è stato eseguito da questa consegna.
