# Verifica V26 — 15 novembre 2026

## Esiti verificati

- **38 test automatici superati.** Reazione fra cellule adiacenti, sparsezza, arrivi non uniformi, assenza di alimentazione continua del campo touch, esaurimento, esclusione delle superfici fuori viewport, pool limitato, listener passivo, navbar e regressioni di scroll/resize.
- **Build di produzione e prerender completati.** Verifica delle impronte degli asset/moduli preservati e del preset Ghost Fibers a cinque layer senza grain. Gli shader desktop tornano alla versione originale normalizzando soltanto le modifiche intenzionali documentate nello script di verifica.
- **11 shader compilati e 6 programmi collegati con EGL software**, incluse le varianti card e testo. È una verifica di compilazione/link, non della resa visiva o degli FPS.
- **Browser, pagina reale a 390 e 360 px:** 23 controlli superati su navbar iniziale, immagini a colori, assenza di cerchio, propagazione al titolo distante nel fallback, spegnimento, scroll, FAQ, dialog, mappa, focus e link.
- **Browser, pagina a 1280 px:** 22 controlli superati; comportamento desktop mantenuto. La verifica delle immagini già a colori è specifica del mobile.
- **Embed annidato a 390×844 e 360×740:** 10 controlli superati per ciascuna misura. Il test ricrea un contenitore 100vh con una porzione inferiore non visibile, applica il modulo Framer effettivo, varia l’altezza visibile, raggiunge il fondo, torna in alto e ripristina il layout.
  - A 390 px: viewport simulata 744 px, base navbar 733 px, scroll iniziale 0; successivamente 809/798 px e riduzione a 694 px.
  - A 360 px: viewport simulata 640 px, base navbar 629 px, scroll iniziale 0; successivamente 705/694 px e riduzione a 590 px.
  - Il genitore resta a scroll 0 al fondo del documento interno.
- Blur: maschere direzionali senza rotazione; tratto interno trasparente e altezza limitata, controllati nel browser. La navbar è visibile nel fallback a colori.

## Causa riscontrata nell’integrazione pubblica

Il documento di `mementostudio.it/start` contiene l’iframe `https://mementostart.vercel.app/` con altezza 100%, dentro un contenitore Framer alto 100vh. Questo consente un disallineamento rispetto alla viewport visibile sui browser mobili. Il test locale riproduce il disallineamento e verifica la correzione del documento ospitante.

La correzione Framer non è stata installata sul sito pubblico. È inclusa in `FRAMER_START_FIX.html`, con procedura in `INSTALLAZIONE.md`. Il modulo ospitato su Vercel è autonomo e ha un header CORS per il caricamento da Framer. Il solo ZIP Vercel, senza il passaggio sulla pagina Framer, non modifica l’altezza del genitore.

## Limiti espliciti

Il browser di anteprima non consente la creazione di un contesto WebGL. La simulazione delle barre usa misure di viewport e veri iframe, ma non sostituisce un telefono con barre/gesture native. Restano da controllare sul telefono: resa finale GPU dell’impulso e del testo, sfumatura blur su Brave/Safari e fluidità. Non viene dichiarato un framerate misurato.

Nessun cambiamento pubblico, invio di contatti o modifica dei consensi dell’utente è stato eseguito. Le preferenze della mappa sono state esercitate soltanto nell’anteprima locale e ripristinate.
