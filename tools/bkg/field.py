"""Memento BKG v2 — a grazing view over a field of faceted obsidian crystals.

Camera low over the ground, pitched down a little, looking across a field of
pyramidal crystals that recedes into the dark. The world scale grows with the
distance, so the far crystals read as a range of peaks instead of noise.

Planes (one render each, the others hidden from the camera but still in the light):
  fg  big framing shards on both sides (a V that opens toward the centre) and a
      low ridge at the bottom centre
  mg  the field up to Y_SPLIT (continues under the fg shards)
  bg  the field beyond Y_SPLIT, up to the far range

Usage:
  python3 tools/bkg/field.py --res 1024 --spp 24 --dof 1 --focus 4.3 --fstop 0.55 --out out/bkg/preview.exr
  python3 tools/bkg/field.py --res 2560 --spp 36 --layer mg --out out/bkg/mg.exr
"""
import argparse
import math
import os
import sys
import time

import bpy
import numpy as np
from scipy.spatial import ConvexHull, Voronoi
from shapely.geometry import Point, Polygon

sys.path.insert(0, os.path.dirname(__file__))
from scene import Noise2, ember_material, mesh_object, obsidian_material, _look_quat  # noqa: E402

TAN_HALF = 0.56          # half field of view (tan) of the square master plate
CAM_H = 1.25             # camera height over the ground
PITCH = math.radians(17)  # camera pitch, down
Y_SPLIT = 8.5            # mg / bg boundary (distance along the ground)
Y_MAX = 72.0
S0, KS = 0.38, 0.12      # cell size s(y) = S0 * (1 + KS * y)
HOT = [  # ground hot zones: x, y, radius, strength
    (-0.9, 4.2, 1.1, 1.0),
    (1.1, 5.6, 1.4, 0.85),
    (0.15, 3.1, 0.7, 0.7),
    (-2.6, 8.5, 2.2, 0.75),
    (3.4, 12.0, 3.0, 0.7),
    (-5.0, 18.0, 4.0, 0.6),
    (6.0, 26.0, 6.0, 0.55),
]


def s_of(y):
    return S0 * (1 + KS * np.asarray(y, float))


# --------------------------------------------------------------------------
# camera helpers
# --------------------------------------------------------------------------
C = np.array([0.0, 0.0, CAM_H])
FWD = np.array([0.0, math.cos(PITCH), -math.sin(PITCH)])
UP = np.array([0.0, math.sin(PITCH), math.cos(PITCH)])
RIGHT = np.array([1.0, 0.0, 0.0])


def to_screen(P):
    d = np.asarray(P, float) - C
    z = d @ FWD
    return np.stack([(d @ RIGHT) / z, (d @ UP) / z, z], -1)


def from_screen(u, v, z):
    return C + z * (FWD + u * RIGHT + v * UP)


# --------------------------------------------------------------------------
# sampling: poisson disk in a warped plane where the cell size is 1
# --------------------------------------------------------------------------
def w_of(y):
    return np.log1p(KS * np.asarray(y, float)) / (KS * S0)


def y_of(w):
    return np.expm1(KS * S0 * np.asarray(w, float)) / KS


def bridson(rng, x0, x1, y0, y1, r=1.0, k=30):
    cell = r / math.sqrt(2)
    gw, gh = int((x1 - x0) / cell) + 1, int((y1 - y0) / cell) + 1
    grid = -np.ones((gw, gh), int)
    pts = []

    def fits(p):
        gx, gy = int((p[0] - x0) / cell), int((p[1] - y0) / cell)
        for i in range(max(gx - 2, 0), min(gx + 3, gw)):
            for j in range(max(gy - 2, 0), min(gy + 3, gh)):
                q = grid[i, j]
                if q >= 0 and (pts[q][0] - p[0]) ** 2 + (pts[q][1] - p[1]) ** 2 < r * r:
                    return False
        return True

    def add(p):
        pts.append(p)
        grid[int((p[0] - x0) / cell), int((p[1] - y0) / cell)] = len(pts) - 1

    add((rng.uniform(x0, x1), rng.uniform(y0, y1)))
    active = [0]
    while active:
        i = active[rng.integers(len(active))]
        ok = False
        for _ in range(k):
            a = rng.uniform(0, 2 * math.pi)
            rr = rng.uniform(r, 2 * r)
            p = (pts[i][0] + rr * math.cos(a), pts[i][1] + rr * math.sin(a))
            if x0 <= p[0] < x1 and y0 <= p[1] < y1 and fits(p):
                add(p)
                active.append(len(pts) - 1)
                ok = True
                break
        if not ok:
            active.remove(i)
    return np.array(pts)


