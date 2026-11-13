"""Memento BKG — procedural obsidian shard field, rendered with Cycles.

World: camera at the origin looking down -Z into a radial bowl of fractured
obsidian. Three physical strata (bg / mg / fg); each continues under the
nearer one so parallax and defocus reveal real material.

Usage:
  python3 tools/bkg/scene.py --res 512 --spp 16 --layer all --dof 1 --out out/bkg/preview.exr
  python3 tools/bkg/scene.py --res 2560 --spp 36 --layer mg --out out/bkg/mg.exr
"""
import argparse
import math
import sys
import time

import bpy
import numpy as np
from scipy.spatial import ConvexHull, HalfspaceIntersection, Voronoi
from shapely.geometry import Point, Polygon

TAN_HALF = 0.56  # half field of view (tan) of the square master plate


# --------------------------------------------------------------------------
# smooth periodic noise (sum of oriented sines) — deterministic, cheap
# --------------------------------------------------------------------------
class Noise2:
    def __init__(self, rng, n=7, fmin=2.0, fmax=9.0):
        self.f = rng.uniform(fmin, fmax, n)
        a = rng.uniform(0, 2 * math.pi, n)
        self.dir = np.stack([np.cos(a), np.sin(a)], 1)
        self.ph = rng.uniform(0, 2 * math.pi, n)
        self.amp = 1.0 / self.f
        self.amp /= self.amp.sum()

    def __call__(self, x, y):
        x = np.asarray(x, float)
        y = np.asarray(y, float)
        v = 0.0
        for f, d, p, a in zip(self.f, self.dir, self.ph, self.amp):
            v = v + a * np.sin(f * (x * d[0] + y * d[1]) + p)
        return v  # roughly [-1, 1]


class Noise1:
    def __init__(self, rng, n=5):
        self.k = rng.integers(1, 7, n)
        self.ph = rng.uniform(0, 2 * math.pi, n)
        self.amp = rng.uniform(0.4, 1.0, n) / self.k

    def __call__(self, phi):
        v = 0.0
        for k, p, a in zip(self.k, self.ph, self.amp):
            v = v + a * np.sin(k * phi + p)
        return v / self.amp.sum()


# --------------------------------------------------------------------------
# strata
# --------------------------------------------------------------------------
def build_strata(rng):
    n_rim_fg = Noise1(rng)
    n_rim_mg = Noise1(rng)
    faults = [(math.radians(a), rng.uniform(0.07, 0.11)) for a in (62.0, 237.0, 158.0)]

    def fault_w(t, phi):
        # 0..1 weight inside radial fault channels (fg rubble)
        w = np.zeros_like(np.asarray(t, float))
        for ang, width in faults:
            # channel wobbles a little with radius
            a = ang + 0.35 * (t - 0.5)
            d = np.angle(np.exp(1j * (phi - a)))
            w = np.maximum(w, np.clip(1 - np.abs(d) / width, 0, 1))
        return w

    S = {
        "bg": dict(
            t_in=lambda phi: np.zeros_like(phi),
            t_out=0.36,
            s=lambda t, phi: 0.030 + 0.045 * t,
            d=lambda t, phi: 13.2 - 7.0 * t * t,
            w_top=0.0016,
            h=(1.5, 2.0),
            tilt=14,
            split=0.30,
            pyr=0.45,
            cuts=(2, 6),
            emit=6.0,
            heat_fn=lambda h, t, phi: 0.8 * h,
        ),
        "mg": dict(
            t_in=lambda phi: 0.115 + 0.035 * n_rim_mg(phi),
            t_out=0.68,
            s=lambda t, phi: 0.050 + 0.12 * np.clip(t - 0.11, 0, None),
            d=lambda t, phi: 8.0 - 5.5 * np.clip(t - 0.11, 0, None),
            w_top=0.0019,
            h=(1.5, 2.0),
            tilt=16,
            split=0.45,
            pyr=0.40,
            cuts=(3, 7),
            emit=8.0,
            heat_fn=lambda h, t, phi: h,
        ),
        "fg": dict(
            t_in=lambda phi: 0.335 + 0.06 * n_rim_fg(phi),
            t_out=0.82,
            s=lambda t, phi: (0.15 + 0.30 * np.clip(t - 0.30, 0, None)) * (1 - 0.72 * fault_w(t, phi)),
            d=lambda t, phi: 4.3 - 4.0 * np.clip(t - 0.30, 0, None) + 0.55 * fault_w(t, phi),
            w_top=0.0022,
            h=(1.4, 1.9),
            tilt=18,
            split=0.75,
            pyr=0.15,
            cuts=(4, 10),
            emit=10.0,
            heat_fn=lambda h, t, phi: max(0.18 * h, 0.6 * float(fault_w(np.array(t), np.array(phi))) ** 0.7),
        ),
    }
    return S, fault_w


