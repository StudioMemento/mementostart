import sys, numpy as np
sys.path.insert(0, 'tools')
from exrtool import load, split, reconstruct, tonemap, to_png
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
gg = float(sys.argv[3]) if len(sys.argv) > 3 else 0.4
exp = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
d = load(src); key, glow, a = split(d['rgba'])
img = tonemap(reconstruct(key, glow, gg), exp)
N = img.shape[0]; c = N / 2; ppt = N / 2 / 0.56
def crop(aspect, long_half=0.52, portrait=False):
    L = long_half * ppt
    if portrait: h, w = L, L * aspect
    else: w, h = L, L / aspect
    return img[int(c - h):int(c + h), int(c - w):int(c + w)]
uw, dk, mb = crop(21/9), crop(16/9), crop(9/19.5, portrait=True)
H = 420
def rs(x, h): 
    im = Image.fromarray((x*255).astype(np.uint8)); return np.asarray(im.resize((int(im.width*h/im.height), h), Image.LANCZOS))/255.0
row = np.concatenate([rs(uw, H), np.zeros((H, 12, 3)), rs(dk, H), np.zeros((H, 12, 3)), rs(mb, H)], 1)
to_png(row, dst)
to_png(img, dst.replace('.png', '_sq.png'))