def half_width(y):
    # visible half width of the ground at distance y, with a margin
    return 0.70 * y + 1.6


def field_sites(rng):
    w0, w1 = float(w_of(0.45)), float(w_of(Y_MAX))
    P = bridson(rng, -18.0, 18.0, w0, w1, r=1.0)
    y = y_of(P[:, 1])
    x = P[:, 0] * s_of(y)
    keep = np.abs(x) < half_width(y)
    return np.stack([x[keep], y[keep]], 1)


# --------------------------------------------------------------------------
# crystals
# --------------------------------------------------------------------------
def hull_mesh(pts):
    hull = ConvexHull(pts)
    V = hull.points
    F = []
    for simp, eq in zip(hull.simplices, hull.equations):
        a, b, c = V[simp]
        if np.dot(np.cross(b - a, c - a), eq[:3]) < 0:
            simp = simp[[0, 2, 1]]
        F.append(simp)
    used = np.unique(np.array(F))
    remap = -np.ones(len(V), int)
    remap[used] = np.arange(len(used))
    return V[used], remap[np.array(F)]


def simplify_base(rng, poly_xy):
    """Largest-area triangle or quad inside the cell: crisp pyramids, and room for the floor between them."""
    from itertools import combinations

    P = np.asarray(poly_xy, float)
    n = len(P)
    k = 3 if rng.uniform() < 0.3 else 4
    if n <= k:
        return P
    best, best_a = None, -1
    for idx in combinations(range(n), k):
        q = P[list(idx)]
        a = 0.5 * abs(np.dot(q[:, 0], np.roll(q[:, 1], 1)) - np.dot(q[:, 1], np.roll(q[:, 0], 1)))
        if a > best_a:
            best, best_a = q, a
    return best


def crystal(rng, base, height, lean=0.12, ridge_p=0.15, shoulders=(0, 2)):
    """A faceted pyramid over a convex base polygon (xy, ground at z=0)."""
    base = np.asarray(base, float)
    c = base.mean(0)
    R = math.sqrt(Polygon(base).area / math.pi)
    apex_xy = c + rng.normal(0, lean, 2) * R
    pts = [np.append(b, 0.0) for b in base]
    pts.append(np.append(apex_xy, height))
    if rng.uniform() < ridge_p:
        a = rng.uniform(0, 2 * math.pi)
        d = np.array([math.cos(a), math.sin(a)]) * R * rng.uniform(0.25, 0.55)
        pts.append(np.append(apex_xy + d, height * rng.uniform(0.82, 0.97)))
    n_sh = rng.integers(*shoulders) if rng.uniform() < 0.45 else 0
    for _ in range(n_sh):
        b = base[rng.integers(len(base))]
        t = rng.uniform(0.2, 0.62)
        p = (1 - t) * b + t * apex_xy
        out = p - c
        nrm = np.linalg.norm(out) + 1e-9
        p = p + out / nrm * R * rng.uniform(0.04, 0.16)
        pts.append(np.append(p, height * t * rng.uniform(0.95, 1.15)))
    try:
        return hull_mesh(np.array(pts))
    except Exception:
        return None


