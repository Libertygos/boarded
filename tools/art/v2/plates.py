#!/usr/bin/env python3
"""Art v2 (#1757): turn generated images into finished plates. Every plate = ink layer (colour locked)
fitted into a fixed art box on the one master parchment, so figure size and paper match across the deck."""
import glob, json, math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ni
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import post

W, H = 1760, 2464          # master: twice the 880x1232 of the bible, for zoom and print
ART_BOX = (0.05, 0.135, 0.95, 0.74)   # x0, y0, x1, y1 of the art between the title and the text


def src(gen_dir, vid, seed=None):
    fs = sorted(glob.glob(f"{gen_dir}/{vid}/*/*.png"))
    if seed is not None:
        fs = [f for f in fs if f"/s{seed}/" in f]
    return fs[0] if fs else None


def parchment(path):
    """One master paper: fine grain kept, the cloudy mid-tones calmed, mean set to the warm cream (240, 228, 202)."""
    p = np.asarray(Image.open(path).convert("RGB").resize((W, H), Image.LANCZOS), np.float64) / 255
    fine = ni.gaussian_filter(p, (3, 3, 0))
    broad = ni.gaussian_filter(p, (160, 160, 0))
    mean = p.mean((0, 1))
    out = mean + 0.55 * (broad - mean) + 0.30 * (fine - broad) + (p - fine)
    out = out * (np.array([240, 228, 202]) / 255 / out.mean((0, 1)))
    return np.clip(out, 0, 1).astype(np.float32)


def resize(a, w, h):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).resize((w, h), Image.LANCZOS), np.float32) / 255


def lock_for(asset):
    for k, hx in post.SUIT.items():
        if asset.endswith("_" + k):
            return [hx]
    table = {"matelot": "sabres", "matelots": "sabres", "navigateur": "voiles", "maitre_voilier": "voiles",
             "canonnier": "canons", "maitre_canonnier": "canons", "officier": "pistolets", "quartier_maitre": "pistolets",
             "kraken": "canons", "tourbillon": "pistolets", "ile_brumeuse": "voiles", "tempete": "sabres", "bateau_fantome": "pistolets"}
    for k, v in table.items():
        if asset.endswith("_" + k):
            return [post.SUIT[v]]
    if asset.endswith("capitaine"):
        return list(post.SUIT.values())
    return None   # natural colour allowed (classic talismans)


def ink_bbox(ink, thresh=0.72, min_frac=0.0015):
    """Box of the real drawing: rows and columns holding a real amount of ink, so stray spatter does not count."""
    dark = ink.mean(-1) < thresh
    rows, cols = dark.mean(1), dark.mean(0)
    ys = np.where(rows > min_frac)[0]; xs = np.where(cols > min_frac)[0]
    if len(ys) < 2 or len(xs) < 2:
        return 0, 0, ink.shape[1], ink.shape[0]
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


def fit_in_box(ink, box=ART_BOX, pad=0.02):
    """Scale the drawing's bbox to fill the art box. White (1.0) outside; its edges fade so nothing shows a cut."""
    x0, y0, x1, y1 = ink_bbox(ink)
    h, w = ink.shape[:2]
    px, py = int((x1 - x0) * pad) + 8, int((y1 - y0) * pad) + 8
    # does the drawing itself reach the source's edge? Tested before padding, or a drawing near the edge would be faded
    e = int(0.004 * w) + 1
    runs = (x0 <= e, y0 <= e, x1 >= w - e, y1 >= h - e)
    x0, y0, x1, y1 = max(x0 - px, 0), max(y0 - py, 0), min(x1 + px, w), min(y1 + py, h)
    crop = ink[y0:y1, x0:x1]
    bw, bh = int((box[2] - box[0]) * W), int((box[3] - box[1]) * H)
    s = min(bw / crop.shape[1], bh / crop.shape[0])
    nw, nh = max(int(crop.shape[1] * s), 1), max(int(crop.shape[0] * s), 1)
    art = resize(crop, nw, nh)
    # fade margin
    m = max(int(0.02 * max(nw, nh)), 4); M = int(0.09 * nw)
    ml, mt, mr, mb = [M if r else m for r in runs]
    # a side that runs off the source ends on a wavering brush edge, never a straight cut
    def wob(n, on, amp, seed=0):
        if not on: return np.zeros(n, np.float32)
        w = ni.gaussian_filter1d(np.random.RandomState(n % 97 + seed).rand(n), max(n * .025, 2)); w = (w - w.min()) / (np.ptp(w) + 1e-6)
        return w * amp
    X, Y = np.arange(nw, dtype=np.float32), np.arange(nh, dtype=np.float32)
    xx = np.minimum((X[None, :] - wob(nh, runs[0], ml * 1.3)[:, None]) / ml, (X[::-1][None, :] - wob(nh, runs[2], mr * 1.3, 1)[:, None]) / mr)
    yy = np.minimum((Y[:, None] - wob(nw, runs[1], mt * 1.3)[None, :]) / mt, (Y[::-1][:, None] - wob(nw, runs[3], mb * 1.3, 1)[None, :]) / mb)
    f = (np.clip(np.minimum(xx, yy), 0, 1) ** 1.5)[..., None]
    art = 1 - (1 - art) * f
    out = np.ones((H, W, 3), np.float32)
    ox = int(box[0] * W + (bw - nw) / 2); oy = int(box[1] * H + (bh - nh) / 2)
    out[oy:oy + nh, ox:ox + nw] = art
    return out


