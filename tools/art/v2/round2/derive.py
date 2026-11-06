#!/usr/bin/env python3
"""Derived sources (#1757 round 2): one cannon out of Maitre Canonnier v3; the new serpent patched into the raw map."""
import glob, json, os, sys
sys.path.insert(0, '.')
import numpy as np, plates, post
from PIL import Image
from scipy import ndimage as ni
CH = json.load(open('choice.json'))
def raw(vid):
    c = CH.get(vid, {}); return c.get('file') or plates.src('gen', vid, c.get('seed'))
# canonnier: everything red in the left half goes, with its black outlines; the man stays
a = post.load(raw('recruit_maitre_canonnier_v3')); h, w = a.shape[:2]
red = (a[..., 0] - a[..., 1]) > 0.28
red[:, int(.5 * w):] = False
lab, n = ni.label(ni.binary_dilation(red, iterations=9))
m = ni.binary_closing(ni.binary_dilation(red, iterations=11), iterations=12)
m = ni.gaussian_filter(m.astype(np.float32), 2)[..., None]
pap = post.paper_estimate(a)
out = a * (1 - m) + pap * m
# leftovers of the cannon: dark pieces in the left half not attached to the man and not the ground strokes
dark = out.mean(-1) < 0.55
lab, n = ni.label(dark)
keep_y = int(.83 * h)
for i, sl in enumerate(ni.find_objects(lab), 1):
    if sl[1].stop < .30 * w and sl[0].stop < keep_y:
        z = ni.binary_dilation(lab[sl] == i, iterations=8)[..., None] * 1.0
        out[sl] = out[sl] * (1 - z) + pap[sl] * z
# what stays above the ground strokes and left of the man, near the floor: the feet of the carriage
xs = int(.28 * w)
yy0, yy1 = int(.62 * h), int(.835 * h)
out[yy0:yy1, :xs] = pap[yy0:yy1, :xs]
# wisps below the left hand, off the man's body
d2 = out.mean(-1) < 0.82
lab, n = ni.label(d2); sz = ni.sum(d2, lab, range(1, n + 1)); man = int(np.argmax(sz)) + 1
ys = np.where((lab == man).any(1))[0]; ytop, yh = ys[0], ys[-1] - ys[0]
for i, sl in enumerate(ni.find_objects(lab), 1):
    cx = (sl[1].start + sl[1].stop) / 2
    if i != man and cx < .5 * w and sl[0].start > ytop + .32 * yh and sl[0].stop < .835 * h:
        z = ni.binary_dilation(lab[sl] == i, iterations=6)[..., None] * 1.0
        out[sl] = out[sl] * (1 - z) + pap[sl] * z
os.makedirs('r2/gen/d_canonnier/s0', exist_ok=True); post.save(out, 'r2/gen/d_canonnier/s0/d.png')
# map
box = json.load(open('r2/ref/dragon_box.json'))
M = post.load(raw('map_v3'))
for name, f in (('a', glob.glob('r2/gen/e_dragon/s3982/*.png')[0]), ('b', glob.glob('r2/gen/e_dragon/s3965/*.png')[0])):
    bw, bh = box[2] - box[0], box[3] - box[1]
    pt = np.asarray(Image.open(f).convert('RGB').resize((bw, bh), Image.LANCZOS), np.float32) / 255
    ramp = np.ones((bh, bw), np.float32)
    F = 34
    ramp[:F, :] *= (np.linspace(0, 1, F)[:, None]); ramp[:, :F] *= np.linspace(0, 1, F)[None, :]
    mm = M.copy(); mm[box[1]:box[3], box[0]:box[2]] = M[box[1]:box[3], box[0]:box[2]] * (1 - ramp[..., None]) + pt * ramp[..., None]
    os.makedirs(f'r2/gen/d_map_{name}/s0', exist_ok=True); post.save(mm, f'r2/gen/d_map_{name}/s0/d.png')
