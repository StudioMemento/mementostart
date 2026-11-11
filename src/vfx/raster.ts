import { VFX } from './config';

/**
 * Masks and textures from the real DOM: glyphs exactly where the browser placed them, masked icons, dividers.
 * This is a preparation step, cached per surface and redone only when content, fonts or layout change.
 */
type Op =
  | { type: 'text'; ch: string; x: number; y: number; font: string; color: string; clip: DOMRect | null }
  | { type: 'icon'; url: string; cx: number; cy: number; w: number; h: number; color: string; m: [number, number, number, number] }
  | { type: 'line'; x: number; y: number; w: number };

export interface Collected { ops: Op[]; box: DOMRect; fontSize: number }

const DIVIDERS = '.faq-item:not(:last-child), .legal-group button';
const icons = new Map<string, Promise<HTMLImageElement | null>>();
let measure: CanvasRenderingContext2D | null = null;
const ascents = new Map<string, number>();

/** Rest state is monochrome: every stored colour is reduced to its luminance. */
function neutral(color: string) {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return '#f3f0ea';
  const [r, g, b, a = 1] = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return `rgba(${l},${l},${l},${a})`;
}

function loadIcon(url: string) {
  let p = icons.get(url);
  if (!p) {
    p = new Promise(resolve => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    icons.set(url, p);
  }
  return p;
}

/** Reads the surface's subtree. Call with the DOM in its normal (non-hidden) styling. */
export function collect(root: HTMLElement): Collected {
  measure ??= document.createElement('canvas').getContext('2d')!;
  const ops: Op[] = [];
  const box = root.getBoundingClientRect();
  const styles = new Map<Element, CSSStyleDeclaration>();
  const style = (el: Element) => { let s = styles.get(el); if (!s) { s = getComputedStyle(el); styles.set(el, s); } return s; };
  const clipOf = (el: Element | null): Element | null => {
    for (let e = el; e && root.contains(e); e = e.parentElement) {
      const s = style(e);
      if ((s.webkitBackgroundClip || s.backgroundClip) === 'text') return e;
    }
    return null;
  };
  let fontSize = 0;
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      const el = node as Element, s = style(el);
      if (el.tagName === 'IMG' || el.tagName === 'IFRAME' || el.classList.contains('sr-only') || s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return NodeFilter.FILTER_REJECT;
      // content of a closed accordion item is not on screen, whatever rectangles the browser still reports for it
      const parent = el.parentElement;
      if (parent instanceof HTMLDetailsElement && !parent.open && el.tagName !== 'SUMMARY') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const visit = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement, s = style(el);
      const mask = /url\((['"]?)(.+?)\1\)/.exec(s.webkitMaskImage || s.maskImage || '')?.[2];
      const filled = s.backgroundColor !== 'rgba(0, 0, 0, 0)';
      if (mask && (filled || s.backgroundImage !== 'none')) {
        const r = el.getBoundingClientRect();
        const t = /matrix\(([^)]+)\)/.exec(s.transform)?.[1].split(',').map(Number);
        ops.push({ type: 'icon', url: mask, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: el.offsetWidth, h: el.offsetHeight,
          color: filled ? neutral(s.backgroundColor) : '#d4d2ce', m: t ? [t[0], t[1], t[2], t[3]] : [1, 0, 0, 1] });
      }
      if (el !== root && el.matches(DIVIDERS)) { const r = el.getBoundingClientRect(); ops.push({ type: 'line', x: r.left, y: r.bottom - 1, w: r.width }); }
      return;
    }
    const parent = node.parentElement;
    const text = node.textContent ?? '';
    if (!parent || !text.trim()) return;
    const s = style(parent), size = parseFloat(s.fontSize) || 16;
    const font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    let ascent = ascents.get(font);
    if (ascent === undefined) { measure!.font = font; ascent = measure!.measureText('H').fontBoundingBoxAscent; ascents.set(font, ascent); }
    const clipEl = clipOf(parent);
    // large clipped titles take the block gradient; small clipped labels are plain ink
    const clip = clipEl && size >= 40 ? clipEl.getBoundingClientRect() : null;
    const color = clipEl ? '#f3f0ea' : neutral(s.color);
    const upper = s.textTransform === 'uppercase';
    fontSize = Math.max(fontSize, size);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ' ' || ch === '\n' || ch === '\t') continue;
      range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width) ops.push({ type: 'text', ch: upper ? ch.toUpperCase() : ch, x: r.left, y: r.top + ascent, font, color, clip });
    }
  };
  if (root.nodeType === Node.ELEMENT_NODE) visit(root);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) visit(n);
  return { ops, box, fontSize };
}

