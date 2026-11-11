// Measured in Chrome on mementostudio.it/services on 2026-11-03.
// The gradient changes the radius spatially by blending adjacent levels.
// It never paints a black gradient over the page.
export const FRAMER_BLUR_RADII = Object.freeze([0.0546875,0.109375,0.21875,0.4375,0.875,1.75,3.5,7]);
export function blurMask(index) {
  if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError('Blur level: 0–7');
  const stops = [`transparent ${index * 12.5}%`, `#000 ${(index + 1) * 12.5}%`];
  if (index < 7) stops.push(`#000 ${(index + 2) * 12.5}%`);
  if (index < 6) stops.push(`transparent ${(index + 3) * 12.5}%`);
  return `linear-gradient(to bottom,${stops.join(',')})`;
}
export function edgeMarkup(edge) {
  if (!['top','bottom'].includes(edge)) throw new TypeError('Unknown edge');
  const layers = FRAMER_BLUR_RADII.map((radius, index) => {
    const mask = blurMask(index);
    return `<div class="mm-filter" style="z-index:${index+1};--mm-radius:calc(var(--memento-overlay-blur,7px) / ${2 ** (7-index)});-webkit-mask-image:${mask};mask-image:${mask}"></div>`;
  }).join('');
  return `<div class="mm-edge mm-edge--${edge}" aria-hidden="true">${layers}</div>`;
}
