import { progressiveBlurCSS } from './progressive-blur.mjs';
// Fresh optical layer: no tint, no opacity wrapper, one true backdrop per edge.
export const overlayCSS = `
:host {
 --rail-width:min(var(--memento-overlay-width,400px),calc(100% - var(--memento-overlay-gutter,10%) * 2));
 --rail-top:max(var(--memento-overlay-top,18px),env(safe-area-inset-top,0px));
 --rail-bottom:max(var(--memento-overlay-bottom,4px),calc(env(safe-area-inset-bottom,0px) + 2px));
 --edge-height:var(--memento-blur-height,clamp(180px,26dvh,300px));
 --edge-radius:var(--memento-blur-radius,42px);
 --accent:var(--memento-overlay-accent,#ff7950);
 position:fixed;inset:0;z-index:var(--memento-overlay-z,1000);display:block;
 pointer-events:none;background:transparent;color:#f4f3f1;font:10px/1.3 Inter,Arial,sans-serif;
 -webkit-font-smoothing:antialiased;
}
:host([hidden]){display:none!important}
*,*::before,*::after{box-sizing:border-box}
.veil{position:absolute;inset-inline:0;height:220px;height:var(--edge-height);pointer-events:none}
.veil--top{top:0}.veil--bottom{bottom:0}
.blur{position:absolute;inset:0;background:transparent;pointer-events:none;
 -webkit-backdrop-filter:blur(var(--edge-radius));backdrop-filter:blur(var(--edge-radius));
 -webkit-mask-image:var(--edge-mask);mask-image:var(--edge-mask);
 -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%}
${progressiveBlurCSS}
.wordmark,nav{position:absolute;left:50%;width:var(--rail-width);transform:translateX(-50%)}
.wordmark{top:var(--rail-top);min-height:44px;display:flex;align-items:flex-start;padding:7px 0 0;pointer-events:auto;text-decoration:none;-webkit-tap-highlight-color:transparent}
.wordmark img{width:100%;height:auto;aspect-ratio:1417.32 / 28.35;display:block;opacity:.94}
nav{bottom:var(--rail-bottom);display:flex;align-items:center;justify-content:space-between;gap:0;padding:0;background:transparent}
.station{position:relative;width:48px;height:48px;flex:0 0 48px;display:flex;align-items:center;justify-content:center;padding:0;pointer-events:auto;text-decoration:none;color:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
/* Visible box edges meet the logo edges; tap areas stay at least 48px. */
.station:first-child{justify-content:flex-start}.station:last-child{justify-content:flex-end}
.tile{display:grid;place-items:center;width:44px;height:44px;border-radius:11px;background:#08090b;border:1px solid rgb(255 255 255 / .12);box-shadow:inset 0 1px 0 rgb(255 255 255 / .025);transition:transform 240ms cubic-bezier(.2,.7,.2,1),border-color 240ms ease,box-shadow 240ms ease}
.icon{display:block;width:34px;height:34px;overflow:hidden;opacity:.9;filter:grayscale(1) brightness(.98);transition:filter 240ms ease,opacity 240ms ease}
.station[aria-current="page"] .tile{border-color:rgb(255 121 80 / .3);box-shadow:0 0 18px rgb(255 121 80 / .12),inset 0 0 12px rgb(255 121 80 / .04)}
.station[aria-current="page"] .icon{opacity:1;filter:grayscale(0) saturate(1.25) brightness(1.18) drop-shadow(0 0 3px #ff7950a6) drop-shadow(0 0 9px #ff795070)}
.label{position:absolute;bottom:calc(100% + 9px);left:50%;transform:translate(-50%,3px);white-space:nowrap;letter-spacing:.12em;opacity:0;pointer-events:none;text-shadow:0 1px 10px #000;transition:opacity 160ms ease,transform 160ms ease}
.station:first-child .label{left:0;transform:translateY(3px)}.station:last-child .label{left:auto;right:0;transform:translateY(3px)}
.station:focus-visible,.wordmark:focus-visible{outline:1px solid var(--accent);outline-offset:3px;border-radius:10px}
.station:focus-visible .label{opacity:1;transform:translate(-50%,0)}
.station:first-child:focus-visible .label,.station:last-child:focus-visible .label{transform:translateY(0)}
@media(hover:hover) and (pointer:fine){
 .station:hover .tile{transform:translateY(-2px);border-color:rgb(255 255 255 / .25)}
 .station:hover .icon{opacity:1}
 .station[aria-current="page"]:hover .tile{border-color:rgb(255 121 80 / .5);box-shadow:0 0 20px rgb(255 121 80 / .18)}
 .station:hover .label{opacity:1;transform:translate(-50%,0)}
 .station:first-child:hover .label,.station:last-child:hover .label{transform:translateY(0)}
}
.station:active .tile{transform:scale(.96)}
@media(max-width:600px){
 :host{--rail-top:max(var(--memento-overlay-top,12px),env(safe-area-inset-top,0px));--rail-bottom:max(var(--memento-overlay-bottom,3px),calc(env(safe-area-inset-bottom,0px) + 2px));--edge-radius:var(--memento-blur-radius,34px)}
 .icon{width:32px;height:32px}
}
@media(max-height:460px) and (orientation:landscape){
 :host{--rail-top:max(6px,env(safe-area-inset-top,0px));--rail-bottom:max(2px,env(safe-area-inset-bottom,0px));--edge-height:120px;--edge-radius:28px}
 .tile{width:42px;height:42px}.icon{width:30px;height:30px}
}
@media(prefers-reduced-motion:reduce){.tile,.icon,.label{transition:none}.station:hover .tile,.station:active .tile{transform:none}}
@media(prefers-reduced-transparency:reduce){.veil{display:none}.tile{background:#000}}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.veil{display:none}}
@media(forced-colors:active){.veil{display:none}.icon{forced-color-adjust:none}.station[aria-current="page"]{outline:2px solid Highlight}}
@media print{:host{display:none!important}}
`;
export const legacyHostLayoutCSS = `
html[data-memento-overlay-host="v3"] #world,
html[data-memento-overlay-host="v3"] #page-shell { bottom:0; }
@media(max-width:600px){html[data-memento-overlay-host="v3"] .utility{top:max(68px,calc(env(safe-area-inset-top,0px) + 52px))}}
`;
