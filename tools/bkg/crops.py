"""Preview of a v2 render: full square + ultrawide / desktop / mobile crops, with the depth fade.

  python3 tools/bkg/crops.py out/bkg/preview.exr out/bkg/preview.png [glow_gain] [exposure] [fog]
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, __import__("os").path.dirname(__file__))
from exrtool import load, reconstruct, split, to_png, tonemap  # noqa: E402

src, dst = sys.argv[1], sys.argv[2]
gg = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
exp = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
fog = float(sys.argv[5]) if len(sys.argv) > 5 else 0.035
d = load(src)
key, glow, a = split(d["rgba"])
z = d.get("z")
if z is not None and fog > 0:
    f = np.exp(-fog * np.clip(np.where(z < 1e6, z, 400) - 6.0, 0, 400))
    key, glow = key * f, glow * f
img = tonemap(reconstruct(key, glow, gg), exp)
N = img.shape[0]
c = N / 2
ppt = N / 2 / 0.56


def crop(aspect, long_half=0.52, portrait=False):
    L = long_half * ppt
    if portrait:
        h, w = L, L * aspect
    else:
        w, h = L, L / aspect
    return img[int(c - h):int(c + h), int(c - w):int(c + w)]


def rs(x, h):
    im = Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.resize((int(im.width * h / im.height), h), Image.LANCZOS)) / 255.0


H = 420
uw, dk, mb = crop(21 / 9), crop(16 / 9), crop(9 / 19.5, portrait=True)
row = np.concatenate([rs(uw, H), np.zeros((H, 12, 3)), rs(dk, H), np.zeros((H, 12, 3)), rs(mb, H)], 1)
to_png(row, dst)
to_png(img, dst.replace(".png", "_sq.png"))
print("key mean", float(key.mean()), "glow mean", float(glow.mean()), "alpha", float(a.mean()))
