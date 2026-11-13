"""Pack the three layer EXRs (square master, pinhole) into web plate sets.

  python3 tools/bkg/pack.py out/bkg public/assets/bkg

Per layer: RGB image  R = enc(key*a)  G = enc(glow*a)  B = alpha
Shared   : RGB image  R/G/B = normalised disparity of bg/mg/fg (holes filled)
Images are written bottom-up (row 0 = bottom) to match GL uv without flips.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from exrtool import load, split  # noqa: E402

MASTER_HALF = 0.56
ZNEAR, ZFAR = 2.0, 16.0
ENC_C = 0.6
LAYERS = ["bg", "mg", "fg"]

SETS = {
    # name: (half extents tan, output width)
    "landscape": ((0.56, 0.42), None),  # native master resolution
    "landscape_m": ((0.56, 0.42), 1280),
    "portrait": ((0.42, 0.56), 1080),
}


def enc(x):
    x = np.clip(x, 0, None)
    return np.sqrt(x / (x + ENC_C))


def disparity(z, a):
    w = (1.0 / np.maximum(z, 1e-3) - 1.0 / ZFAR) / (1.0 / ZNEAR - 1.0 / ZFAR)
    w = np.clip(w, 0, 1)
    valid = (a > 0.98) & (z < 1e6)
    if valid.any():
        idx = ndimage.distance_transform_edt(~valid, return_distances=False, return_indices=True)
        w = w[idx[0], idx[1]]
    return w


def crop(img, N, ext):
    ppt = N / 2 / MASTER_HALF
    hx, hy = int(round(ext[0] * ppt)), int(round(ext[1] * ppt))
    c = N // 2
    # EXR rows are top-down; crop then flip to bottom-up
    return img[c - hy : c + hy, c - hx : c + hx][::-1]


def to_u8(x):
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)


def save(rgb01, path, size=None):
    im = Image.fromarray(to_u8(rgb01), "RGB")
    if size and size != im.width:
        im = im.resize((size, round(im.height * size / im.width)), Image.LANCZOS)
    im.save(path, "WEBP", lossless=True, quality=100, method=6)
    return im.size, os.path.getsize(path)


def save_gray(x01, path, size=None, q=90):
    im = Image.fromarray(to_u8(x01), "L")
    if size and size != im.width:
        im = im.resize((size, round(im.height * size / im.width)), Image.LANCZOS)
    im.save(path, "WEBP", quality=q, method=6)
    return im.size, os.path.getsize(path)


def glints(key_l, w_l, a_l, layer, N, max_n=110, thr=0.18):
    """Local maxima of the key on facets: positions of twinkles (tan coords)."""
    k = key_l / np.maximum(a_l, 1e-3)
    k[a_l < 0.6] = 0
    mx = ndimage.maximum_filter(k, size=9)
    peaks = np.argwhere((k == mx) & (k > thr))
    vals = k[peaks[:, 0], peaks[:, 1]]
    order = np.argsort(-vals)[: max_n * 3]
    rng = np.random.default_rng(3 + layer)
    sel = order[rng.permutation(len(order))[:max_n]] if len(order) > max_n else order
    ppt = N / 2 / MASTER_HALF
    out = []
    for i in sel:
        r, c = peaks[i]
        out.append(
            {
                "x": round((c - N / 2) / ppt, 5),
                "y": round((N / 2 - r) / ppt, 5),
                "w": round(float(w_l[r, c]), 4),
                "layer": layer,
                "s": round(float(min(vals[i], 1.5)), 3),
            }
        )
    return out


def poster(data, N, path):
    """Static fallback: layers composited with a gaussian stand-in for the DoF."""
    from exrtool import reconstruct, tonemap

    sig = {"bg": N * 0.004, "mg": 0.0, "fg": N * 0.010}
    keyg = {"bg": 0.62, "mg": 0.9, "fg": 1.0}
    glg = {"bg": 0.7, "mg": 0.95, "fg": 1.0}
    acc = np.zeros((N, N, 2), np.float32)
    for L in LAYERS:
        D = data[L]
        ch = np.stack([D["key"] * keyg[L], D["glow"] * glg[L], D["a"]], -1)
        if sig[L] > 0:
            ch = np.stack([ndimage.gaussian_filter(ch[..., i], sig[L]) for i in range(3)], -1)
        acc = ch[..., :2] + (1 - ch[..., 2:3]) * acc
    img = tonemap(reconstruct(acc[..., 0], acc[..., 1], 0.34))
    img = crop(img, N, (0.56, 0.42))[::-1]
    im = Image.fromarray(to_u8(img))
    im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    im.save(path, "JPEG", quality=84)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    data = {}
    for L in LAYERS:
        d = load(os.path.join(src, f"{L}.exr"))
        key, glow, a = split(d["rgba"])
        data[L] = dict(key=key, glow=glow, a=a, w=disparity(d["z"], a))
        print(L, "key max", key.max(), "glow max", glow.max(), "cover", a.mean())
    N = data["bg"]["a"].shape[0]
    planes = {}
    for L in LAYERS:
        a, w = data[L]["a"], data[L]["w"]
        m = a > 0.9
        planes[L] = round(float(np.median(w[m])), 4)
    print("planes", planes)
    gl = []
    for i, L in enumerate(LAYERS):
        cand = glints(data[L]["key"], data[L]["w"], data[L]["a"], i, N)
        ppt = N / 2 / MASTER_HALF
        for g in cand:
            r = int(round(N / 2 - g["y"] * ppt))
            c = int(round(N / 2 + g["x"] * ppt))
            hidden = any(data[M]["a"][r, c] > 0.5 for M in LAYERS[i + 1 :])
            if not hidden:
                gl.append(g)
    print("glints", len(gl))
    poster(data, N, os.path.join(dst, "poster.jpg"))
    with open(os.path.join(dst, "glints.json"), "w") as f:
        json.dump(gl, f)
    manifest = {"version": 1, "znear": ZNEAR, "zfar": ZFAR, "encC": ENC_C, "planes": planes, "sets": {}}
    total = {}
    for name, (ext, width) in SETS.items():
        nbytes = 0
        keys, glows = [], []
        for L in LAYERS:
            D = data[L]
            for ch, arr, lst in (("key", D["key"], keys), ("glow", D["glow"], glows)):
                fn = f"{name}_{L}_{ch}.webp"
                size, b = save_gray(crop(enc(arr), N, ext), os.path.join(dst, fn), width)
                lst.append(fn)
                nbytes += b
        alpha = np.stack([data[L]["a"] for L in LAYERS], -1)
        size, b = save(crop(alpha, N, ext), os.path.join(dst, f"{name}_alpha.webp"), width)
        nbytes += b
        dep = np.stack([data[L]["w"] for L in LAYERS], -1)
        _, b = save(crop(dep, N, ext), os.path.join(dst, f"{name}_depth.webp"), (width or crop(dep, N, ext).shape[1]) // 2)
        nbytes += b
        manifest["sets"][name] = {
            "w": size[0],
            "h": size[1],
            "ext": list(ext),
            "key": keys,
            "glow": glows,
            "alpha": f"{name}_alpha.webp",
            "depth": f"{name}_depth.webp",
            "glints": "glints.json",
        }
        total[name] = nbytes
    with open(os.path.join(dst, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    for k, v in total.items():
        print(f"{k}: {v/1e6:.2f} MB  {manifest['sets'][k]['w']}x{manifest['sets'][k]['h']}")


if __name__ == "__main__":
    main()