def poisson_annulus(rng, t_in_fn, t_out, s_fn, margin):
    """Variable-radius dart throwing in the t-plane."""
    r_max = t_out + margin
    n_cand = 40000
    r = r_max * np.sqrt(rng.uniform(0, 1, n_cand))
    a = rng.uniform(0, 2 * math.pi, n_cand)
    x, y = r * np.cos(a), r * np.sin(a)
    phi = np.arctan2(y, x)
    t = np.hypot(x, y)
    keep = t >= np.maximum(t_in_fn(phi) - margin, 0)
    x, y, t, phi = x[keep], y[keep], t[keep], phi[keep]
    rad = 0.88 * s_fn(t, phi)
    acc = np.zeros((0, 2))
    acc_r = np.zeros(0)
    for i in range(len(x)):
        if len(acc):
            d2 = (acc[:, 0] - x[i]) ** 2 + (acc[:, 1] - y[i]) ** 2
            lim = np.minimum(acc_r, rad[i])
            if np.any(d2 < lim * lim):
                continue
        acc = np.vstack([acc, [x[i], y[i]]])
        acc_r = np.append(acc_r, rad[i])
    return acc


def surface_point(S, t_xy, d_fn):
    t = np.hypot(*t_xy)
    phi = math.atan2(t_xy[1], t_xy[0])
    D = float(d_fn(t, phi))
    return np.array([t_xy[0] * D, t_xy[1] * D, -D]), D


def surface_normal(t_xy, d_fn):
    e = 1e-3
    p0, _ = surface_point(None, t_xy, d_fn)
    px, _ = surface_point(None, t_xy + np.array([e, 0]), d_fn)
    py, _ = surface_point(None, t_xy + np.array([0, e]), d_fn)
    n = np.cross(px - p0, py - p0)
    n /= np.linalg.norm(n)
    if n[2] < 0:
        n = -n
    return n


def ray_plane(tv, P, n):
    r = np.array([tv[0], tv[1], -1.0])
    lam = np.dot(P, n) / np.dot(r, n)
    return lam * r


def make_block(rng, poly_top, poly_bot, P, up, h, size, pyramid, cuts=(2, 7)):
    top = [ray_plane(v, P, up) for v in np.asarray(poly_top.exterior.coords)[:-1]]
    Pb = P - up * h
    bot = [ray_plane(v, Pb, up) for v in np.asarray(poly_bot.exterior.coords)[:-1]]
    pts = np.array(top + bot)
    try:
        hull = ConvexHull(pts)
    except Exception:
        return None
    hs = [hull.equations]
    # facet cuts
    e1 = np.cross(up, [0.0, 0.0, 1.0])
    if np.linalg.norm(e1) < 1e-6:
        e1 = np.array([1.0, 0, 0])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(up, e1)
    R = 0.5 * size
    M = P - up * (0.55 * h)
    k = rng.integers(3, 5) if pyramid else rng.integers(*cuts)
    base_a = rng.uniform(0, 2 * math.pi)
    cuts = []
    for i in range(k):
        if pyramid:
            ang = base_a + 2 * math.pi * i / k + rng.uniform(-0.35, 0.35)
            th = math.radians(rng.uniform(18, 32))
            a, b = rng.uniform(-0.08, 0.12), rng.uniform(-0.02, 0.04)
        else:
            ang = rng.uniform(0, 2 * math.pi)
            th = math.radians(rng.uniform(10, 38))
            a, b = rng.uniform(0.15, 0.75), rng.uniform(0.0, 0.10)
        u = math.cos(ang) * e1 + math.sin(ang) * e2
        n = up * math.cos(th) + u * math.sin(th)
        n /= np.linalg.norm(n)
        Q = P + u * (R * a) - up * (R * b)
        off = -np.dot(n, Q)
        if np.dot(n, M) + off < -1e-4:
            cuts.append(np.append(n, off))
    if cuts:
        hs.append(np.array(cuts))
    H = np.vstack(hs)
    if np.any(H[:, :3] @ M + H[:, 3] >= -1e-6):
        return None
    try:
        hi = HalfspaceIntersection(H, M)
        h2 = ConvexHull(hi.intersections)
    except Exception:
        return None
    V = h2.points
    F = []
    c = V.mean(0)
    for simp, eq in zip(h2.simplices, h2.equations):
        a, b, cc = V[simp]
        nrm = np.cross(b - a, cc - a)
        if np.dot(nrm, eq[:3]) < 0:
            simp = simp[[0, 2, 1]]
        F.append(simp)
    return V, np.array(F)


