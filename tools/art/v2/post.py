#!/usr/bin/env python3
"""Art v2 post-processing (#1757): flat-field the ink off its generated paper, lay it on one master
parchment, lock suit colours to their hue, composite boarding bursts, cut icons, symmetrise backs."""
import numpy as np
from PIL import Image, ImageFilter

SUIT = {"sabres": "#3E7C59", "voiles": "#2E5A88", "canons": "#C0432F", "pistolets": "#6E4A7E"}


def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0


def save(a, p):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(p)


def paper_estimate(img):
    """The generated paper under the ink: a closing that ignores ink, then a wide blur."""
    im = Image.fromarray((img * 255).astype(np.uint8))
    small = im.resize((im.width // 8, im.height // 8), Image.BILINEAR)
    closed = small.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(14))
    return np.asarray(closed.resize(im.size, Image.BICUBIC), dtype=np.float32) / 255.0


def ink_layer(img):
    """Per-channel transmission of the ink: 1 = bare paper, 0 = solid ink."""
    return np.clip(img / np.maximum(paper_estimate(img), 0.05), 0, 1)


def on_parchment(ink, parchment):
    h, w = ink.shape[:2]
    p = np.asarray(Image.fromarray((parchment * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS),
                   dtype=np.float32) / 255.0
    return ink * p


def _hsv(a):
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-5
    i = m & (mx == r); h[i] = ((g - b)[i] / d[i]) % 6
    i = m & (mx == g) & (mx != r); h[i] = (b - r)[i] / d[i] + 2
    i = m & (mx == b) & (mx != r) & (mx != g); h[i] = (r - g)[i] / d[i] + 4
    return h / 6.0, np.where(mx > 1e-5, d / np.maximum(mx, 1e-5), 0), mx


def _rgb(h, s, v):
    i = np.floor(h * 6.0)
    f = h * 6.0 - i
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    i = i.astype(int) % 6
    return np.stack([np.choose(i, [v, q, p, p, t, v]),
                     np.choose(i, [t, v, v, q, p, p]),
                     np.choose(i, [p, p, t, v, v, q])], -1)


def hex_rgb(hx):
    return np.array([int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)


def lock_suit(ink, hexes, min_sat=0.22, window=0.13):
    """Coloured ink near an allowed suit hue takes that hue and the bible's own depth; anything else
    (a gold hilt, a brown cork) falls back to black ink. Lightness variation of the wash is kept."""
    h, s, v = _hsv(ink)
    t = [_hsv(hex_rgb(x)[None, None, :]) for x in hexes]
    th = np.array([x[0].item() for x in t]); ts = np.array([x[1].item() for x in t]); tv = np.array([x[2].item() for x in t])
    dist = np.abs(h[..., None] - th); dist = np.minimum(dist, 1 - dist)
    k = dist.argmin(-1); near = dist.min(-1) < window
    w = np.clip((s - min_sat) / 0.15, 0, 1)
    # wash: light ink stays light. s is the ink strength, so mix from paper to full suit colour by it
    strength = np.clip(s / 0.5, 0.5, 1.0)
    col = _rgb(th[k].astype(np.float32), ts[k].astype(np.float32), tv[k].astype(np.float32))
    washed = 1 - (1 - col) * strength[..., None]
    dark = np.clip(v / max(float(tv.max()), 1e-3) , 0, 1)[..., None]  # shadows painted in black stay dark
    washed = washed * np.minimum(dark * 1.0 + 0.0, 1.0)
    lum = ink.mean(-1)
    grey = np.repeat((lum if False else v * (1 - s))[..., None], 3, -1)
    plain = np.repeat(lum[..., None], 3, -1)
    out = plain.copy()
    m = (w * near)[..., None]
    out = plain * (1 - m) + washed * m
    # stray colour: render as dark ink by its luminance
    stray = (w * (~near))[..., None]
    out = out * (1 - stray) + np.repeat(np.clip(lum * 0.55, 0, 1)[..., None], 3, -1) * stray
    return out


def strip_colour(ink):
    """Scene plates: guarantee no colour at all."""
    return np.repeat(ink.mean(-1, keepdims=True), 3, -1)


def stamp(base_ink, burst_ink, cx, cy, scale):
    """Multiply a burst (ink layer) onto a scene ink layer. Fades its edge so no square shows."""
    H, W = base_ink.shape[:2]
    size = int(W * scale)
    b = np.asarray(Image.fromarray((burst_ink * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS),
                   dtype=np.float32) / 255.0
    yy, xx = np.mgrid[0:size, 0:size]
    r = np.hypot(xx - size / 2, yy - size / 2) / (size / 2)
    fade = np.clip((0.84 - r) / 0.10, 0, 1)[..., None]
    b = 1 - (1 - b) * fade
    x0, y0 = int(cx * W - size / 2), int(cy * H - size / 2)
    xa, ya, xb, yb = max(x0, 0), max(y0, 0), min(x0 + size, W), min(y0 + size, H)
    out = base_ink.copy()
    out[ya:yb, xa:xb] *= b[ya - y0:yb - y0, xa - x0:xb - x0]
    return out


def rot180_sym(ink, feather=0.04):
    """Top half + the same half turned 180 degrees: a back that cannot mark a card."""
    H = ink.shape[0]
    rot = ink[::-1, ::-1]
    t = np.clip((np.arange(H) / H - (0.5 - feather)) / (2 * feather), 0, 1)[:, None, None]
    return ink * (1 - t) + rot * t


BOLD = {"value_sabres": 7, "value_pistolets": 4, "value_canons": 3, "role_maitre": 3, "family_abordage": 3}  # thin drawings thickened to hold at 14 px


def icon_alpha(img, size=512, blur=1.5, cut=0.5, rough=0.16, bold=0):
    """Solid icon mask from a stencil drawing: the parts clear of the image edge, tight crop, a slightly
    irregular brushed edge so it sits with the ink plates instead of looking like a vector font."""
    from scipy import ndimage as ni
    ink = 1 - ink_layer(img).mean(-1)
    g = ni.gaussian_filter(ink, blur)
    r = np.random.RandomState(11)
    n = ni.gaussian_filter(r.rand(*g.shape), 4.0); n = (n - n.mean()) / (n.std() + 1e-6)
    m = g + rough * 0.5 * n > cut
    H, W = m.shape
    lab, k = ni.label(m)
    if k:
        sl = ni.find_objects(lab); sz = ni.sum(m, lab, range(1, k + 1))
        edge = [s[0].start <= 1 or s[1].start <= 1 or s[0].stop >= H - 1 or s[1].stop >= W - 1 for s in sl]
        big = max([sz[i] for i in range(k) if not edge[i]] or [0])
        m = np.isin(lab, [i + 1 for i in range(k) if not edge[i] and sz[i] > 0.004 * big])
    if bold:
        m = ni.binary_dilation(m, iterations=bold)
    ys, xs = np.where(m)
    if len(ys) == 0:
        return None
    sm = ni.gaussian_filter(m.astype(np.float32), 1.0)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = sm.shape
    pad = int(max(h, w) * 0.04); side = max(h, w) + 2 * pad
    out = np.zeros((side, side), np.float32)
    out[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = sm
    return Image.fromarray((np.clip((out - 0.5) * 6 + 0.5, 0, 1) * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)


def tint_icon(alpha, hx, tex=None):
    """RGBA icon in a flat colour from its mask."""
    a = np.asarray(alpha, np.uint8)
    c = (hex_rgb(hx) * 255).astype(np.uint8)
    rgba = np.zeros(a.shape + (4,), np.uint8)
    rgba[..., :3] = c; rgba[..., 3] = a
    return Image.fromarray(rgba, "RGBA")
