// All styling stays inside the component's shadow root.
const topMask = new URL('./assets/blur-mask-top.svg', import.meta.url).href;
const bottomMask = new URL('./assets/blur-mask-bottom.svg', import.meta.url).href;
export const overlayCSS = `
:host {
  --_width: min(var(--memento-overlay-width, 400px), calc(100% - var(--memento-overlay-gutter, 10%) * 2));
  --_amber: var(--memento-overlay-accent, #ff7950);
  --_top: max(var(--memento-overlay-top, 18px), env(safe-area-inset-top, 0px));
  --_bottom: max(var(--memento-overlay-bottom, 4px), calc(env(safe-area-inset-bottom, 0px) + 2px));
  position: fixed; inset: 0; z-index: var(--memento-overlay-z, 1000);
  display: block; pointer-events: none;
  font: 11px/1.3 Inter, Arial, sans-serif; color: #f4f4f4;
  -webkit-font-smoothing: antialiased;
}
:host([hidden]) { display: none !important; }
*, *::before, *::after { box-sizing: border-box; }
.veil { position: absolute; left: 0; right: 0; height: 20vh; height: 20dvh; pointer-events: none; overflow: hidden; }
.veil--top { top: 0; --_mask: url("${topMask}"); }
.veil--bottom { bottom: 0; --_mask: url("${bottomMask}"); }
.blur { position: absolute; inset: 0; pointer-events: none;
  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
  -webkit-mask-image: var(--_mask); mask-image: var(--_mask);
  -webkit-mask-size: 100% 100%; mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; mask-mode: alpha;
}
.wordmark, nav { position: absolute; left: 50%; width: var(--_width); transform: translateX(-50%); }
.wordmark { top: var(--_top); min-height: 44px; display: flex; align-items: flex-start; padding: 7px 0; pointer-events: auto; text-decoration: none; }
.wordmark img { display: block; width: 100%; height: auto; aspect-ratio: 1417.32 / 28.35; object-fit: contain; opacity: .94; transition: opacity 220ms ease; }
.wordmark:hover img, .wordmark:focus-visible img { opacity: 1; }
nav { bottom: var(--_bottom); display: flex; align-items: center; justify-content: space-between; gap: 0; padding: 0; background: transparent; border: 0; pointer-events: none; }
.station { position: relative; display: flex; flex: 0 0 44px; width: 44px; height: 44px; align-items: center; justify-content: center; padding: 0; color: inherit; text-decoration: none; pointer-events: auto; background: transparent; border: 0; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.icon { width: 32px; height: 32px; display: block; overflow: hidden; filter: grayscale(1) brightness(.9); opacity: .86; transform-origin: 50% 60%; transition: filter 280ms ease, opacity 280ms ease, transform 280ms cubic-bezier(.2,.7,.2,1); }
.station[aria-current="page"] .icon { filter: grayscale(0) saturate(1.35) brightness(1.18) drop-shadow(0 0 2px #ff7950c7) drop-shadow(0 0 6px #ff79509e) drop-shadow(0 0 14px #ff795066); opacity: 1; }
.label { position: absolute; left: 50%; bottom: calc(100% + 10px); transform: translate(-50%, 4px); opacity: 0; pointer-events: none; white-space: nowrap; color: #e8e8e8; font-size: 10px; letter-spacing: .12em; text-shadow: 0 1px 12px #000, 0 1px 4px #000; transition: opacity 180ms ease, transform 180ms ease; }
.station:first-child .label { left: 0; transform: translate(0, 4px); }
.station:last-child .label { left: auto; right: 0; transform: translate(0, 4px); }
.station:focus-visible, .wordmark:focus-visible { outline: 1px solid var(--_amber); outline-offset: 5px; border-radius: 2px; }
.station:focus-visible .label { opacity: 1; transform: translate(-50%, 0); }
.station:first-child:focus-visible .label, .station:last-child:focus-visible .label { transform: translate(0, 0); }
@media (hover: hover) and (pointer: fine) {
  .station:hover .icon { transform: translateY(-3px) scale(1.06); filter: grayscale(1) brightness(1.18); opacity: 1; }
  .station[aria-current="page"]:hover .icon { filter: grayscale(0) saturate(1.4) brightness(1.24) drop-shadow(0 0 2px #ff7950e0) drop-shadow(0 0 7px #ff7950b0) drop-shadow(0 0 16px #ff795075); }
  .station:hover .label { opacity: 1; transform: translate(-50%, 0); }
  .station:first-child:hover .label, .station:last-child:hover .label { transform: translate(0, 0); }
}
.station:active .icon { transform: translateY(0) scale(.96); }
@media (max-width: 600px) {
  :host { --_top: max(var(--memento-overlay-top, 12px), env(safe-area-inset-top, 0px)); --_bottom: max(var(--memento-overlay-bottom, 3px), calc(env(safe-area-inset-bottom, 0px) + 2px)); }
  .icon { width: 30px; height: 30px; }
  .blur { -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
}
@media (max-height: 460px) and (orientation: landscape) {
  :host { --_top: max(6px, env(safe-area-inset-top, 0px)); --_bottom: max(2px, env(safe-area-inset-bottom, 0px)); }
  .icon { width: 28px; height: 28px; }
}
@media (prefers-reduced-motion: reduce) {
  .icon, .label, .wordmark img { transition: none; }
  .station:hover .icon, .station:active .icon { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .blur { -webkit-backdrop-filter: none; backdrop-filter: none; background: rgb(4 5 7 / .65); }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .blur { background: rgb(4 5 7 / .5); }
}
@media (forced-colors: active) {
  .veil { display: none; }
  .icon { forced-color-adjust: none; }
  .station[aria-current="page"] { outline: 2px solid Highlight; }
}
@media print { :host { display: none !important; } }
`;

// Compatibility patch for the published V2 hub, whose CSS reserved a black
// 100 px footer outside both the canvas and the embed. Applied only when its
// exact structural anchors are present; it never changes a child page layout.
export const legacyHostLayoutCSS = `
html[data-memento-overlay-host="v3"] #world,
html[data-memento-overlay-host="v3"] #page-shell { bottom: 0; }
@media (max-width: 600px) {
  html[data-memento-overlay-host="v3"] .utility { top: max(68px, calc(env(safe-area-inset-top, 0px) + 52px)); }
}
`;