def build_field(rng, fg_bases):
    sites = field_sites(rng)
    ring = [[200 * math.cos(a), 200 * math.sin(a)] for a in np.linspace(0, 2 * math.pi, 32, endpoint=False)]
    vor = Voronoi(np.vstack([sites, ring]))
    # noise lives in the warped plane, so its features scale with the world
    nH = Noise2(rng, fmin=0.35, fmax=1.3)
    nHeat = Noise2(rng, fmin=0.22, fmax=0.9)
    nW = Noise2(rng, fmin=1.0, fmax=3.0)
    blockers = [Polygon(b) for b in fg_bases]
    out = {k: dict(V=[], F=[], rnd=[], tiles=[], nv=0) for k in ("mg", "bg")}
    stats = dict(mg=0, bg=0, spikes=0)
    for i, c in enumerate(sites):
        reg = vor.regions[vor.point_region[i]]
        if -1 in reg or len(reg) < 3:
            continue
        cell = Polygon(vor.vertices[reg])
        if not cell.is_valid or cell.area <= 0:
            continue
        x, y = c
        s = float(s_of(y))
        xi, wv = x / s, float(w_of(y))
        hv = float(nHeat(xi * 0.6, wv * 0.6))
        heat = float(np.clip((hv + 0.10) / 0.55, 0, 1)) ** 1.6
        # composed hot zones (ground x, y, radius): where the eye should land, on every format
        for zx, zy, zr, zk in HOT:
            dd = math.hypot(x - zx, (y - zy) * 0.8) / zr
            heat = max(heat, zk * math.exp(-dd * dd) * (0.75 + 0.25 * float(nW(xi * 0.5, wv * 0.5))))
        # the glow lives in the field: low right under the camera, fading toward the horizon
        prof = float(np.clip((y - 1.8) / 1.7, 0, 1)) * (1 - 0.55 * float(np.clip((y - 12) / 18, 0, 1)))
        heat *= prof
        Lc = "mg" if y < Y_SPLIT else "bg"
        out[Lc]["tiles"].append((np.asarray(cell.exterior.coords)[:-1], heat, s))
        if any(b.contains(Point(x, y)) for b in blockers):
            continue
        # wider fissures where it is hot: the glow shows through
        gap = s * (0.020 + 0.035 * heat) * (0.8 + 0.4 * (0.5 + 0.5 * float(nW(xi, wv))))
        poly = cell.buffer(-gap / 2, join_style=2)
        if poly.is_empty or poly.geom_type != "Polygon" or poly.area < 0.25 * cell.area:
            continue
        base = np.asarray(poly.exterior.coords)[:-1]
        if len(base) > 9:
            base = base[np.linspace(0, len(base) - 1, 9).astype(int)]
        base = simplify_base(rng, base)
        poly = Polygon(base)
        # heights: mostly mid, a share of tall spikes, modulated by a broad noise (ranges and valleys)
        hf = float(np.clip(rng.lognormal(math.log(0.55), 0.30), 0.25, 1.1))
        if rng.uniform() < 0.09:
            hf = rng.uniform(1.1, 1.7)
            stats["spikes"] += 1
        hf *= 0.80 + 0.45 * (0.5 + 0.5 * float(nH(xi, wv)))
        hf /= 1 + 0.035 * y  # the far field flattens toward the horizon
        R = math.sqrt(poly.area / math.pi)
        H = hf * 2 * R
        m = crystal(rng, base, H)
        if m is None:
            continue
        V, F = m
        L = "mg" if y < Y_SPLIT else "bg"
        o = out[L]
        o["V"].append(V)
        o["F"].append(F + o["nv"])
        o["nv"] += len(V)
        o["rnd"].extend([rng.uniform()] * len(F))
        o.setdefault("heat", []).extend([heat] * len(F))
        o.setdefault("hz", []).append(V[:, 2] / max(V[:, 2].max(), 1e-6))
        stats[L] += 1
    print(f"[field] sites={len(sites)} mg={stats['mg']} bg={stats['bg']} spikes={stats['spikes']}", flush=True)
    res = {}
    for L, o in out.items():
        res[L] = (np.vstack(o["V"]), np.vstack(o["F"]), np.array(o["rnd"]), o["tiles"],
                  np.array(o["heat"]), np.concatenate(o["hz"]))
    return res


