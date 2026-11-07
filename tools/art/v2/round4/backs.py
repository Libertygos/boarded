#!/usr/bin/env python3
"""Round 4 backs (#1757): ornamental panels assembled from separately generated parts, exactly point-symmetric.
field (seigaiha waves or a black ink field) + rope frame + a central crest; events keep the four corner discs.
Run from the scratchpad: r4/backs.py [--lo] ; parts chosen in PARTS."""
import glob, os, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'r2')
import numpy as np, scipy.ndimage as ni
import plates, post
sys.argv += ['--lo'] if '--lo' not in sys.argv else []
import final as F
from cards import V
W, H = plates.W, plates.H
LO = '--hi' not in sys.argv
OUT = 'r4/out/backs'

def src(n, s):
    p = glob.glob(f'r4/gen/{n}/s{s}/*.png')[0]
    q = p.replace('/gen/', '/gen_hi/', 1)
    return q if (not LO and os.path.exists(q)) else p

def ink(path, colour=False):
    a = plates.clean(post.ink_layer(post.load(path)))
    return a if colour else post.strip_colour(a)

def rot(a):
    return a[::-1, ::-1]

def sym(a):
    """Exact point symmetry: top half + the same turned 180 degrees, short feather on the seam."""
    return post.rot180_sym(a, feather=0.01)

def crop_obj(a, pad=0.03):
    """The object only: its largest connected ink mass (spatter dropped), cropped square on its own centre."""
    d = 1 - a.min(-1)
    m = ni.binary_closing(d > 0.25, iterations=4)
    lab, n = ni.label(m)
    keep = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    keep = ni.binary_fill_holes(keep)
    soft = ni.gaussian_filter(ni.binary_dilation(keep, iterations=6).astype(np.float32), 3)[..., None]
    a = 1 - (1 - a) * soft
    ys, xs = np.where(keep); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    h, w = a.shape[:2]; p = int(pad * w)
    a = a[max(y0 - p, 0):y1 + p, max(x0 - p, 0):x1 + p]
    # square around its centre, so its own centre is the card's centre
    s = max(a.shape[:2]); out = np.ones((s, s, 3), np.float32)
    oy, ox = (s - a.shape[0]) // 2, (s - a.shape[1]) // 2
    out[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return out

def place(canvas, obj, d, cy=0.5):
    """Multiply obj (square ink layer) centred at (W/2, cy*H), diameter d (fraction of W)."""
    S = int(d * W); o = plates.resize(obj, S, S)
    x0, y0 = (W - S) // 2, int(cy * H - S / 2)
    canvas[y0:y0 + S, x0:x0 + S] *= o
    return canvas

def disc_mask(r, soft=0.012, cy=0.5):
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx - W / 2, yy - cy * H) / W
    return np.clip((r - d) / soft, 0, 1)[..., None]

def seigaiha(r=0.085, rings=4, strength=0.28, seed=3):
    """Seigaiha drawn as brushed ink: rows of scales, each a stack of concentric arcs, later rows over earlier."""
    from PIL import Image, ImageDraw
    k = 2; w, h = W * k // 2, H * k // 2; R = int(r * w)
    im = Image.new('L', (w, h), 255); d = ImageDraw.Draw(im)
    lw = max(int(R * 0.075), 2)
    row = 0
    for y in range(-R, h + 2 * R, R // 2):
        off = 0 if row % 2 == 0 else R
        for x in range(-2 * R + off, w + 2 * R, 2 * R):
            d.ellipse((x - R, y - R, x + R, y + R), fill=255)
            for i in range(rings):
                rr = R * (1 - i / rings)
                d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=0, width=lw)
        row += 1
    a = np.asarray(im, np.float32) / 255
    rs = np.random.RandomState(seed)
    # brush: wobble the lines a little, vary the ink load, soften
    n1 = ni.gaussian_filter(rs.randn(h, w), 6); n2 = ni.gaussian_filter(rs.randn(h, w), 6)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = ni.map_coordinates(a, [yy + n1 * 25, xx + n2 * 25], order=1, mode='reflect')
    load = np.clip(0.75 + ni.gaussian_filter(rs.randn(h, w), 40) * 6, 0.35, 1)
    a = 1 - (1 - ni.gaussian_filter(a, 1.0)) * load
    a = plates.resize(np.repeat(a[..., None], 3, -1), W, H)
    return sym(1 - (1 - a) * strength)

def dark_field(seed=5, base=0.10):
    rs = np.random.RandomState(seed)
    t = ni.gaussian_filter(rs.randn(H, W), (3, 60))     # long horizontal dry-brush streaks
    c = ni.gaussian_filter(rs.randn(H, W), 120)          # pooled tones
    a = base + t * 0.9 + c * 9
    a = np.clip(a, 0.03, 0.22)
    return sym(np.repeat(a[..., None], 3, -1).astype(np.float32))

def field_waves(n, s, strength=0.30):
    a = plates.resize(ink(src(n, s)), W, H)
    a = 1 - (1 - a) * strength
    return sym(a)

def field_dark(n, s):
    a = plates.resize(ink(src(n, s)), W, H)
    # a deep but living black: lift nothing above 0.2, keep the brush texture below
    a = np.clip(a, 0, 1) ** 1.4 * 0.35 + 0.04
    return sym(a)

def frame_rope(n, s):
    a = plates.resize(ink(src(n, s)), W, H)
    m = np.ones((H, W), np.float32); iy, ix = int(0.09 * H), int(0.11 * W); m[iy:H - iy, ix:W - ix] = 0
    m = ni.gaussian_filter(m, 8)[..., None]
    return sym(1 - (1 - a) * m)

def crest(n, s, colour=False):
    c = crop_obj(ink(src(n, s), colour))
    return sym(c)

def back(field, frame, parts, medallion=None, light_border=False):
    """parts: [(crest ink, diameter)]; medallion: radius of a parchment disc cut out of the field behind them."""
    a = field.copy()
    if medallion:
        m = disc_mask(medallion)
        a = a * (1 - m) + m
        ring = disc_mask(medallion + 0.012) * (1 - disc_mask(medallion))
        a *= 1 - ring * 0.85
    if frame is not None:
        a *= frame
    if light_border:
        # a thin parchment line inside the edge of a dark field, as on hanafuda backs
        b = np.zeros((H, W), np.float32); e, t = int(0.045 * W), max(int(0.007 * W), 3)
        b[e:H - e, e:e + t] = b[e:H - e, W - e - t:W - e] = 1; b[e:e + t, e:W - e] = b[H - e - t:H - e, e:W - e] = 1
        b = ni.gaussian_filter(b, 1.2)[..., None]
        a = a * (1 - b) + b * 0.92
    for c, d in parts:
        a = place(a, c, d)
    return a

def save(a, paper, name, discs=False):
    out = post.on_parchment(a, paper)
    if discs:
        [s, v, n, p] = V
        out = F.discs(out, [(.20, .15, s), (.80, .15, v), (.80, .85, n), (.20, .85, p)])
    F.jpg(out, f'{OUT}/{name}.jpg')

if __name__ == '__main__':
    sys.path.insert(0, 'r4'); from parts import PARTS
    pb = glob.glob('gen/parchment_v*/*/*.png')
    paper = plates.parchment(F.CH.get('parchment', {}).get('file') or sorted(pb)[0])
    os.makedirs(OUT, exist_ok=True)
    PARTS(paper, sys.modules[__name__])
    print('backs done')
