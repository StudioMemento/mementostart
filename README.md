# Memento START — V7 · Navbar e blur V12

Start V6 precedente al VFX PASS, con navbar, logo e blur del kit allegato `O V E R L A Y(3).zip`. Base recuperata da `V6 (5)(2).zip`, revisione 6.5.0. Contenuti, immagini, font, gradienti, FAQ, contatti e animazioni di ingresso originali conservati. Il pacchetto non contiene il motore VFX PASS.

## Integrazione

- Cartella `navigation/` sostituita integralmente con il kit 12.0.0.
- Bootstrap unico con cache versionata e `data-memento-page="start"`.
- Start attiva con glow ambra; logo in alto e cinque icone in basso.
- Box da 40 × 40 px, aree cliccabili da 48 × 48 px, fascia da 320 px condivisa da logo e navbar. La fascia si riduce a 280 px su schermi da 320 px.
- Blur progressivo trasparente: otto livelli per bordo, area del 20% della viewport, raggi da 0,0546875 a 7 px.
- Bridge dell’hub e fallback standalone del kit V12 conservati.

Gli asset originali della pagina, compreso `motion.js`, sono identici alla base pre-VFX. In `navigation-insets.css` la variabile dello spazio per i contenuti è separata da quella del vecchio blur, con gli stessi valori di spaziatura.

## Vercel

Estrarre lo ZIP e usare la cartella che contiene `index.html` come radice del progetto.

| Impostazione | Valore |
|---|---|
| Framework | Other |
| Install command | Vuoto |
| Build command | Vuoto |
| Output directory | `.` |
| Entry point | `index.html` |

La configurazione è già in `vercel.json`. Questo pacchetto non aggiorna automaticamente il dominio pubblicato.

## Anteprima e sorgenti

`MEMENTO_START_V7_NAV_OVERLAY.html` è l’anteprima autonoma con CSS, JavaScript, font e immagini incorporati. Google Maps e le destinazioni esterne richiedono Internet. Per il sito usare `index.html`, `assets/` e `navigation/`.

Comandi senza dipendenze aggiuntive:

```sh
npm run dev
npm run check
npm run export
```

Il server locale usa la porta 4173. Il comando `export` rigenera l’HTML autonomo. Configurazione dei contatti in `assets/config.js`.

| Elemento | Destinazione |
|---|---|
| Logo | https://mementostudio.it/ |
| Memento | https://mementostudio.it/studio |
| Services | https://mementostudio.it/services |
| Projects | https://mementostudio.it/projects |
| LevelUp | https://mementostudio.it/levelup |
| Start | https://mementostudio.it/start |

Nell’hub compatibile l’overlay del figlio viene nascosto dopo l’handshake: logo e navbar visibili appartengono al contenitore. Se necessario, aggiornare separatamente il kit del contenitore.

Verifiche in `docs/VERIFICA_V7.md`. Documentazione originale del kit in `docs/NAVBAR_V12.md`; report precedenti in `docs/history/`. Licenze Inter e Tabler conservate in `docs/` e nell’HTML autonomo.
