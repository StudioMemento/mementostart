# Memento Start — V15 (React + Three.js VFX)

Pagina START su React + Vite + TypeScript, con il sistema VFX del brief tecnico: un solo contesto WebGL (Three.js, shader GLSL propri), regia GSAP + ScrollTrigger, scroll nativo.
Markup, testi, layout CSS, immagini e navigazione condivisa restano quelli dello skeleton V13.

## Avvio

```sh
npm install
npm run dev        # http://localhost:4173
npm test           # test mirati (struttura, code energetiche, particelle, cleanup)
npm run build      # typecheck + bundle + prerender → dist/
npm run preview
```

Vercel: `vercel.json` è già impostato (framework Vite, output `dist`). `?vfx=high|medium|low` blocca un profilo di qualità per i confronti.

## Come funziona

Il DOM resta la fonte di verità per layout, semantica, focus e click. Un canvas fisso dietro al contenuto disegna il background e una rappresentazione sincronizzata di ogni superficie registrata (titoli e card con immagine, label, icone, divisori).
Quando texture, font e misure sono pronti l'engine aggiunge `html.vfx-live`: da quel momento il DOM smette di dipingere quelle superfici (niente doppio rendering). Qualsiasi errore, o la perdita del contesto, toglie la classe e torna la pagina DOM.

| Modulo (`src/vfx/`) | Responsabilità |
| --- | --- |
| `config.ts` | Colori, raggi, durate, densità, profili di qualità |
| `registry.ts`, `react.tsx` | Registro superfici, `useSurface('title' \| 'card')`, `useVfxSignals()` |
| `input.ts` | Pointer, touch, focus, uscita dal viewport, impulsi → campioni di energia |
| `scroll.ts` | Posizione, velocità filtrata, fasce (ScrollTrigger osserva lo scroll nativo) |
| `structure.ts` | Funzioni pure della composizione strutturale (le stesse formule degli shader) |
| `geometry.ts` | Triangolazioni stabili per seed: celle delle superfici, lamelle del background |
| `raster.ts` | Maschere dai glifi reali, icone, divisori; `object-fit` / `object-position` |
| `particles.ts` | Pool, emissione, curl noise, riciclo |
| `shaders.ts`, `engine.ts` | Risorse GPU, pass, bloom selettivo, loop unico (ticker GSAP) |

Canali separati: **struttura** (celle presenti/assenti: dipende solo da loading e posizione di scroll, calcolata nel vertex shader dalla posizione di riposo), **energia** (ambra: prossimità, hover, touch, focus), **emissioni** (particelle con vita propria).

Registrare una superficie:

```tsx
const ref = useSurface<HTMLAnchorElement>('card');            // pannello con angoli tagliati + contenuto
const ref = useSurface<HTMLHeadingElement>('title');          // tipografia grande, linguaggio completo nei glifi
const { invalidate, impulse } = useVfxSignals();              // contenuto cambiato / impulso locale
```

## Controlli eseguiti

- `tsc`, build di produzione con prerender, idratazione senza errori in console.
- 17 test: fascia centrale integra, progresso continuo e reversibile, soglie stabili per cella, inizio/fine documento, durata delle code (rilascio, scroll), fine delle particelle, triangolazione deterministica, cleanup dei listener.
- Screenshot in Chrome headless: quiete, prossimità sul background, titolo, hover card, FAQ (apertura e re-misura), chiusura, scroll in movimento / coda / stop, loading, reduced motion.

## Non verificato o limite noto

- **Prestazioni reali.** L'ambiente di sviluppo ha solo un renderer software (2–4 fps): nessuna misura di fps su GPU o telefoni. Le sequenze in movimento sono state controllate per fotogrammi, non a velocità reale.
- **Safari e Firefox**, in particolare l'allineamento glifi DOM → GPU.
- **Sincronia con lo scroll nativo.** Il canvas segue lo scroll a ogni frame; se il main thread resta indietro, le superfici GPU possono ritardare di un frame rispetto agli elementi rimasti DOM (mappa, anello di focus).
- **Mappa Google.** È un iframe: resta DOM e non si frammenta nelle fasce.
- **Sfocatura della navigazione.** L'overlay esistente sfoca il 20% alto e basso del viewport, quindi copre in parte le fasce di scroll (15%).
- **Peso.** Il chunk dell'engine (Three.js + GSAP) è ~193 kB gzip, caricato dopo il contenuto.
- **Modalità hosted (iframe Framer).** Superficie trasparente gestita, non riverificata in questa versione.
