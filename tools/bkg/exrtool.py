"""EXR helpers + palette reconstruction used for previews and texture packing."""
import sys

import numpy as np
import OpenEXR
from PIL import Image


def load(path):
    out = {}
    with OpenEXR.File(path) as f:
        for p in f.parts:
            for k, v in p.channels.items():
                if k.endswith("Combined"):
                    out["rgba"] = np.asarray(v.pixels, np.float32)
                elif k.endswith("Depth.Z"):
                    out["z"] = np.asarray(v.pixels, np.float32)
    return out


def split(rgba):
    """Key is white light, glow has zero blue: key = B, glow = R - B."""
    r, g, b, a = [rgba[..., i] for i in range(4)]
    key = np.clip(b, 0, None)
    glow = np.clip(r - b, 0, None)
    return key, glow, np.clip(a, 0, 1)


# amber ramp: garnet -> amber -> orange -> warm yellow (linear rgb, per unit luminance)
RAMP_X = np.array([0.0, 0.05, 0.25, 0.9, 3.0])
RAMP_C = np.array(
    [
        [0.55, 0.035, 0.020],
        [0.80, 0.090, 0.030],
        [1.00, 0.300, 0.060],
        [1.00, 0.480, 0.120],
        [1.00, 0.700, 0.350],
    ]
)
KEY_TINT = np.array([1.0, 0.975, 0.95])


def ramp(glow):
    c = np.stack([np.interp(glow, RAMP_X, RAMP_C[:, i]) for i in range(3)], -1)
    return c * glow[..., None]


def reconstruct(key, glow, glow_gain=1.0):
    return key[..., None] * KEY_TINT + ramp(glow * glow_gain)


def tonemap(rgb, exposure=1.0):
    x = rgb * exposure
    # soft shoulder above 0.8 (like the DNA grade), linear below
    sh = 0.8
    y = np.where(x < sh, x, sh + (1 - sh) * (1 - np.exp(-(x - sh) / (1 - sh))))
    y = np.clip(y, 0, 1)
    return np.where(y <= 0.0031308, 12.92 * y, 1.055 * np.power(y, 1 / 2.4) - 0.055)


def to_png(rgb, path, scale=1):
    im = Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS)
    im.save(path)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    exp = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    gg = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    d = load(src)
    key, glow, a = split(d["rgba"])
    raw = tonemap(d["rgba"][..., :3], exp)
    rec = tonemap(reconstruct(key, glow, gg), exp)
    both = np.concatenate([raw, np.ones((raw.shape[0], 4, 3)), rec], 1)
    to_png(both, dst)
    print("key max/mean", key.max(), key.mean(), "glow max/mean", glow.max(), glow.mean(), "alpha mean", a.mean())
