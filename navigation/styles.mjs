// All styling stays inside the component's shadow root.
export const overlayCSS = `
:host {
  --_width: min(var(--memento-overlay-width, 400px), calc(100% - var(--memento-overlay-gutter, 10%) * 2));
  --_amber: var(--memento-overlay-accent, #ff7950);
  --_top: max(var(--memento-overlay-top, 18px), env(safe-area-inset-top, 0px));
  --_bottom: max(var(--memento-overlay-bottom, 18px), calc(env(safe-area-inset-bottom, 0px) + 8px));
  position: fixed; inset: 0; z-index: var(--memento-overlay-z, 1000);
  display: block; pointer-events: none;
  font: 11px/1.3 Inter, Arial, sans-serif; color: #f4f4f4;
  -webkit-font-smoothing: antialiased;
}
:host([hidden]) { display: none !important; }
*, *::before, *::after { box-sizing: border-box; }
.veil { position: absolute; left: 0; right: 0; height: 20vh; height: 20dvh; pointer-events: none; overflow: hidden; }
.veil--top { top: 0; --_direction: to bottom; }
.veil--bottom { bottom: 0; --_direction: to top; }
.veil::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(var(--_direction), rgb(4 5 7 / .28) 0%, rgb(4 5 7 / .17) 23%, rgb(4 5 7 / .055) 48%, rgb(4 5 7 / .012) 72%, transparent 100%);
}
.blur { position: absolute; inset: 0; pointer-events: none;
  -webkit-backdrop-filter: blur(var(--_blur)); backdrop-filter: blur(var(--_blur));
  -webkit-mask-image: linear-gradient(var(--_direction), #000 0%, #000 var(--_hold), transparent var(--_end));
  mask-image: linear-gradient(var(--_direction), #000 0%, #000 var(--_hold), transparent var(--_end));
}
.blur:nth-child(1) { --_blur: 1px; --_hold: 32%; --_end: 100%; }
.blur:nth-child(2) { --_blur: 3px; --_hold: 20%; --_end: 67%; }
.blur:nth-child(3) { --_blur: 7px; --_hold: 9%; --_end: 49%; }
.blur:nth-child(4) { --_blur: 14px; --_hold: 3%; --_end: 36%; }
.blur:nth-child(5) { --_blur: 24px; --_hold: 0%; --_end: 25%; }
.wordmark, nav { position: absolute; left: 50%; width: var(--_width); transform: translateX(-50%); }
.wordmark { top: var(--_top); min-height: 44px; display: flex; align-items: flex-start; padding: 7px 0; pointer-events: auto; text-decoration: none; }
.wordmark img { display: block; width: 100%; height: auto; aspect-ratio: 1417.32 / 56.70; object-fit: contain; opacity: .94; transition: opacity 220ms ease; }
.wordmark:hover img, .wordmark:focus-visible img { opacity: 1; }
nav { bottom: var(--_bottom); display: flex; align-items: center; justify-content: space-between; gap: 0; padding: 0; background: transparent; border: 0; pointer-events: none; }
.station { position: relative; display: flex; flex: 0 0 48px; width: 48px; height: 62px; align-items: flex-start; justify-content: center; padding: 2px 0 12px; color: inherit; text-decoration: none; pointer-events: auto; background: transparent; border: 0; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.icon { width: 46px; height: 46px; display: block; overflow: hidden; filter: grayscale(1) brightness(.9); opacity: .86; transform-origin: 50% 60%; transition: filter 280ms ease, opacity 280ms ease, transform 280ms cubic-bezier(.2,.7,.2,1); }
.station[aria-current="page"] .icon { filter: grayscale(0) brightness(1.06) drop-shadow(0 0 3px #ff795061) drop-shadow(0 0 9px #ff79502e); opacity: 1; }
.dot { position: absolute; left: calc(50% - 2px); bottom: 1px; width: 4px; height: 4px; border-radius: 50%; background: var(--_amber); box-shadow: 0 0 7px #ff795092; opacity: 0; transform: scale(.65); transition: opacity 220ms ease, transform 220ms ease; }
.station[aria-current="page"] .dot { opacity: 1; transform: scale(1); }
.label { position: absolute; left: 50%; bottom: calc(100% + 10px); transform: translate(-50%, 4px); opacity: 0; pointer-events: none; white-space: nowrap; color: #e8e8e8; font-size: 10px; letter-spacing: .12em; text-shadow: 0 1px 12px #000, 0 1px 4px #000; transition: opacity 180ms ease, transform 180ms ease; }
.station:first-child .label { left: 0; transform: translate(0, 4px); }
.station:last-child .label { left: auto; right: 0; transform: translate(0, 4px); }
.station:focus-visible, .wordmark:focus-visible { outline: 1px solid var(--_amber); outline-offset: 5px; border-radius: 2px; }
.station:focus-visible .label { opacity: 1; transform: translate(-50%, 0); }
.station:first-child:focus-visible .label, .station:last-child:focus-visible .label { transform: translate(0, 0); }
@media (hover: hover) and (pointer: fine) {
  .station:hover .icon { transform: translateY(-3px) scale(1.06); filter: grayscale(1) brightness(1.18); opacity: 1; }
  .station[aria-current="page"]:hover .icon { filter: grayscale(0) brightness(1.13) drop-shadow(0 0 4px #ff79507a) drop-shadow(0 0 12px #ff79503d); }
  .station:hover .label { opacity: 1; transform: translate(-50%, 0); }
  .station:first-child:hover .label, .station:last-child:hover .label { transform: translate(0, 0); }
}
.station:active .icon { transform: translateY(0) scale(.96); }
@media (max-width: 600px) {
  :host { --_top: max(var(--memento-overlay-top, 12px), env(safe-area-inset-top, 0px)); --_bottom: max(var(--memento-overlay-bottom, 13px), calc(env(safe-area-inset-bottom, 0px) + 7px)); }
  .station { flex-basis: 44px; width: 44px; height: 57px; }
  .icon { width: 42px; height: 42px; }
  .blur:nth-child(4) { --_blur: 10px; }
  .blur:nth-child(5) { --_blur: 18px; }
}
@media (max-height: 460px) and (orientation: landscape) {
  :host { --_top: max(6px, env(safe-area-inset-top, 0px)); --_bottom: max(6px, env(safe-area-inset-bottom, 0px)); }
  .station { height: 50px; }
  .icon { width: 38px; height: 38px; }
}
@media (prefers-reduced-motion: reduce) {
  .icon, .dot, .label, .wordmark img { transition: none; }
  .station:hover .icon, .station:active .icon { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .blur { -webkit-backdrop-filter: none; backdrop-filter: none; }
  .veil::after { background: linear-gradient(var(--_direction), rgb(4 5 7 / .65), rgb(4 5 7 / .35) 42%, transparent); }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .veil::after { background: linear-gradient(var(--_direction), rgb(4 5 7 / .5), rgb(4 5 7 / .14) 48%, transparent); }
}
@media (forced-colors: active) {
  .veil { display: none; }
  .icon { forced-color-adjust: none; }
  .station[aria-current="page"] { outline: 2px solid Highlight; }
  .dot { background: Highlight; }
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
