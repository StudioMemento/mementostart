export const overlayCSS = `
:host {
  all: initial;
  --mm-rail: min(var(--memento-overlay-width,400px),calc(100% - var(--memento-overlay-gutter,10%) * 2));
  --mm-top: max(var(--memento-overlay-top,18px),env(safe-area-inset-top,0px));
  --mm-bottom: max(var(--memento-overlay-bottom,4px),calc(env(safe-area-inset-bottom,0px) + 2px));
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
.mm-wordmark { top:var(--mm-top); display:flex; align-items:flex-start; min-height:44px; padding:7px 0 0; pointer-events:auto; text-decoration:none; }
.mm-wordmark img { display:block; width:100%; height:auto; aspect-ratio:1417.32 / 28.35; object-fit:contain; opacity:.94; }
.mm-dock { bottom:var(--mm-bottom); display:flex; align-items:center; justify-content:space-between; gap:0; margin:0; padding:0; border:0; background:transparent; }
.mm-link { display:flex; position:relative; flex:0 0 48px; width:48px; height:48px; justify-content:center; align-items:center; border:0; padding:0;
  pointer-events:auto; color:inherit; text-decoration:none; background:transparent; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
.mm-link:first-child { justify-content:flex-start; }
.mm-link:last-child { justify-content:flex-end; }
.mm-tile { width:44px; height:44px; display:grid; place-items:center; border-radius:11px; background:#040506; border:1px solid #ffffff1f;
  box-shadow:inset 0 1px 0 #ffffff07; transition:transform 220ms ease,border-color 220ms ease,box-shadow 220ms ease; }
.mm-symbol { display:block; width:34px; height:34px; overflow:hidden; opacity:.9; filter:grayscale(1) brightness(.98); transition:filter 220ms ease,opacity 220ms ease; }
.mm-link[aria-current="page"] .mm-tile { border-color:color-mix(in srgb,var(--mm-accent) 35%,transparent); box-shadow:0 0 18px color-mix(in srgb,var(--mm-accent) 17%,transparent); }
.mm-link[aria-current="page"] .mm-symbol { opacity:1; filter:grayscale(0) saturate(1.3) brightness(1.18) drop-shadow(0 0 3px #ff7950a6) drop-shadow(0 0 9px #ff795070); }
.mm-label { position:absolute; bottom:calc(100% + 9px); left:50%; transform:translateX(-50%); color:#eee; letter-spacing:.12em; white-space:nowrap;
  pointer-events:none; opacity:0; text-shadow:0 1px 10px #000,0 1px 3px #000; transition:opacity 160ms ease; }
.mm-link:first-child .mm-label { left:0; transform:none; }
.mm-link:last-child .mm-label { left:auto; right:0; transform:none; }
.mm-wordmark:focus-visible,.mm-link:focus-visible { outline:1px solid var(--mm-accent); outline-offset:3px; border-radius:11px; }
.mm-link:focus-visible .mm-label { opacity:1; }
@media (hover:hover) and (pointer:fine) {
  .mm-link:hover .mm-tile { transform:translateY(-2px); border-color:#ffffff40; }
  .mm-link[aria-current="page"]:hover .mm-tile { border-color:var(--mm-accent); }
  .mm-link:hover .mm-label { opacity:1; }
  .mm-link:hover .mm-symbol { opacity:1; }
}
.mm-link:active .mm-tile { transform:scale(.97); }
@media (max-width:600px) {
  :host { --mm-top:max(var(--memento-overlay-top,12px),env(safe-area-inset-top,0px)); --mm-bottom:max(var(--memento-overlay-bottom,3px),calc(env(safe-area-inset-bottom,0px) + 2px)); }
  .mm-symbol { width:32px; height:32px; }
}
@media (max-height:460px) and (orientation:landscape) {
  :host { --mm-top:max(6px,env(safe-area-inset-top,0px)); --mm-bottom:max(2px,env(safe-area-inset-bottom,0px)); }
  .mm-tile { width:42px; height:42px; }
  .mm-symbol { width:30px; height:30px; }
}
@media (prefers-reduced-motion:reduce) {
  .mm-tile,.mm-symbol,.mm-label { transition:none; }
  .mm-link:hover .mm-tile,.mm-link:active .mm-tile { transform:none; }
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