def split_poly(rng, poly, n_lines):
    pieces = [poly]
    c = np.array(poly.centroid.coords[0])
    r = math.sqrt(poly.area)
    for _ in range(n_lines):
        a = rng.uniform(0, math.pi)
        d = np.array([math.cos(a), math.sin(a)])
        nrm = np.array([-d[1], d[0]])
        o = c + nrm * rng.uniform(-0.25, 0.25) * r
        big = 10 * r
        hp1 = Polygon([o - d * big, o + d * big, o + d * big + nrm * big, o - d * big + nrm * big])
        hp2 = Polygon([o - d * big, o + d * big, o + d * big - nrm * big, o - d * big - nrm * big])
        nxt = []
        for p in pieces:
            for hp in (hp1, hp2):
                q = p.intersection(hp)
                if not q.is_empty and q.geom_type == "Polygon" and q.area > 0.12 * poly.area:
                    nxt.append(q)
        if len(nxt) >= len(pieces):
            pieces = nxt
    return pieces


def build_stratum(rng, name, cfg):
    margin = 0.06
    sites = poisson_annulus(rng, cfg["t_in"], cfg["t_out"], cfg["s"], margin)
    far = [[3 * math.cos(a), 3 * math.sin(a)] for a in np.linspace(0, 2 * math.pi, 24, endpoint=False)]
    vor = Voronoi(np.vstack([sites, far]))
    nW = Noise2(rng, fmin=6, fmax=20)
    nH = Noise2(rng, fmin=4, fmax=13)
    clip = Point(0, 0).buffer(cfg["t_out"] + 0.10, 64)
    verts, faces, face_rnd, face_blk = [], [], [], []
    tiles = []
    nv = 0
    nblk = 0
    for i, c in enumerate(sites):
        t = float(np.hypot(*c))
        phi = math.atan2(c[1], c[0])
        if t < float(cfg["t_in"](np.array(phi))) or t > cfg["t_out"]:
            continue
        reg = vor.regions[vor.point_region[i]]
        if -1 in reg or len(reg) < 3:
            continue
        cell = Polygon(vor.vertices[reg]).intersection(clip)
        if cell.is_empty or cell.geom_type != "Polygon" or cell.area <= 0:
            continue
        hv = 0.5 + 0.65 * float(nH(c[0], c[1])) + 0.16 * math.cos(2 * (math.atan2(c[1], c[0]) - math.pi / 2))
        heat = cfg["heat_fn"](float(np.clip((hv - 0.50) / 0.42, 0, 1)) ** 1.8, t, phi)
        n_lines = 0
        u = rng.uniform()
        if u < cfg["split"]:
            n_lines = 1 if rng.uniform() < 0.65 else 2
        pieces = split_poly(rng, cell, n_lines) if n_lines else [cell]
        for poly in pieces:
            pc = np.array(poly.centroid.coords[0])
            t = float(np.hypot(*pc))
            phi = math.atan2(pc[1], pc[0])
            s_here = float(cfg["s"](np.array(t), np.array(phi)))
            wv = cfg["w_top"] * (0.40 + 1.15 * heat) * (0.75 + 0.5 * (0.5 + 0.5 * float(nW(pc[0], pc[1]))))
            wv *= max(0.6, s_here / 0.05) ** 0.35
            p_top = poly.buffer(-wv / 2, join_style=2)
            p_bot = poly.buffer(-0.30 * wv / 2, join_style=2)
            if p_top.is_empty or p_top.geom_type != "Polygon" or p_top.area < 0.15 * poly.area:
                continue
            if p_bot.is_empty or p_bot.geom_type != "Polygon":
                continue
            D0 = float(cfg["d"](np.array(t), np.array(phi)))
            size = math.sqrt(poly.area) * 1.1 * D0
            Dt = D0 + rng.normal(0, 0.14) * s_here * D0
            P = np.array([pc[0] * Dt, pc[1] * Dt, -Dt])
            n_s = surface_normal(np.array(pc), cfg["d"])
            v = np.array([-pc[0], -pc[1], 1.0])
            v /= np.linalg.norm(v)
            n = 0.68 * v + 0.32 * n_s
            n /= np.linalg.norm(n)
            tilt = math.tan(math.radians(rng.uniform(0, cfg["tilt"])))
            ta = rng.uniform(0, 2 * math.pi)
            e1 = np.cross(n, [1.0, 0, 0])
            e1 /= np.linalg.norm(e1)
            e2 = np.cross(n, e1)
            up = n + tilt * (math.cos(ta) * e1 + math.sin(ta) * e2)
            up /= np.linalg.norm(up)
            h = s_here * D0 * rng.uniform(*cfg["h"])
            pyramid = rng.uniform() < cfg["pyr"]
            blk = make_block(rng, p_top, p_bot, P, up, h, size, pyramid, cfg["cuts"])
            if blk is None:
                continue
            V, F = blk
            tiles.append((np.asarray(poly.exterior.coords)[:-1], pc, heat))
            verts.append(V)
            faces.append(F + nv)
            r = rng.uniform()
            face_rnd.extend([r] * len(F))
            face_blk.extend([nblk] * len(F))
            nv += len(V)
            nblk += 1
    V = np.vstack(verts)
    F = np.vstack(faces)
    print(f"[{name}] sites={len(sites)} blocks={nblk} verts={len(V)} tris={len(F)}", flush=True)
    return V, F, np.array(face_rnd), np.array(face_blk), tiles