def fg_shards(rng):
    """Framing shards: a stepped V rising toward both edges, plus a low ridge at the bottom centre.

    Each entry: apex screen position (u, v), apex depth along the view axis, base radius, base offset (outward, back).
    """
    spec = [
        # left: a stepped V rising to the edge, filling the corner
        (-0.70, 0.12, 2.0, 0.85, (-0.30, 0.20)),
        (-0.52, 0.05, 1.85, 0.62, (-0.18, 0.12)),
        (-0.40, -0.08, 1.6, 0.48, (-0.12, 0.06)),
        (-0.29, -0.22, 1.4, 0.36, (-0.06, 0.03)),
        (-0.60, -0.30, 1.2, 0.55, (-0.20, 0.0)),
        # right
        (0.72, 0.14, 2.1, 0.9, (0.30, 0.20)),
        (0.54, 0.07, 1.95, 0.64, (0.18, 0.12)),
        (0.41, -0.05, 1.7, 0.50, (0.12, 0.06)),
        (0.30, -0.18, 1.45, 0.38, (0.06, 0.03)),
        (0.62, -0.28, 1.25, 0.56, (0.20, 0.0)),
        # bottom centre ridge, low and wide
        (0.02, -0.40, 1.2, 0.26, (0.0, 0.06)),
    ]
    verts, faces, rnds, bases, hzs = [], [], [], [], []
    nv = 0
    for u, v, z, R, off in spec:
        apex = from_screen(u, v, z)
        if apex[2] <= 0.05:
            continue
        cxy = apex[:2] + np.array(off) * R * 2
        k = rng.integers(5, 8)
        ang = np.sort(rng.uniform(0, 2 * math.pi, k))
        rad = R * rng.uniform(0.75, 1.15, k)
        base = np.stack([cxy[0] + rad * np.cos(ang), cxy[1] + rad * np.sin(ang)], 1)
        base = np.asarray(Polygon(base).convex_hull.exterior.coords)[:-1]
        pts = [np.append(b, 0.0) for b in base] + [apex]
        # facet shoulders and a secondary crest for a stepped silhouette
        for _ in range(rng.integers(2, 5)):
            b = base[rng.integers(len(base))]
            t = rng.uniform(0.25, 0.7)
            p = (1 - t) * b + t * apex[:2]
            d = p - cxy
            p = p + d / (np.linalg.norm(d) + 1e-9) * R * rng.uniform(0.05, 0.18)
            pts.append(np.append(p, apex[2] * t * rng.uniform(1.0, 1.2)))
        try:
            V, F = hull_mesh(np.array(pts))
        except Exception:
            continue
        verts.append(V)
        faces.append(F + nv)
        nv += len(V)
        rnds.extend([rng.uniform()] * len(F))
        bases.append(base)
        hzs.append(V[:, 2] / max(V[:, 2].max(), 1e-6))
    print(f"[fg] shards={len(verts)}", flush=True)
    return np.vstack(verts), np.vstack(faces), np.array(rnds), bases, np.concatenate(hzs)


def floor_from_tiles(tiles, z_off=0.012):
    V, F, H = [], [], []
    for poly, heat, s in tiles:
        b = len(V)
        z = -z_off * s
        c = poly.mean(0)
        V.append([c[0], c[1], z])
        for p in poly:
            V.append([p[0], p[1], z])
        n = len(poly)
        for k in range(n):
            F.append([b, b + 1 + k, b + 1 + (k + 1) % n])
            H.append(heat)
    return np.array(V), np.array(F), np.array(H)


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------
def add_point_attr(ob, name, vals):
    at = ob.data.attributes.new(name, "FLOAT", "POINT")
    at.data.foreach_set("value", np.asarray(vals, np.float32))


