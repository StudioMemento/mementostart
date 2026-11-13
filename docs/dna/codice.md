# Codice

Implementazione di riferimento: progetto `memento-start` (React, Vite, TypeScript, Three.js, GSAP con ScrollTrigger), cartella `src/vfx/`; lo sfondo in `src/vfx/bkg/`, i suoi plate in `public/assets/bkg/`, la loro produzione in `tools/bkg/`. Un solo contesto WebGL e un solo loop (ticker GSAP) per pagina.

## Dove vive ogni regola

| Regola del DNA | File | Chiave |
| --- | --- | --- |
| Palette ambra, gradiente dei titoli, nero | `config.ts` | `VFX.color` |
| Sfondo: plate, inquadratura, fuoco, glow, scroll | `bkg/renderer.ts`, `bkg/math.ts`, `config.ts` | `BkgRenderer`, `viewHalf`, `VFX.bkg` |
| Profondità di campo esagonale | `bkg/shaders.ts` | `BKG_PREP_FRAG`, `BKG_GATHER_FRAG`, `BKG_COMPOSITE_FRAG` |
| Reazione dello sfondo (celle in spazio schermo) | `engine.ts`, `bkg/renderer.ts` | `buildBackground`, `driveBackground`, mappa d'energia |
| Produzione dei plate | `tools/bkg/` | `scene.py` (Blender), `pack.py` |
| Celle delle card (fitte al bordo) | `config.ts`, `geometry.ts` | `VFX.chain.card`, `buildNetwork(..., edge)` |
| Reazione a catena | `chain.ts`, `config.ts` | `ChainField`, `VFX.chain.*` |
| Range dei testi (celle, non disco) | `engine.ts`, `config.ts` | `driveRange`, `VFX.type` |
| Tre livelli sui testi | `shaders.ts` | `OVERLAY_TITLE_FRAG` |
| Topologia e immagini delle card | `shaders.ts` | `OVERLAY_CARD_FRAG` |
| Incandescenza (campo di distanza) | `sdf.ts`, `raster.ts` | `signedDistance`, `distanceField` |
| Luce del bordo | `border.ts` | `BorderLight` (96 segmenti) |
| Fasce e frammentazione | `structure.ts`, `vfx.css` | `bandEnable`, `fragmentation`, `--vfx-band` |
| Deriva allo stop | `shaders.ts`, `config.ts` | `SURFACE_VERT`, `VFX.scroll` |
| Puntatore, fermo, sorgenti | `engine.ts`, `config.ts` | `driveBackground`, `VFX.pointer` |
| Schegge, fessure, zone calde | `tools/bkg/scene.py` | `build_strata`, `build_stratum` |
| Studio riflesso, ossidiana, luce dalla base | `tools/bkg/scene.py` | `studio_world`, `obsidian_material`, `ember_material` |
| Bloom, striatura | `engine.ts`, `config.ts` | `render`, `VFX.bloom`, `VFX.post.streak` |
| Grade finale (spalla, vignettatura, grana, aberrazione, dithering) | `shaders.ts`, `config.ts` | `GRADE_FRAG`, `VFX.post` |
| Profili di qualità | `config.ts` | `VFX.quality` |
| Mappa | `src/components/locationMap.ts` | posizioni delle etichette sul render della città |

## Registrare una superficie

```tsx
const title = useSurface<HTMLDivElement>('title');
const card = useSurface<HTMLAnchorElement>('card');
const panel = useSurface<HTMLDivElement>('card', { panel: true, gain: 0.7 });
const map = useSurface<HTMLAnchorElement>('card', { cut: 'tl', gain: 0.45, source: '.map-source', ownColour: true });
```

| Opzione | Significato |
| --- | --- |
| `cut` | angoli tagliati: `both` (default), `tl` (solo in alto a sinistra) o `none` |
| `gain` | forza della risposta rispetto a una superficie primaria |
| `panel` | in hover l'ambra solo vicino al cursore |
| `source` | selettore di un elemento interno da cui l'energia parte in hover |
| `solid` | non si frammenta mai con lo scroll; solo per contenuti che l'engine non può disegnare, come un iframe |
| `ownColour` | in hover l'immagine mostra i suoi colori invece del grading d'ambra (la mappa notturna, già illuminata nella palette) |

`useVfxSignals()` dà `invalidate()` (ricalcola dopo un cambio di layout) e `impulse(el)` (un impulso da un elemento).

## Checklist per una nuova pagina

- [ ] Nessuna ambra a riposo; il budget d'ambra è rispettato in hover.
- [ ] Il range dei testi è fatto di celle (nessun disco visibile).
- [ ] La prima schermata ha il titolo al centro della fascia di lettura e nessun testo nella fascia d'ingresso; l'ultima ha la chiusura al centro e l'uscita attiva in alto.
- [ ] Lo sfondo è il mondo d'ossidiana: fuoco di riposo sul piano intermedio, centro scuro e sfocato dietro i testi, fuori fuoco sopra titoli e card.
- [ ] Le immagini sono in bianco e nero a riposo, con bordi sfumati e neri che restano neri.
- [ ] Reduced motion, touch, tastiera e fallback senza WebGL sono verificati.
- [ ] Frame stabili sul profilo `high` di una GPU reale; `?vfx=low` resta leggibile.
- [ ] `tsc`, test (`npm test`) e build con prerender sono puliti; nessun errore in console.
