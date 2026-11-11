# Memento Start — V14 (React + VFX)

The START page rebuilt on React + Vite, with the R6 VFX set: loading, interactions, text, scroll, background.
Markup, copy, layout CSS, images and the shared navigation overlay come unchanged from the V13 skeleton.

## Run and deploy

```sh
npm install
npm run dev       # http://localhost:4173
npm run build     # type-check, bundle, prerender → dist/
npm run preview   # serves dist/
```

Vercel: import the folder as-is. `vercel.json` sets framework **Vite**, build `npm run build`, output `dist`.
The page is prerendered at build time (`scripts/prerender.mjs`), so the HTML ships with its content and React hydrates it.

## Structure

```
index.html                 head, first-paint script, prerendered navigation overlay, #root
public/                    navigation kit, images, font, favicon (served as-is)
src/config.ts              contacts and links
src/components/            Hero, Contact, Location, Faq, Legal, Explore, PolicyDialog, FitLine
src/styles/                start.css, gradients.css, artwork.css, navigation-insets.css (from V13)
src/vfx/
  engine.ts                the engine: no React inside, reusable on the other pages
  shaders.ts               GLSL: background, veil (loading + scroll), glyph, tab, particles
  registry.ts              list of reacting elements
  react.tsx                <VfxProvider>, useVfx(), useVfxInvalidate()
  vfx.css                  canvas layers, monochrome resting gradients
```

## Making an element react

```tsx
const ref = useVfx<HTMLAnchorElement>('tab');                 // cut-corner card: border + surface cells
const ref = useVfx<HTMLSpanElement>('text', { gain: 0.9 });   // cells inside the glyphs
const ref = useVfx<HTMLSpanElement>('icon');                  // a CSS-masked icon, treated like a glyph
const ref = useVfx<HTMLElement>('column');                    // marks the content column (one per page)
```

`gain` scales the response; `cut: 'tl'` is for tabs with only the top-left corner cut (the map).
Text targets need no duplicate markup: the engine rasterises each glyph where the browser placed it.

## How the briefs map to the code

| Brief | Where | Behaviour |
|---|---|---|
| 1 Loading | `VEIL_FRAG`, `uLoad` | Cells of the page itself join in a clustered random order; late groups stay amber, a mesh trace fades, nothing amber is left at the end. |
| 2 Interactions | `TAB_FRAG` | Nearest stretch of border lights from outside the tab; inside, cells switch on and off, sparse islands answer weakly; neighbours in range answer at half strength. |
| 4 Text | `GLYPH_FRAG` + particles | Cells inside the nearest glyphs, local warming of the grey gradient, thin outer glow, a few triangles that detach and end. |
| 5 Scroll | `VEIL_FRAG`, `uScrollE` | Exit and entry bands fragment by position, so a stop keeps the phase reached; amber and particles exist only while scroll energy lasts. |
| 6 Background | `BG_FRAG` | Three overlapping plate layers on the lateral margins: wide and lighter at the viewport edge, finer and darker toward the layout, near-silent centre; slow light wave; amber on edges and faces near the pointer. |

Release: the pointer deposits energy where it leaves, and every cell decays at its own rate, so groups let go at different times.

## Tuning

All numbers are in `TUNE` at the top of `src/vfx/engine.ts` (durations, cell sizes, ranges, particle count, resolution caps).
Colours: the amber scale is `ramp()` in `shaders.ts` (#FF4500 → #FFBF00). The surface black is `TUNE.base`.

Resting gradients are monochrome (block at the end of `vfx.css`): delete that block to return to the warm V13 gradients.

## Performance design

- Two canvases, no libraries: the engine chunk is ~13 kB gzip and loads after the content.
- The energy canvas draws only while something is happening (pointer energy, particles, scroll, loading). At rest it costs nothing.
- Only targets a pointer sample can reach are drawn; glyph masks are built once, during idle time.
- Background: 30 fps for the slow wave, 60 fps only while the pointer reaches a margin; resolution capped at 1.5× (1.25× on touch).
- Quality tiers: frames that keep running long step the background down (0.75×, 0.5×, then rendered only when it changes). A software renderer starts on the last tier.
- The engine clock advances at most 50 ms per frame: a long frame slows the motion instead of skipping it.
- `prefers-reduced-motion`: static background, no loading sequence, no pointer or scroll energy.
- No WebGL2: the page is the plain V13 page.

## Hosted mode (Framer iframe, `?mementoEmbed=1`)

The surface is transparent there, so nothing opaque is drawn over the host page: loading and scroll show amber and mesh only, and the background fades to transparent toward the centre.

## Not verified here

- Frame cost on real GPUs and phones. Development ran in headless Chrome on a software renderer (2–4 fps), which is enough to check the look but not the speed.
- Safari and Firefox rendering, in particular glyph-mask alignment.
