// Generates public/assets/images/location-map.svg and src/components/locationMap.ts.
// A stylised map of Maniago in the Memento material: graphite cells, finer around the studio; landmarks as faceted
// nodes; walking lines from the studio. Grayscale on black: the engine grades it like every other card image
// (black and white at rest, warm on hover). No tiles, no API key. Coordinates: it.wikivoyage.org/wiki/Maniago and the
// studio's Google Maps place. Run: node scripts/location-map.mjs, then rasterise the SVG to the WebP the page uses
// (browsers upload an SVG <img> to WebGL at its layout size, so the engine gets a bitmap):
//   rsvg-convert -w 2100 public/assets/images/location-map.svg -o map.png && cwebp -q 88 map.png -o public/assets/images/location-map.webp
import Delaunator from 'delaunator';
import { writeFileSync } from 'node:fs';

const W = 1500, H = 1000;
const LON0 = 12.6995, LAT0 = 46.1765, LAT_C = 46.1715;
const M_PER_DEG_LON = 111320 * Math.cos((LAT_C * Math.PI) / 180), M_PER_DEG_LAT = 110540;
const PX_PER_M = W / ((12.7160 - LON0) * M_PER_DEG_LON);
const proj = (lat, lon) => [(lon - LON0) * M_PER_DEG_LON * PX_PER_M, (LAT0 - lat) * M_PER_DEG_LAT * PX_PER_M];

const studio = { id: 'studio', name: 'Studio Memento', sub: 'Piazzetta Trento', lat: 46.1728195, lon: 12.7091736 };
const places = [
  { id: 'piazza', name: 'Piazza Italia', lat: 46.170833, lon: 12.707222, side: 'left', street: true },
  { id: 'duomo', name: 'Duomo', lat: 46.170118, lon: 12.70861, side: 'below' },
  { id: 'museo', name: 'Museo delle Coltellerie', lat: 46.170679, lon: 12.710207, side: 'right' },
  { id: 'stazione', name: 'Stazione', lat: 46.170229, lon: 12.714323, side: 'above' },
  { id: 'castello', name: 'Castello', lat: 46.17273, lon: 12.701157, side: 'right', uphill: true },
];
const [sx, sy] = proj(studio.lat, studio.lon);
for (const p of places) {
  [p.x, p.y] = proj(p.lat, p.lon);
  const m = Math.hypot(p.x - sx, p.y - sy) / PX_PER_M;
  // on foot: straight line × 1.25 for the streets, 80 m a minute, a little more uphill
  p.min = Math.max(1, Math.round((m * 1.25) / 80 * (p.uphill ? 1.2 : 1)));
}

// deterministic noise
let seed = 20261112;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// points: denser around the studio, open toward the edges; a ring of border points closes the field
const pts = [];
for (let i = 0; i <= 16; i++) { pts.push([(W * i) / 16, 0], [(W * i) / 16, H]); }
for (let j = 1; j < 11; j++) { pts.push([0, (H * j) / 11], [W, (H * j) / 11]); }
for (let k = 0; k < 9000 && pts.length < 760; k++) {
  const x = rnd() * W, y = rnd() * H;
  const d = Math.hypot(x - sx, y - sy) / 520;
  const spacing = 26 + 92 * Math.min(1, d) ** 1.1;
  if (pts.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < spacing * spacing * 0.55)) continue;
  pts.push([x, y]);
}
for (const p of places) pts.push([p.x, p.y]);
pts.push([sx, sy]);
const del = Delaunator.from(pts);

const f2 = v => v.toFixed(1);
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
out.push(`<defs><radialGradient id="lift" cx="${f2(sx / W)}" cy="${f2(sy / H)}" r=".62"><stop offset="0" stop-color="#1c1c1c"/><stop offset=".55" stop-color="#0b0b0b"/><stop offset="1" stop-color="#030303"/></radialGradient></defs>`);
out.push(`<rect width="${W}" height="${H}" fill="url(#lift)"/>`);

// cells: each face a flat graphite tone lit from the studio's side, edges as faint incisions
const faces = [], lines = new Set();
for (let t = 0; t < del.triangles.length; t += 3) {
  const a = pts[del.triangles[t]], b = pts[del.triangles[t + 1]], c = pts[del.triangles[t + 2]];
  const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
  const d = Math.min(1, Math.hypot(cx - sx, cy - sy) / 700);
  const nx = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
  const tone = Math.round(14 + 20 * (1 - d) ** 1.4 + 9 * rnd() + (nx > 0 ? 3 : 0));
  faces.push(`<path d="M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}L${f2(c[0])} ${f2(c[1])}Z" fill="rgb(${tone},${tone},${tone})"/>`);
  for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    const key = [p, q].map(v => v.join(',')).sort().join('|');
    if (lines.has(key)) continue;
    lines.add(key);
  }
}
out.push(`<g opacity=".9">${faces.join('')}</g>`);
const edgeLines = [];
for (const key of lines) {
  const [p, q] = key.split('|').map(s => s.split(',').map(Number));
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const d = Math.min(1, Math.hypot(mx - sx, my - sy) / 620);
  const op = (0.05 + 0.13 * (1 - d) ** 1.5).toFixed(3);
  edgeLines.push(`<path d="M${f2(p[0])} ${f2(p[1])}L${f2(q[0])} ${f2(q[1])}" stroke="#fff" stroke-opacity="${op}" stroke-width="${(0.6 + 0.6 * (1 - d)).toFixed(2)}"/>`);
}
out.push(`<g fill="none">${edgeLines.join('')}</g>`);