def clean(ink, white=0.90):
    """Everything close to bare paper becomes bare paper: the plate can then sit anywhere with no box around it.
    Grain an upscale kept (specks on a near-white area) goes too; real washes stay darker than this once blurred."""
    out = np.clip(ink / white, 0, 1)
    k = max(ink.shape[1] / 1024, 1)
    g = ni.gaussian_filter(out.mean(-1), 2.5 * k)
    m = np.clip((g - 0.93) / 0.04, 0, 1)[..., None]
    return out * (1 - m) + m


BOX = {1: ART_BOX, 2: (0.05, 0.135, 0.95, 0.71), 3: (0.07, 0.135, 0.93, 0.72)}

def erase_rects(ink, rects):
    """White out stray ink: rects are x0, y0, x1, y1 as fractions, feathered."""
    h, w = ink.shape[:2]
    m = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in rects or []:
        m[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1
    m = ni.gaussian_filter(m, 5)[..., None]
    return 1 - (1 - ink) * (1 - m)


def make_plate(path, asset, paper, box=ART_BOX, erase=None, ghost=None):
    ink = erase_rects(clean(post.ink_layer(post.load(path))), erase)
    hx = lock_for(asset)
    if hx:
        ink = post.lock_suit(ink, hx)
    if ghost:
        # the ship above the waterline as a faint apparition: ink strength scaled, full again below the water
        y1, a = ghost
        t = np.clip((y1 - np.arange(ink.shape[0]) / ink.shape[0]) / 0.04, 0, 1)[:, None, None]
        ink = 1 - (1 - ink) * (1 - t * (1 - a))
    return post.on_parchment(fit_in_box(ink, box=box), paper)


# ---------- boardings
BURST_POS = {2: [(0.31, 0.27), (0.69, 0.26)], 3: [(0.20, 0.27), (0.50, 0.235), (0.80, 0.27)]}
# layout B keeps a value index down the left edge: the bursts move right of it
BURST_POS_B = {2: [(0.43, 0.245), (0.76, 0.265)], 3: [(0.33, 0.27), (0.60, 0.21), (0.84, 0.27)]}

def clean_burst(ink, grow=26):
    """Only the burst: what touches the centre, within a small reach. Strokes and clouds beside it go."""
    d = 1 - ink.min(-1)
    m = ni.binary_dilation(d > 0.25, iterations=grow)
    lab, n = ni.label(m)
    h, w = m.shape
    c = lab[h // 2 - 20:h // 2 + 20, w // 2 - 20:w // 2 + 20]; c = c[c > 0]
    if not len(c):
        return ink
    keep = lab == np.bincount(c).argmax()
    return 1 - (1 - ink) * ni.gaussian_filter(keep.astype(np.float32), 3)[..., None]

def make_boarding(scene_path, burst_paths, paper, burst_scale=None, right_of_index=False, bottom=0.74, pos=None):
    """scene_path: black plate; burst_paths: one image per value of the profile, in profile order."""
    ink = clean(post.strip_colour(post.ink_layer(post.load(scene_path))))
    fitted = fit_in_box(ink, box=(0.05, 0.37, 0.95, bottom))
    n = len(burst_paths)
    s = burst_scale or ({2: 0.46, 3: 0.33} if right_of_index else {2: 0.46, 3: 0.37})[n]
    for (cx, cy), (bp, hx, *er) in zip((pos or (BURST_POS_B if right_of_index else BURST_POS))[n], burst_paths):
        bi = post.lock_suit(clean_burst(erase_rects(clean(post.ink_layer(post.load(bp))), er[0] if er else None)), [hx])
        fitted = post.stamp(fitted, bi, cx, cy, s)
    return post.on_parchment(fitted, paper)


# ---------- map: border trim + a route that always crosses the four quarters
ROUTE = [(0.13, 0.90), (0.30, 0.83), (0.50, 0.90), (0.72, 0.80), (0.88, 0.64), (0.86, 0.42), (0.73, 0.27), (0.52, 0.19), (0.34, 0.20), (0.22, 0.155)]
X_AT = (0.20, 0.135)

def _catmull(pts, n=40):
    P = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = map(np.array, P[i - 1:i + 3])
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return np.array(out)

def rough(mask, seed, amp=5.0):
    r = np.random.RandomState(seed)
    n = ni.gaussian_filter(r.rand(*mask.shape), 3.0); n = (n - n.mean()) / (n.std() + 1e-6)
    return ni.gaussian_filter(mask.astype(np.float32), 1.5) + n * 0.09 * amp / 5

def route_layer(w, h, route=ROUTE, xat=X_AT, seed=7):
    """Dashes and an X in vermillion, rough ink edges, returned as an ink layer."""
    im = Image.new("L", (w, h), 0); d = ImageDraw.Draw(im)
    c = _catmull([(x * w, y * h) for x, y in route])
    seg = np.hypot(*np.diff(c, axis=0).T); dist = np.concatenate([[0], np.cumsum(seg)])
    dash, gap = 0.030 * w, 0.019 * w; lw = int(0.0115 * w)
    s = 0.0
    while s < dist[-1]:
        idx = np.where((dist >= s) & (dist <= s + dash))[0]
        if len(idx) > 1:
            d.line([tuple(c[i]) for i in idx], fill=255, width=lw, joint="curve")
            for e in (idx[0], idx[-1]):
                d.ellipse((c[e][0] - lw / 2, c[e][1] - lw / 2, c[e][0] + lw / 2, c[e][1] + lw / 2), fill=255)
        s += dash + gap
    xc, yc = xat[0] * w, xat[1] * h; a = 0.042 * w; lx = int(0.019 * w)
    d.line([(xc - a, yc - a), (xc + a, yc + a)], fill=255, width=lx); d.line([(xc - a, yc + a), (xc + a, yc - a)], fill=255, width=lx)
    m = np.asarray(im, np.float32) / 255
    a2 = np.clip((rough(m, seed) - 0.42) / 0.12, 0, 1)
    col = post.hex_rgb(post.SUIT["canons"])
    grain = 0.90 + 0.10 * ni.gaussian_filter(np.random.RandomState(seed + 1).rand(h, w), 1.2) * 2
    ink = 1 - (1 - col) * (a2 * np.clip(grain, 0, 1))[..., None]
    return ink

def make_map(path, paper, trim=0.045, route=ROUTE, xat=X_AT):
    img = post.load(path)
    ink = post.strip_colour(post.ink_layer(img))
    h, w = ink.shape[:2]
    tx, ty = int(trim * w), int(trim * h)
    ink = resize(ink[ty:h - ty, tx:w - tx], W * 2, H * 2)
    return post.on_parchment(ink * route_layer(W * 2, H * 2, route, xat), resize(paper, W * 2, H * 2))

def map_quarter(m, q):
    H2, W2 = m.shape[:2]
    y = 0 if q[0] == "h" else H2 // 2
    x = 0 if q[1] == "g" else W2 // 2
    return m[y:y + H2 // 2, x:x + W2 // 2]


# ---------- backs and token
def sym_centre(ink, reach=0.14):
    """Point of the drawing around which it best matches itself turned 180 degrees (x, y as fractions)."""
    h, w = ink.shape[:2]
    d = 1 - ink.mean(-1)[::4, ::4]
    # only the inner zone: the frame must not vote
    my, mx = d.shape[0] // 8, d.shape[1] // 8
    z = np.zeros_like(d); z[my:-my, mx:-mx] = d[my:-my, mx:-mx]; z -= z.mean()
    c = np.fft.ifft2(np.fft.fft2(z) * np.fft.fft2(z[::-1, ::-1]).conj()).real
    H, W_ = z.shape
    best, by, bx = -1e18, 0, 0
    r_y, r_x = int(H * reach * 2), int(W_ * reach * 2)
    for yy in range(-r_y, r_y + 1):
        for xx in range(-r_x, r_x + 1):
            v = c[yy % H, xx % W_]
            if v > best:
                best, by, bx = v, yy, xx
    return 0.5 + (bx + 1) / 2 / W_, 0.5 + (by + 1) / 2 / H

def make_back(path, paper, keep="top", emblems=None, emblem_alpha=None, cy=None, cx=None, colour=False):
    """The frame is mirrored as drawn; the centre motif is moved onto the card's exact centre first.
    cy/cx: its point of symmetry if the automatic search is not wanted (a double-ended ship: the waterline)."""
    ink = clean(post.ink_layer(post.load(path)))
    if not colour:
        ink = post.strip_colour(ink)
    if keep == "bottom":
        ink = ink[::-1, ::-1]
    h, w = ink.shape[:2]
    frame = post.rot180_sym(ink, feather=0.012)
    ax, ay = sym_centre(ink)
    ax = ax if cx is None else cx; ay = ay if cy is None else cy
    dy, dx = int((0.5 - ay) * h), int((0.5 - ax) * w)
    inner = np.roll(ink, (dy, dx), axis=(0, 1))
    if dy > 0: inner[:dy] = 1.0
    if dx > 0: inner[:, :dx] = 1.0
    if dx < 0: inner[:, dx:] = 1.0
    inner = post.rot180_sym(inner, feather=0.012)
    m = np.zeros((h, w), np.float32); iy, ix = int(0.085 * h), int(0.11 * w); m[iy:h - iy, ix:w - ix] = 1
    m = ni.gaussian_filter(m, 6)[..., None]
    ink = frame * (1 - m) + inner * m
    ink = resize(ink, W, H)
    if emblems:
        # point-symmetric: the eight stamps come in opposite pairs, each value twice
        pos = emblems
        for (cx, cy, val) in pos:
            a = np.asarray(emblem_alpha[val].resize((int(W * .13), int(W * .13)), Image.LANCZOS), np.float32) / 255
            for (px, py, flip) in ((cx, cy, False), (1 - cx, 1 - cy, True)):
                aa = a[::-1, ::-1] if flip else a
                x0, y0 = int(px * W - aa.shape[1] / 2), int(py * H - aa.shape[0] / 2)
                reg = ink[y0:y0 + aa.shape[0], x0:x0 + aa.shape[1]]
                col = post.hex_rgb(post.SUIT[val])
                # a halo of bare paper, then the emblem: it must read over the waves
                halo = np.clip(ni.gaussian_filter(aa, 7) * 3, 0, 1)[..., None]
                reg[...] = (reg * (1 - halo) + halo) * (1 - aa[..., None]) + col * aa[..., None]
    return post.on_parchment(ink, paper)

def make_token(plate, size=1024):
    """Round token from the centre of a Master of the Wind card master, ringed with a double ink line."""
    h, w = plate.shape[:2]
    side = int(w * 0.96); x0, y0 = (w - side) // 2, int((ART_BOX[1] + ART_BOX[3]) / 2 * h - side / 2)
    c = (np.clip(plate[y0:y0 + side, x0:x0 + side], 0, 1) * 255).astype(np.uint8)
    im = Image.fromarray(c).resize((size * 2, size * 2), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", im.size, 0); ImageDraw.Draw(mask).ellipse((4, 4, size * 2 - 4, size * 2 - 4), fill=255); im.putalpha(mask)
    d = ImageDraw.Draw(im); ink = (26, 23, 20, 255)
    d.ellipse((6, 6, size * 2 - 6, size * 2 - 6), outline=ink, width=int(size * .035))
    d.ellipse((size * .1, size * .1, size * 1.9, size * 1.9), outline=ink, width=int(size * .008))
    return im.resize((size, size), Image.LANCZOS)
