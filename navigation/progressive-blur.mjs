// Eight overlapping Gaussian levels, following the Framer reference's
// band-pass construction. All masks are local, generated once, and static.
export const BLUR_LAYER_COUNT = 8;
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
function alphaAt(u, index) {
  const start = index / 8, peak = (index + 1) / 8, hold = Math.min(1, (index + 2) / 8), end = (index + 3) / 8;
  if (u <= start) return 0;
  if (u < peak) return smooth((u - start) / (peak - start));
  if (u <= hold || index >= 6) return 1;
  return 1 - smooth((u - hold) / (end - hold));
}
function mask(index, edge) {
  let stops = '';
  for (let n = 0; n <= 64; n++) {
    const y = n / 64, u = edge === 'top' ? 1 - y : y;
    const alpha = Math.sqrt(Math.max(0, alphaAt(u, index)));
    stops += `<stop offset="${y}" stop-color="white" stop-opacity="${alpha.toFixed(7)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" preserveAspectRatio="none"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><filter id="dither" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.83" numOctaves="1" seed="${17 + index}" result="grain"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0" result="noise"/><feComposite in="SourceGraphic" in2="noise" operator="arithmetic" k1="0" k2="1" k3="0.014" k4="-0.007"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs><rect width="1024" height="1024" fill="url(#fade)" filter="url(#dither)"/></svg>`;
  // Percent encoding also escapes quotes so the result is safe in CSS url().
  return 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27');
}
export const progressiveBlurCSS = Array.from({ length: BLUR_LAYER_COUNT }, (_, index) => {
  const blur = 24 / 2 ** (7 - index);
  return `.blur:nth-child(${index + 1}) { --_blur: ${blur}px; }
    .veil--top .blur:nth-child(${index + 1}) { --_mask: url("${mask(index, 'top')}"); }
    .veil--bottom .blur:nth-child(${index + 1}) { --_mask: url("${mask(index, 'bottom')}"); }`;
}).join('\n');