def random_rotation(rng):
    q = rng.normal(size=4)
    q /= np.linalg.norm(q)
    a, b, c, d = q
    return np.array(
        [
            [a * a + b * b - c * c - d * d, 2 * (b * c - a * d), 2 * (b * d + a * c)],
            [2 * (b * c + a * d), a * a - b * b + c * c - d * d, 2 * (c * d - a * b)],
            [2 * (b * d - a * c), 2 * (c * d + a * b), a * a - b * b - c * c + d * d],
        ]
    )


def loose_shards(rng, name, cfg):
    """Chunky crystals resting on the tiled field: break the lattice, add occlusion."""
    dens = {"bg": 0.62, "mg": 0.55, "fg": 0.35}[name]
    s_fn = lambda t, phi: cfg["s"](t, phi) * 1.7
    pts = poisson_annulus(rng, cfg["t_in"], cfg["t_out"], s_fn, 0.0)
    verts, faces, rnds = [], [], []
    nv = 0
    for c in pts:
        if rng.uniform() > dens:
            continue
        t = float(np.hypot(*c))
        phi = math.atan2(c[1], c[0])
        if t < float(cfg["t_in"](np.array(phi))) + 0.01:
            continue
        D0 = float(cfg["d"](np.array(t), np.array(phi)))
        s_here = float(cfg["s"](np.array(t), np.array(phi)))
        size = s_here * D0 * rng.uniform(0.45, 0.95)
        n_s = surface_normal(np.array(c), cfg["d"])
        v = np.array([-c[0], -c[1], 1.0])
        v /= np.linalg.norm(v)
        up = 0.68 * v + 0.32 * n_s
        up /= np.linalg.norm(up)
        k = rng.integers(10, 18)
        p = rng.normal(size=(k, 3))
        p /= np.linalg.norm(p, axis=1)[:, None]
        p *= rng.uniform(0.75, 1.0, (k, 1))
        ax = np.array([1.0, rng.uniform(0.5, 0.85), rng.uniform(0.28, 0.45)]) * 0.5 * size
        p *= ax
        # orient: local z (thin axis) close to up, random spin and tilt
        R = random_rotation(rng)
        z = up + rng.normal(0, 0.35, 3)
        z /= np.linalg.norm(z)
        x = np.cross(z, R[:, 0])
        x /= np.linalg.norm(x)
        y = np.cross(z, x)
        B = np.stack([x, y, z], 1)
        P = np.array([c[0] * D0, c[1] * D0, -D0]) + up * (rng.uniform(-0.05, 0.12) * size)
        w = p @ B.T + P
        try:
            hull = ConvexHull(w)
        except Exception:
            continue
        V = hull.points
        F = []
        for simp, eq in zip(hull.simplices, hull.equations):
            a_, b_, c_ = V[simp]
            if np.dot(np.cross(b_ - a_, c_ - a_), eq[:3]) < 0:
                simp = simp[[0, 2, 1]]
            F.append(simp)
        F = np.array(F)
        verts.append(V)
        faces.append(F + nv)
        rnds.extend([rng.uniform()] * len(F))
        nv += len(V)
    print(f"[{name}] loose={len(verts)}", flush=True)
    return np.vstack(verts), np.vstack(faces), np.array(rnds)