def glass_with_base_glow(density, absorb, glow, falloff):
    """Obsidian glass + light bleeding into the base of each crystal (emission, blue = 0, so it lands in the glow pass).

    glow strength = glow * heat * (1 - hz)^falloff * broken noise; hz = 0 at the base, 1 at the apex.
    """
    m = obsidian_material(density)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    for n in N:
        if n.bl_idname == "ShaderNodeVolumeAbsorption":
            n.inputs["Color"].default_value = absorb
    for n in N:  # softer crack relief than the top-down v1: at a grazing angle it reads as veins
        if n.bl_idname == "ShaderNodeBump" and abs(n.inputs["Strength"].default_value - 0.6) < 1e-6:
            n.inputs["Strength"].default_value = 0.35
    out = next(n for n in N if n.bl_idname == "ShaderNodeOutputMaterial")
    bsdf = next(n for n in N if n.bl_idname == "ShaderNodeBsdfPrincipled")
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.28, 0.0, 1)
    add = N.new("ShaderNodeAddShader")
    L.new(bsdf.outputs[0], add.inputs[0])
    L.new(em.outputs[0], add.inputs[1])
    L.new(add.outputs[0], out.inputs["Surface"])

    def math(op, a, b, clamp=False):
        n = N.new("ShaderNodeMath")
        n.operation = op
        n.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L.new(v, n.inputs[i])
        return n.outputs[0]

    hz = N.new("ShaderNodeAttribute")
    hz.attribute_name = "hz"
    ht = N.new("ShaderNodeAttribute")
    ht.attribute_name = "heat"
    geo = N.new("ShaderNodeNewGeometry")
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2.4
    nz.inputs["Detail"].default_value = 4
    L.new(geo.outputs["Position"], nz.inputs["Vector"])
    brk = N.new("ShaderNodeMapRange")
    brk.inputs["From Min"].default_value = 0.32
    brk.inputs["From Max"].default_value = 0.68
    brk.inputs["To Min"].default_value = 0.15
    brk.inputs["To Max"].default_value = 1.0
    L.new(nz.outputs["Fac"], brk.inputs["Value"])
    base = math("POWER", math("SUBTRACT", 1.0, hz.outputs["Fac"], clamp=True), falloff)
    heat = math("ADD", math("MULTIPLY", math("POWER", ht.outputs["Fac"], 1.3), 0.82), 0.18)
    k = math("MULTIPLY", math("MULTIPLY", base, heat), brk.outputs["Result"])
    L.new(math("MULTIPLY", k, glow), em.inputs["Strength"])
    return m


