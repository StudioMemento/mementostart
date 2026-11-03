export const overlayCSS = `
:host {
  all: initial;
  --mm-rail: min(var(--memento-overlay-width,320px),calc(100% - var(--memento-overlay-gutter,20px) * 2));
  --mm-glyph-height: var(--memento-overlay-logo-height,11px);
  --mm-top: max(var(--memento-overlay-top,16px),env(safe-area-inset-top,0px));
  --mm-bottom-gap: calc((var(--mm-rail) - 200px) / 8);
  --mm-accent: var(--memento-overlay-accent,#ff7950);
  position:fixed; inset:0; z-index:var(--memento-overlay-z,1000); display:block;
  pointer-events:none; color:#f5f4f2; font:10px/1.3 Inter,Arial,sans-serif;
  background:transparent; opacity:1; filter:none; transform:none; isolation:auto; contain:none;
  -webkit-font-smoothing:antialiased;
}
:host([hidden]) { display:none !important; }
*,*::before,*::after { box-sizing:border-box; }
.mm-edge { position:absolute; inset-inline:0; height:20%; z-index:0; overflow:hidden; pointer-events:none; background:transparent; }
.mm-edge--top { top:-1px; transform:rotate(180deg); }
.mm-edge--bottom { bottom:-1px; }
.mm-filter { position:absolute; inset:0; border-radius:0; pointer-events:none; opacity:1; background:transparent;
  -webkit-backdrop-filter:blur(var(--mm-radius)); backdrop-filter:blur(var(--mm-radius));
  -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-size:100% 100%; mask-size:100% 100%; }
.mm-wordmark,.mm-dock { position:absolute; left:50%; width:var(--mm-rail); transform:translateX(-50%); z-index:20; }
.mm-wordmark { top:var(--mm-top); display:flex; align-items:flex-start; min-height:44px; padding:3px 0 0; pointer-events:auto; color:inherit; text-decoration:none; }
.mm-letter-row { display:flex; width:100%; height:var(--mm-glyph-height); justify-content:space-between; align-items:center; }
.mm-glyph { display:block; flex:none; height:var(--mm-glyph-height); fill:currentColor; overflow:visible; }
.mm-dock { bottom:-4px; width:calc(var(--mm-rail) + 8px); display:flex; align-items:center; justify-content:space-between; gap:0; margin:0;
  /* A percentage margin resolves against the viewport width, as does the rail. */
  margin-bottom:calc(var(--mm-bottom-gap) + env(safe-area-inset-bottom,0px)); padding:0; border:0; background:transparent; }
.mm-link { display:flex; position:relative; flex:0 0 48px; width:48px; height:48px; justify-content:center; align-items:center; border:0; padding:0;
  pointer-events:auto; color:inherit; text-decoration:none; background:transparent; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
.mm-tile { position:relative; width:40px; height:40px; display:grid; place-items:center; border-radius:10px; overflow:hidden; background:#040506; border:1px solid #ffffff1f;
  box-shadow:inset 0 1px 0 #ffffff07; transition:transform 220ms ease; }
.mm-tile::before,.mm-tile::after { content:""; position:absolute;
  opacity:0; pointer-events:none; transition:opacity 220ms ease; }
.mm-tile::before { inset:0; border-radius:inherit;
  background:radial-gradient(ellipse 80% 62% at 50% 115%,#ff994ac7 0%,#ff79506b 35%,#ff79501f 58%,transparent 83%); }
.mm-tile::after { left:12%; right:12%; bottom:-6px; height:16px;
  background:radial-gradient(ellipse at 50% 70%,#ffb86e90 0%,#ff795050 32%,transparent 75%); filter:blur(5px); }
.mm-symbol { position:relative; z-index:1; display:block; width:34px; height:34px; overflow:hidden; opacity:.9; filter:grayscale(1) brightness(calc(.98 * var(--mm-icon-gain,1))); transition:filter 220ms ease,opacity 220ms ease; }
.mm-memento-light { opacity:var(--mm-memento-light,0); transition:opacity 220ms ease; }
.mm-link[aria-current="page"] { --mm-memento-light:1; }
.mm-link[aria-current="page"] .mm-tile::before { opacity:1; }
.mm-link[aria-current="page"] .mm-tile::after { opacity:1; }
.mm-link[aria-current="page"] .mm-symbol { opacity:1; filter:grayscale(0) saturate(1.12) brightness(calc(1.15 * var(--mm-icon-gain,1))); }
.mm-wordmark:focus-visible,.mm-link:focus-visible { outline:1px solid #ffffffb3; outline-offset:3px; border-radius:10px; }
@media (hover:hover) and (pointer:fine) {
  .mm-link:not([aria-current="page"]):hover .mm-symbol { opacity:1; filter:grayscale(.75) brightness(calc(1.04 * var(--mm-icon-gain,1))); }
  .mm-link:not([aria-current="page"]):hover { --mm-memento-light:1; }
}
.mm-link:active .mm-tile { transform:scale(.97); }
@media (prefers-reduced-motion:reduce) {
  .mm-tile,.mm-tile::before,.mm-tile::after,.mm-symbol,.mm-memento-light { transition:none; }
  .mm-link:active .mm-tile { transform:none; }
}
/* Explicit site choice, not an automatic shutdown when Windows disables transparency. */
:host([blur="off"]) .mm-edge { display:none; }
@media (prefers-reduced-transparency:reduce) {
  :host([respect-system-transparency]) .mm-edge { display:none; }
}
@media (forced-colors:active) {
  .mm-edge { display:none; }
  .mm-symbol { forced-color-adjust:none; }
  .mm-tile { border:1px solid ButtonText; }
  .mm-link[aria-current="page"] { outline:2px solid Highlight; }
}
@media print { :host { display:none !important; } }
`;

export const legacyHostLayoutCSS = `
html[data-memento-overlay-host="v7"] #world,
html[data-memento-overlay-host="v7"] #page-shell { bottom:0; }
@media(max-width:600px) { html[data-memento-overlay-host="v7"] .utility { top:max(68px,calc(env(safe-area-inset-top,0px) + 52px)); } }
`;
