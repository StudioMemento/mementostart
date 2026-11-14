"""Preview sheet for review: desktop 16:9 and mobile side by side, ultrawide below.

  python3 tools/bkg/sheet.py out/bkg/preview.exr out/bkg/sheet.jpg [glow_gain] [exposure]
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, __import__("os").path.dirname(__file__))
from exrtool import load, reconstruct, split, tonemap  # noqa: E402

src, dst = sys.argv[1], sys.argv[2]
gg = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
exp = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
d = load(src)
key, glow, a = split(d["rgba"])
z = np.where(d["z"] < 1e6, d["z"], 1e3)
f = np.exp(-0.07 * np.clip(z - 6.0, 0, None))
img = tonemap(reconstruct(key * f, glow * f, gg), exp)
N = img.shape[0]
c, ppt = N / 2, N / 2 / 0.56


def crop(aspect, portrait=False, long_half=0.52):
    L = long_half * ppt
    h, w = (L, L * aspect) if portrait else (L / aspect, L)
    x = img[int(c - h):int(c + h), int(c - w):int(c + w)]
    return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))


gap, bg = 16, (14, 14, 14)
dk = crop(16 / 9)
dk = dk.resize((1280, 720), Image.LANCZOS)
mb = crop(9 / 19.5, portrait=True).resize((332, 720), Image.LANCZOS)
uw = crop(21 / 9).resize((1280 + gap + 332, round((1280 + gap + 332) * 9 / 21)), Image.LANCZOS)
W = 1280 + gap + 332
sheet = Image.new("RGB", (W + 2 * gap, 720 + uw.height + 3 * gap), bg)
sheet.paste(dk, (gap, gap))
sheet.paste(mb, (gap + 1280 + gap, gap))
sheet.paste(uw, (gap, 720 + 2 * gap))
sheet.save(dst, quality=90)
print(dst, sheet.size)