# --------------------------------------------------------------------------
# scene
# --------------------------------------------------------------------------
def world_light(w, gain):
    nt = w.node_tree
    N, L = nt.nodes, nt.links
    for n in list(N):
        N.remove(n)
    out = N.new("ShaderNodeOutputWorld")
    bg = N.new("ShaderNodeBackground")
    L.new(bg.outputs[0], out.inputs[0])
    tc = N.new("ShaderNodeTexCoord")
    nrm = N.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    L.new(tc.outputs["Generated"], nrm.inputs[0])
    D = nrm.outputs[0]

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

    def dot(vec):
        n = N.new("ShaderNodeVectorMath")
        n.operation = "DOT_PRODUCT"
        L.new(D, n.inputs[0])
        v = np.array(vec, float)
        n.inputs[1].default_value = tuple(v / np.linalg.norm(v))
        return n.outputs["Value"]

    def lobe(vec, c0, c1):
        return m("POWER", m("DIVIDE", m("SUBTRACT", dot(vec), c0), c1 - c0, clamp=True), 2.0)

    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(D, sep.inputs[0])
    z = sep.outputs["Z"]
    # big overhead softbox, front-left of the zenith
    soft = m("ADD", m("MULTIPLY", lobe((-0.55, -0.15, 1.0), 0.62, 0.96), 1.3),
             m("MULTIPLY", lobe((0.65, -0.35, 0.75), 0.78, 0.97), 0.6))
    # a long strip low over the far field: sheen on the gentle slopes
    strip = m("MULTIPLY", m("MULTIPLY", m("SUBTRACT", 1.0, m("DIVIDE", m("ABSOLUTE", m("SUBTRACT", z, 0.16)), 0.06), clamp=True),
                            m("MULTIPLY", sep.outputs["Y"], 3.0, clamp=True)), 1.0)
    # faint ambient above the horizon
    amb = m("MULTIPLY", m("ADD", z, 0.05, clamp=True), 0.02)
    lum = m("MULTIPLY", m("ADD", m("ADD", soft, strip), amb), gain)
    L.new(lum, bg.inputs["Strength"])
    bg.inputs["Color"].default_value = (1, 1, 1, 1)


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
    cy.transmission_bounces = 8
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
    world_light(w, args.world)
    sc.world = w

    cam_data = bpy.data.cameras.new("cam")
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.sensor_width = 36.0
    cam_data.lens = 18.0 / TAN_HALF
    cam_data.clip_start = 0.05
    cam_data.clip_end = 400
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.location = tuple(C)
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = _look_quat(FWD)
    if args.dof:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_distance = args.focus
        cam_data.dof.aperture_fstop = args.fstop
        cam_data.dof.aperture_blades = 6
        cam_data.dof.aperture_rotation = math.radians(15)

    def area(name, loc, target, size, power):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = "RECTANGLE"
        ld.size = size[0]
        ld.size_y = size[1]
        ld.energy = power
        ld.color = (1, 1, 1)
        ob = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = _look_quat(np.array(target) - np.array(loc))
        ob.visible_camera = False
        return ob

    # overhead key over the mid field, a little to the left
    area("key", (-2.5, 5.0, 7.0), (0.5, 5.5, 0.0), (9.0, 3.0), args.key)
    # far rim: low behind the field, facing the camera (edges and crests)
    area("rim", (1.5, 26.0, 2.6), (0.0, 0.0, 0.6), (26.0, 1.2), args.key * 2.2)
    return sc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--res", type=int, default=640)
    ap.add_argument("--spp", type=int, default=16)
    ap.add_argument("--layer", default="all")
    ap.add_argument("--out", default="out/v2/prev.exr")
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--dof", type=int, default=0)
    ap.add_argument("--focus", type=float, default=4.0)
    ap.add_argument("--fstop", type=float, default=1.4)
    ap.add_argument("--key", type=float, default=240.0)
    ap.add_argument("--world", type=float, default=0.7)
    ap.add_argument("--emit", type=float, default=0.35)
    ap.add_argument("--density", type=float, default=1.0)
    ap.add_argument("--absorb", default="0.80,0.26,0.05")
    ap.add_argument("--baseglow", type=float, default=1.4)
    ap.add_argument("--falloff", type=float, default=10.0)
    args = ap.parse_args()
    t0 = time.time()
    sc = setup_scene(args)
    fv, ff, fr, fbases, fhz = fg_shards(np.random.default_rng(args.seed + 1000))
    field = build_field(np.random.default_rng(args.seed), fbases)
    dens = {"bg": 120.0, "mg": 140.0, "fg": 150.0}
    args.absorb = args.absorb
    absorb = tuple(float(x) for x in args.absorb.split(",")) + (1.0,)

    def glass(L):
        return glass_with_base_glow(dens[L] * args.density, absorb, args.baseglow, args.falloff)

    emit = {"bg": 7.0, "mg": 8.0, "fg": 9.0}
    objs = {}
    for L in ("bg", "mg"):
        V, F, rnd, tiles, heat, hz = field[L]
        ob = mesh_object(f"field_{L}", V, F, {"rnd": rnd, "heat": heat})
        add_point_attr(ob, "hz", hz)
        ob.data.materials.append(glass(L))
        tv, tf, th = floor_from_tiles(tiles)
        fl = mesh_object(f"floor_{L}", tv, tf, {"heat": th})
        fl.data.materials.append(ember_material(emit[L] * args.emit))
        objs[L] = (ob, fl)
    ob = mesh_object("fg", fv, ff, {"rnd": fr, "heat": np.full(len(ff), 0.6)})
    add_point_attr(ob, "hz", fhz)
    ob.data.materials.append(glass("fg"))
    tiles = [(b, 0.30, 0.9) for b in fbases]
    tv, tf, th = floor_from_tiles(tiles)
    fl = mesh_object("floor_fg", tv, tf, {"heat": th})
    fl.data.materials.append(ember_material(emit["fg"] * args.emit))
    objs["fg"] = (ob, fl)
    if args.layer != "all":
        for L, group in objs.items():
            for o in group:
                o.visible_camera = L == args.layer
    print(f"scene built in {time.time()-t0:.1f}s", flush=True)
    sc.render.filepath = args.out
    t1 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"render {args.layer} {args.res}px {args.spp}spp in {time.time()-t1:.1f}s", flush=True)


if __name__ == "__main__":
    main()
