// One compositing surface per edge. Avoid overlapping partially masked backdrops.
export const BLUR_LAYER_COUNT = 1;
function edgeFade(direction) {
  const stops = Array.from({length:33}, (_, i) => {
    const p = i / 32, t = Math.max(0, Math.min(1, (p - .12) / .88));
    return `rgb(0 0 0 / ${(1-t*t*(3-2*t)).toFixed(5)}) ${(p*100).toFixed(3)}%`;
  });
  return `linear-gradient(${direction},${stops.join(',')})`;
}
export const progressiveBlurCSS = `
.veil--top .blur { --edge-mask: ${edgeFade('to bottom')}; }
.veil--bottom .blur { --edge-mask: ${edgeFade('to top')}; }
`;
