#!/usr/bin/env python3
"""Round 3 (#1757): round 2 picks fixed, boardings with the ships big and the bursts behind, the redos of round 2's notes.
Run from the scratchpad. final.py [--lo] [key ...]"""
import asyncio, glob, json, os, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'r2'); sys.path.insert(0, 'r3')
import numpy as np, plates, post
import final as F
from cards import CARDS, EXTRA, V
OUT = F.OUT = 'r3/out'
LO = F.LO
plates.TAL_LOCK.update({'singe_dore': '#B5862F', 'longue_vue': '#B5862F', 'coffre_piege': '#B5862F', 'bijou_maudit': '#8E2436'})
POS = {2: [(0.40, 0.23), (0.74, 0.23)], 3: [(0.30, 0.24), (0.57, 0.20), (0.84, 0.24)]}
# round 2 picks, fixed: (gen dir, name, seed, plate kwargs)
FIXED = {'canonnier': ('r2', 'd_canonnier', 0, {}), 'matelots': ('r2', 'e_matelots', 4186, {}),
         'curse_tempete': ('r2', 'tempete_b', 29868, {}), 'maitre_du_vent': ('r2', 'e_vent', 3775, {})}
from opts3 import OPTS

def src(g, n, s):
    return glob.glob(f'{g}/gen/{n}/s{s}/*.png')[0]

def hi(p):
    if LO: return p
    q = p.replace('/gen/', '/gen_hi/', 1)
    return q if os.path.exists(q) else p

def plate(c, paper):
    k = c['key']
    if c['family'] == 'abordage':
        bs = [(F.raw(f'burst_{x}_v1'), post.SUIT[x], F.CH.get(f'burst_{x}_v1', {}).get('erase')) for x in c['pips']]
        return plates.make_boarding_behind(F.hi(F.raw(F.SCENES[c['mode']])), bs, paper, pos=POS)
    if k in FIXED:
        g, n, s, kw = FIXED[k]
        return plates.make_plate(hi(src(g, n, s)), c['art'], paper, box=plates.ART_BOX, **kw)
    return F.plate(c, paper)

def make_opts(paper, jobs):
    allc = {c['key']: c for c in CARDS + EXTRA}
    for k, os_ in OPTS.items():
        if k.startswith('back'): continue
        c = allc[k]
        for i, (n, s, kw) in enumerate(os_, 1):
            a = plates.make_plate(hi(src('r3', n, s)), c['art'], paper, box=plates.ART_BOX, **kw)
            f = f'{OUT}/options/{k}_{i}.jpg'; F.jpg(a, f)
            jobs.append((c, f, 'D', f'{OUT}/options_cards/{k}_{i}.png'))
            if i == 1:
                F.jpg(a, f'{OUT}/plates/{k}.jpg'); jobs.append((c, f, 'D', f'{OUT}/cards/{k}.png'))

def make_backs(paper):
    [s, v, n, p] = V
    for i, (nm, sd, kw) in enumerate(OPTS['back_events'], 1):
        b = (plates.make_back_court if 'region' in kw else plates.make_back)(hi(src('r3', nm, sd)), paper, **kw)
        F.jpg(F.discs(b, [(.20, .15, s), (.80, .15, v), (.80, .85, n), (.20, .85, p)]), f'{OUT}/backs/back_events_{i}.jpg')
    for i, (nm, sd, kw) in enumerate(OPTS['back_treasures'], 1):
        b = (plates.make_back_court if 'region' in kw else plates.make_back)(hi(src('r3', nm, sd)), paper, colour=True, **kw)
        F.jpg(post.lock_suit(b, ['#B5862F']) if False else F.gold(b), f'{OUT}/backs/back_treasures_{i}.jpg')

def make_map(paper, jobs):
    from cards import CARDS as C
    m = plates.make_map(F.hi(F.src_of('d_map_b', 0)), paper, trim=F.CH['map_v3'].get('trim', .03))
    F.jpg(plates.resize(m, 1760, 2464), f'{OUT}/map/map.jpg')
    for c in [c for c in C if c['family'] == 'coin']:
        f = f"{OUT}/plates/{c['key']}.jpg"
        F.jpg(plates.resize(plates.map_quarter(m, c['crop']), 1760, 2464), f)
        jobs.append((c, f, 'D', f"{OUT}/cards/{c['key']}.png"))

if __name__ == '__main__':
    pb = glob.glob('gen/parchment_v*/*/*.png')
    paper = plates.parchment(F.CH.get('parchment', {}).get('file') or sorted(pb)[0])
    jobs = []
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    for c in CARDS + EXTRA:
        k = c['key']
        if only and not any(o in k for o in only): continue
        if c['family'] == 'coin' or k in OPTS: continue
        if k not in F.PICK and k not in FIXED: continue
        f = f'{OUT}/plates/{k}.jpg'
        F.jpg(plate(c, paper), f)
        jobs.append((c, f, 'D', f'{OUT}/cards/{k}.png'))
    if not only or 'opts' in only:
        make_opts(paper, jobs)
    if not only or 'backs' in only:
        make_backs(paper)
    if not only:
        make_map(paper, jobs)
        a = np.asarray(F.Image.open(f'{OUT}/plates/maitre_du_vent.jpg').convert('RGB'), np.float32) / 255
        os.makedirs(f'{OUT}/backs', exist_ok=True); plates.make_token(a).save(f'{OUT}/backs/master_token.png')
    asyncio.run(F.cards(jobs))
    print('built', len(jobs))