// the castle hill: a few contour rings
const castle = places.find(p => p.id === 'castello');
for (let i = 1; i <= 4; i++) {
  out.push(`<ellipse cx="${f2(castle.x)}" cy="${f2(castle.y)}" rx="${34 * i + 10}" ry="${24 * i + 6}" transform="rotate(-18 ${f2(castle.x)} ${f2(castle.y)})" fill="none" stroke="#fff" stroke-opacity="${(0.16 - i * 0.028).toFixed(3)}" stroke-width="1.2"/>`);
}

// via Roma: the street that joins Piazzetta Trento and Piazza Italia; walking lines to the rest
const piazza = places.find(p => p.id === 'piazza');
out.push(`<path d="M${f2(sx)} ${f2(sy)}L${f2(piazza.x)} ${f2(piazza.y)}" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`);
for (const p of places) {
  if (p.street) continue;
  out.push(`<path d="M${f2(sx)} ${f2(sy)}L${f2(p.x)} ${f2(p.y)}" stroke="#fff" stroke-opacity=".32" stroke-width="1.6" stroke-dasharray="2 9" stroke-linecap="round"/>`);
}

// landmarks: small faceted diamonds
for (const p of places) {
  const r = 9;
  out.push(`<g transform="translate(${f2(p.x)} ${f2(p.y)})"><circle r="22" fill="none" stroke="#fff" stroke-opacity=".14"/><path d="M0 ${-r}L${r} 0L0 ${r}L${-r} 0Z" fill="#9a9a9a"/><path d="M0 ${-r}L${r} 0L0 0Z" fill="#d8d8d8"/><path d="M${-r} 0L0 ${r}L0 0Z" fill="#5c5c5c"/></g>`);
}

// the studio: a faceted pin with rings, the brightest point of the map
out.push(`<g transform="translate(${f2(sx)} ${f2(sy)})">`
  + [150, 104, 66].map((r, i) => `<circle r="${r}" fill="none" stroke="#fff" stroke-opacity="${(0.08 + i * 0.07).toFixed(2)}" stroke-width="${1 + i * 0.4}"/>`).join('')
  + `<circle r="40" fill="#fff" fill-opacity=".05"/>`
  + `<g transform="translate(0 -6) scale(1.45)"><path d="M0 -58L26 -34L0 6Z" fill="#f2f2f2"/><path d="M0 -58L-26 -34L0 6Z" fill="#b9b9b9"/><path d="M-26 -34L0 -26L0 6Z" fill="#7d7d7d"/><path d="M26 -34L0 -26L0 6Z" fill="#dedede"/><circle cy="-36" r="8" fill="#141414"/></g>`
  + `<circle r="4" fill="#fff"/></g>`);

// north and scale
out.push(`<g transform="translate(${W - 80} 92)" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"><path d="M0 26L0 -26M-9 -14L0 -26L9 -14"/></g>`);
const bar = 100 * PX_PER_M;
out.push(`<g transform="translate(${W - 80 - bar} ${H - 70})" stroke="#fff" stroke-opacity=".55" stroke-width="1.5" fill="none"><path d="M0 -6L0 6M0 0L${f2(bar)} 0M${f2(bar)} -6L${f2(bar)} 6"/></g>`);
out.push('</svg>');
writeFileSync(new URL('../public/assets/images/location-map.svg', import.meta.url), out.join(''));

// label positions for the component (fractions of the image)
const fx = v => +(v / W).toFixed(4), fy = v => +(v / H).toFixed(4);
const ts = `// Generated by scripts/location-map.mjs: positions are fractions of location-map.svg (${W}×${H}).
export const MAP_ASPECT = ${W} / ${H};
export const MAP_STUDIO = { x: ${fx(sx)}, y: ${fy(sy)} };
export const MAP_PLACES = ${JSON.stringify(places.map(p => ({ id: p.id, name: p.name, minutes: p.min, side: p.side, x: fx(p.x), y: fy(p.y) })), null, 2)} as const;
export const MAP_NORTH = { x: ${fx(W - 80)}, y: ${fy(92 - 52)} };
export const MAP_SCALE = { x: ${fx(W - 80 - bar / 2)}, y: ${fy(H - 70 + 22)} };
`;
writeFileSync(new URL('../src/components/locationMap.ts', import.meta.url), ts);
console.log('map ok', places.map(p => `${p.name} ${p.min}′`).join(', '));