/** Paints collected ops into `canvas` (premultiplied RGBA). Resolves once icons are decoded. */
export async function paint(canvas: HTMLCanvasElement, { ops, box }: Collected, scale: number) {
  const urls = [...new Set(ops.filter(o => o.type === 'icon').map(o => (o as Extract<Op, { type: 'icon' }>).url))];
  const loaded = new Map<string, HTMLImageElement | null>();
  await Promise.all(urls.map(async u => { loaded.set(u, await loadIcon(u)); }));
  const cw = Math.max(2, Math.ceil(box.width * scale)), ch = Math.max(2, Math.ceil(box.height * scale));
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, -box.left * scale, -box.top * scale);
  ctx.textBaseline = 'alphabetic';
  const gradients = new Map<DOMRect, CanvasGradient>();
  let scratch: HTMLCanvasElement | null = null;
  for (const op of ops) {
    if (op.type === 'text') {
      ctx.font = op.font;
      if (op.clip) {
        let g = gradients.get(op.clip);
        if (!g) {
          // CSS 135deg gradient line of the whole block: one gradient, never restarted per line or letter
          const c = op.clip, len = (c.width + c.height) / Math.SQRT2 / 2, cx = c.left + c.width / 2, cy = c.top + c.height / 2;
          g = ctx.createLinearGradient(cx - len * Math.SQRT1_2, cy - len * Math.SQRT1_2, cx + len * Math.SQRT1_2, cy + len * Math.SQRT1_2);
          for (const [stop, color] of VFX.color.titleGradient) g.addColorStop(stop, color);
          gradients.set(op.clip, g);
        }
        ctx.fillStyle = g;
      } else ctx.fillStyle = op.color;
      ctx.fillText(op.ch, op.x, op.y);
    } else if (op.type === 'line') {
      const g = ctx.createLinearGradient(op.x, 0, op.x + op.w, 0);
      g.addColorStop(0, 'rgba(226,224,220,.22)'); g.addColorStop(0.5, 'rgba(226,224,220,.14)'); g.addColorStop(1, 'rgba(226,224,220,0)');
      ctx.fillStyle = g; ctx.fillRect(op.x, op.y, op.w, 1);
    } else {
      const image = loaded.get(op.url);
      if (!image) continue;
      scratch ??= document.createElement('canvas');
      const sw = Math.max(1, Math.ceil(op.w * scale)), sh = Math.max(1, Math.ceil(op.h * scale));
      scratch.width = sw; scratch.height = sh;
      const s = scratch.getContext('2d')!;
      const side = Math.min(sw, sh);
      s.drawImage(image, (sw - side) / 2, (sh - side) / 2, side, side);
      s.globalCompositeOperation = 'source-in'; s.fillStyle = op.color; s.fillRect(0, 0, sw, sh);
      ctx.save();
      ctx.translate(op.cx, op.cy); ctx.transform(op.m[0], op.m[1], op.m[2], op.m[3], 0, 0);
      ctx.drawImage(scratch, -op.w / 2, -op.h / 2, op.w, op.h);
      ctx.restore();
    }
  }
  // coarse coverage for particle emission
  const ascale = 0.25, aw = Math.max(1, Math.round(box.width * ascale)), ah = Math.max(1, Math.round(box.height * ascale));
  const small = document.createElement('canvas'); small.width = aw; small.height = ah;
  const sc = small.getContext('2d', { willReadFrequently: true })!;
  sc.drawImage(canvas, 0, 0, aw, ah);
  const px = sc.getImageData(0, 0, aw, ah).data, alpha = new Uint8Array(aw * ah);
  for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3];
  return { alpha, aw, ah, ascale };
}

/** uv = q * scale + offset, with q the 0..1 position in the <img> box. Reproduces object-fit and object-position. */
export function imageFit(img: HTMLImageElement, style: CSSStyleDeclaration, bw: number, bh: number): [number, number, number, number] {
  const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
  const fit = style.objectFit;
  let dw = bw, dh = bh;
  if (fit === 'contain' || fit === 'cover') {
    const k = fit === 'contain' ? Math.min(bw / nw, bh / nh) : Math.max(bw / nw, bh / nh);
    dw = nw * k; dh = nh * k;
  }
  const [px = '50%', py = '50%'] = style.objectPosition.split(' ');
  const at = (v: string, free: number) => (v.endsWith('%') ? (parseFloat(v) / 100) * free : parseFloat(v) || 0);
  const ox = at(px, bw - dw), oy = at(py, bh - dh);
  return [-ox / dw, -oy / dh, bw / dw, bh / dh];
}