def floor_tiles(cfg, tiles, depth_extra):
    """Emissive base only under the blocks: one fan per (unshrunk) Voronoi cell."""
    def lift(p):
        t = float(np.hypot(*p))
        phi = math.atan2(p[1], p[0])
        D = float(cfg["d"](np.array(t), np.array(phi)))
        s_ = float(cfg["s"](np.array(t), np.array(phi)))
        D = D + depth_extra * s_ * D
        return [p[0] * D, p[1] * D, -D]

    V, F, H = [], [], []
    for poly, c, heat in tiles:
        base = len(V)
        V.append(lift(c))
        for p in poly:
            V.append(lift(p))
        n = len(poly)
        for k in range(n):
            F.append([base, base + 1 + k, base + 1 + (k + 1) % n])
            H.append(heat)
    return np.array(V), np.array(F), np.array(H)


def floor_mesh(cfg, depth_extra):
    """Emissive base under the blocks: polar grid in the t-plane."""
    nr, na = 90, 360
    t0 = 0.0
    t1 = cfg["t_out"] + 0.04
    ts = np.linspace(t0, t1, nr)
    ph = np.linspace(-math.pi, math.pi, na, endpoint=False)
    T, PH = np.meshgrid(ts, ph, indexing="ij")
    D = cfg["d"](T, PH) + depth_extra * cfg["s"](T, PH) * cfg["d"](T, PH)
    X, Y = T * np.cos(PH) * D, T * np.sin(PH) * D
    V = np.stack([X, Y, -D], -1).reshape(-1, 3)
    tin = cfg["t_in"](PH[0])
    F = []
    for i in range(nr - 1):
        for j in range(na):
            if ts[i + 1] < tin[j] - 0.04:
                continue
            a = i * na + j
            b = i * na + (j + 1) % na
            c = (i + 1) * na + (j + 1) % na
            d = (i + 1) * na + j
            F.append([a, d, c, b])
    return V, np.array(F)


