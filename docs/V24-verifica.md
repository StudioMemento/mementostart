# V24 — verifica e limiti

Data: 15 novembre 2026.

## Esito locale

La build TypeScript/Vite e i 28 test automatici passano. Il confronto con la V23 conserva 14 file di asset, sette moduli del motore degli effetti e la configurazione dei contatti. Gli shader di superficie sono identici salvo la proiezione delle coordinate. I 27 parametri esplicitamente indicati nell'allegato corrispondono al preset.

La verifica browser è stata eseguita su viewport responsive a 360, 390, 768 e 1280 px. Controlli: overflow orizzontale, collegamenti, selezione esclusiva e chiusura FAQ, dialog, disattivazione e riattivazione della mappa, sblocco dello scroll, ripristino del focus, cinque elementi navbar e accesso al fondo pagina.

Il browser di verifica non crea contesti WebGL. Questo verifica il comportamento del fallback, non la resa GPU. Non sono stati misurati gli FPS sul dispositivo dell'utente. I test di resize eseguono il metodo di produzione con il renderer simulato: verificano le invalidazioni, non il costo GPU.

## Prova sul dispositivo reale

1. Avviare la V24 in un deploy di prova o con `npm run dev` su un dispositivo con WebGL2.
2. Verificare fibre ambra in movimento, hover focus e assenza di impulsi al click.
3. Ripetere il gesto del video: mappa → FAQ → legal, inversione rapida e ritorno alla hero. Controllare l'allineamento della mappa con cornici e tab durante l'inerzia.
4. Ripetere con barra Safari espansa/ridotta e dopo una rotazione dello schermo.
5. Aprire le quattro FAQ, chiudere la risposta, cambiare preferenza mappa e chiudere il dialog; verificare il ritorno del focus.
6. Controllare hover e focus su titoli, tab e CTA: palette, catene triangolari e glow devono mantenere il comportamento della V23.
7. In sviluppo, `/qa.html` mostra le verifiche e, con WebGL attivo, controlla che una variazione della sola altezza non rasterizzi nuovamente i testi.
8. Per un confronto dei profili usare `?vfx=high`, `?vfx=medium`, `?vfx=low`. Non forzare un profilo nel deploy finale.

## Criterio per il passaggio al live

Il pacchetto è costruibile e la navigazione DOM è verificata. La prova grafica con WebGL e il controllo di fluidità su Safari mobile rimangono da completare; il pacchetto non afferma di aver superato questi controlli.