# --------------------------------------------------------------------------
# Blender scene
# --------------------------------------------------------------------------
def mesh_object(name, V, F, face_attrs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(V.tolist(), [], F.tolist())
    me.update()
    if face_attrs:
        for k, vals in face_attrs.items():
            at = me.attributes.new(k, "FLOAT", "FACE")
            at.data.foreach_set("value", vals.astype(np.float32))
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def obsidian_material(density=160.0):
    m = bpy.data.materials.new(f"obsidian_{density}")
    m.use_nodes = True
    nt = m.node_tree
    N = nt.nodes
    L = nt.links
    for n in list(N):
        N.remove(n)
    out = N.new("ShaderNodeOutputMaterial")
    bsdf = N.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["IOR"].default_value = 1.49
    bsdf.inputs["Transmission Weight"].default_value = 1.0
    L.new(bsdf.outputs[0], out.inputs["Surface"])
    vol = N.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (0.86, 0.30, 0.05, 1)
    vol.inputs["Density"].default_value = density
    L.new(vol.outputs[0], out.inputs["Volume"])

    geo = N.new("ShaderNodeNewGeometry")
    rnd = N.new("ShaderNodeAttribute")
    rnd.attribute_name = "rnd"
    # per-block offset of texture space
    off = N.new("ShaderNodeVectorMath")
    off.operation = "MULTIPLY_ADD"
    L.new(rnd.outputs["Fac"], off.inputs[0])
    off.inputs[1].default_value = (37.1, 91.7, 13.3)
    L.new(geo.outputs["Position"], off.inputs[2])
    P = off.outputs[0]

    # roughness smudges
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 6
    L.new(P, nz.inputs["Vector"])
    rr = N.new("ShaderNodeMapRange")
    rr.inputs["From Min"].default_value = 0.35
    rr.inputs["From Max"].default_value = 0.75
    rr.inputs["To Min"].default_value = 0.02
    rr.inputs["To Max"].default_value = 0.10
    L.new(nz.outputs["Fac"], rr.inputs["Value"])
    L.new(rr.outputs["Result"], bsdf.inputs["Roughness"])

    # cracks: voronoi distance to edge
    vor = N.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 2.2
    vor.inputs["Randomness"].default_value = 1.0
    wrp = N.new("ShaderNodeTexNoise")
    wrp.inputs["Scale"].default_value = 1.5
    mixw = N.new("ShaderNodeVectorMath")
    mixw.operation = "MULTIPLY_ADD"
    L.new(wrp.outputs["Color"], mixw.inputs[0])
    mixw.inputs[1].default_value = (0.35, 0.35, 0.35)
    L.new(P, mixw.inputs[2])
    L.new(P, wrp.inputs["Vector"])
    L.new(mixw.outputs[0], vor.inputs["Vector"])
    crk = N.new("ShaderNodeMapRange")
    crk.inputs["From Min"].default_value = 0.0
    crk.inputs["From Max"].default_value = 0.012
    crk.inputs["To Min"].default_value = 0.0
    crk.inputs["To Max"].default_value = 1.0
    L.new(vor.outputs["Distance"], crk.inputs["Value"])

    # scratches: stretched noise
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (90.0, 2.0, 2.0)
    mp.inputs["Rotation"].default_value = (0.3, 0.7, 0.2)
    L.new(P, mp.inputs["Vector"])
    scr = N.new("ShaderNodeTexNoise")
    scr.inputs["Scale"].default_value = 1.0
    scr.inputs["Detail"].default_value = 2
    L.new(mp.outputs[0], scr.inputs["Vector"])
    scm = N.new("ShaderNodeMapRange")
    scm.inputs["From Min"].default_value = 0.62
    scm.inputs["From Max"].default_value = 0.70
    L.new(scr.outputs["Fac"], scm.inputs["Value"])

    # fine grain
    grn = N.new("ShaderNodeTexNoise")
    grn.inputs["Scale"].default_value = 160.0
    grn.inputs["Detail"].default_value = 1
    L.new(P, grn.inputs["Vector"])

    # conchoidal ripples
    wav = N.new("ShaderNodeTexWave")
    wav.wave_type = "RINGS"
    wav.inputs["Scale"].default_value = 1.4
    wav.inputs["Distortion"].default_value = 6.0
    wav.inputs["Detail"].default_value = 2
    L.new(P, wav.inputs["Vector"])

    bev = N.new("ShaderNodeBevel")
    bev.samples = 6
    bev.inputs["Radius"].default_value = 0.010
    b1 = N.new("ShaderNodeBump")
    b1.inputs["Strength"].default_value = 0.025
    b1.inputs["Distance"].default_value = 0.02
    L.new(wav.outputs["Fac"], b1.inputs["Height"])
    L.new(bev.outputs["Normal"], b1.inputs["Normal"])
    b2 = N.new("ShaderNodeBump")
    b2.inputs["Strength"].default_value = 0.6
    b2.inputs["Distance"].default_value = 0.004
    L.new(crk.outputs["Result"], b2.inputs["Height"])
    L.new(b1.outputs["Normal"], b2.inputs["Normal"])
    b3 = N.new("ShaderNodeBump")
    b3.inputs["Strength"].default_value = 0.25
    b3.inputs["Distance"].default_value = 0.002
    L.new(scm.outputs["Result"], b3.inputs["Height"])
    L.new(b2.outputs["Normal"], b3.inputs["Normal"])
    b4 = N.new("ShaderNodeBump")
    b4.inputs["Strength"].default_value = 0.05
    b4.inputs["Distance"].default_value = 0.001
    L.new(grn.outputs["Fac"], b4.inputs["Height"])
    L.new(b3.outputs["Normal"], b4.inputs["Normal"])
    L.new(b4.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def ember_material(strength):
    m = bpy.data.materials.new(f"ember_{strength}")
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    for n in list(N):
        N.remove(n)
    out = N.new("ShaderNodeOutputMaterial")
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.28, 0.0, 1)  # blue = 0 -> separable from key
    geo = N.new("ShaderNodeNewGeometry")
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 1.6
    nz.inputs["Detail"].default_value = 3
    L.new(geo.outputs["Position"], nz.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.30
    mr.inputs["From Max"].default_value = 0.70
    mr.inputs["To Min"].default_value = 0.08
    mr.inputs["To Max"].default_value = 1.0
    L.new(nz.outputs["Fac"], mr.inputs["Value"])
    ht = N.new("ShaderNodeAttribute")
    ht.attribute_name = "heat"
    hb = N.new("ShaderNodeMath")
    hb.operation = "MULTIPLY_ADD"
    L.new(ht.outputs["Fac"], hb.inputs[0])
    hb.inputs[1].default_value = strength
    hb.inputs[2].default_value = 0.006 * strength
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    L.new(hb.outputs[0], mul.inputs[0])
    L.new(mr.outputs["Result"], mul.inputs[1])
    L.new(mul.outputs[0], em.inputs["Strength"])
    L.new(em.outputs[0], out.inputs["Surface"])
    return m


def setup_scene(args):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = args.spp
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 10
    cy.diffuse_bounces = 1
    cy.glossy_bounces = 4
    cy.transmission_bounces = 10
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 4
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 4.0
    cy.blur_glossy = 1.0
    sc.render.film_transparent = True
    sc.render.resolution_x = args.res
    sc.render.resolution_y = args.res
    sc.render.resolution_percentage = 100
    sc.render.threads_mode = "AUTO"
    sc.view_settings.view_transform = "Standard"
    vl = sc.view_layers[0]
    vl.use_pass_z = True
    sc.render.image_settings.media_type = "MULTI_LAYER_IMAGE"
    sc.render.image_settings.file_format = "OPEN_EXR_MULTILAYER"
    sc.render.image_settings.color_depth = "16"
    sc.render.image_settings.exr_codec = "ZIP"

    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    studio_world(w, args.world)
    sc.world = w

    cam_data = bpy.data.cameras.new("cam")
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.sensor_width = 36.0
    cam_data.lens = 18.0 / TAN_HALF
    cam_data.clip_start = 0.05
    cam_data.clip_end = 100
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    if args.dof:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_distance = args.focus
        cam_data.dof.aperture_fstop = args.fstop
        cam_data.dof.aperture_blades = 6
        cam_data.dof.aperture_rotation = math.radians(15)

    def area(name, loc, target, size, power, shape="RECTANGLE"):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = shape
        ld.size = size[0]
        ld.size_y = size[1]
        ld.energy = power
        ld.color = (1, 1, 1)
        ob = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(ob)
        ob.location = loc
        d = np.array(target) - np.array(loc)
        rot = _look_quat(d)
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = rot
        return ob

    area("key", (0.0, 7.5, 0.5), (0.0, -1.0, -8.0), (10.0, 2.2), args.key)
    area("strip", (-9.0, -6.0, -1.5), (1.0, 1.0, -8.0), (6.0, 0.5), args.key * 0.25)
    return sc


def studio_world(w, gain):
    nt = w.node_tree
    N, L = nt.nodes, nt.links
    for n in list(N):
        N.remove(n)
    out = N.new("ShaderNodeOutputWorld")
    bg = N.new("ShaderNodeBackground")
    L.new(bg.outputs[0], out.inputs[0])
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["Generated"], sep.inputs[0])

    def m(op, *ins, clamp=False):
        n = N.new("ShaderNodeMath")
        n.operation = op
        n.use_clamp = clamp
        for i, v in enumerate(ins):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L.new(v, n.inputs[i])
        return n.outputs[0]

    def band(src, center, width, soft):
        d = m("ABSOLUTE", m("SUBTRACT", src, center))
        return m("SUBTRACT", 1.0, m("DIVIDE", m("MAXIMUM", m("SUBTRACT", d, width), 0.0), soft), clamp=True)

    y, z = sep.outputs["Y"], sep.outputs["Z"]
    # broad soft gradient: brighter toward the top of the frame
    grad = m("ADD", 0.025, m("MULTIPLY", band(y, 0.58, 0.22, 0.25), 0.5))
    behind = m("MULTIPLY", m("ADD", z, 0.15), 1.6, clamp=True)
    softbox = m("MULTIPLY", grad, behind)
    # two crisp studio strips
    s1 = m("MULTIPLY", band(y, 0.55, 0.04, 0.05), 3.0)
    s2 = m("MULTIPLY", band(y, -0.35, 0.02, 0.04), 1.0)
    strips = m("MULTIPLY", m("ADD", s1, s2), behind)
    lum = m("MULTIPLY", m("ADD", softbox, strips), gain)
    L.new(lum, bg.inputs["Strength"])
    bg.inputs["Color"].default_value = (1, 1, 1, 1)


def _look_quat(d):
    from mathutils import Vector

    v = Vector(d).normalized()
    return v.to_track_quat("-Z", "Y")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--res", type=int, default=512)
    ap.add_argument("--spp", type=int, default=16)
    ap.add_argument("--layer", default="all")
    ap.add_argument("--out", default="out/preview.exr")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--dof", type=int, default=0)
    ap.add_argument("--focus", type=float, default=7.0)
    ap.add_argument("--fstop", type=float, default=2.8)
    ap.add_argument("--key", type=float, default=900.0)
    ap.add_argument("--world", type=float, default=1.0)
    ap.add_argument("--emit", type=float, default=1.0)
    args = ap.parse_args()
    t0 = time.time()
    rng = np.random.default_rng(args.seed)
    sc = setup_scene(args)
    S, _ = build_strata(rng)
    dens = {"bg": 160.0, "mg": 140.0, "fg": 150.0}
    objs = {}
    floor_depth = {"bg": 0.9, "mg": 0.78, "fg": 0.72}
    for name in ["bg", "mg", "fg"]:
        cfg = S[name]
        V, F, frnd, fblk, tiles = build_stratum(rng, name, cfg)
        ob = mesh_object(f"blk_{name}", V, F, {"rnd": frnd, "blk": fblk.astype(float)})
        ob.data.materials.append(obsidian_material(dens[name]))
        fv, ff, fh = floor_tiles(cfg, tiles, floor_depth[name])
        fl = mesh_object(f"floor_{name}", fv, ff, {"heat": fh})
        fl.data.materials.append(ember_material(cfg["emit"] * args.emit))
        lv, lf, lr = loose_shards(rng, name, cfg)
        lo = mesh_object(f"loose_{name}", lv, lf, {"rnd": lr})
        lo.data.materials.append(obsidian_material(dens[name]))
        objs[name] = (ob, fl, lo)
    if args.layer != "all":
        for name, group in objs.items():
            vis = name == args.layer
            for o in group:
                o.visible_camera = vis
    print(f"scene built in {time.time()-t0:.1f}s", flush=True)
    sc.render.filepath = args.out
    t1 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"render {args.layer} {args.res}px {args.spp}spp in {time.time()-t1:.1f}s", flush=True)


if __name__ == "__main__":
    main()
