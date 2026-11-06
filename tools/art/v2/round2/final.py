#!/usr/bin/env python3
"""Round 2 (#1757): plates from Jules's picks + chosen redos, then cards in layout D. Run from the scratchpad.
final.py [--lo] : --lo keeps the un-upscaled sources (fast check)."""
import asyncio, glob, json, os, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'r2')
import numpy as np, plates, post, compose
from PIL import Image
from cards import CARDS, EXTRA, V
CH = json.load(open('choice.json'))
R2 = json.load(open('r2/choice.json')) if os.path.exists('r2/choice.json') else {}
LO = '--lo' in sys.argv
OUT = 'r2/out'
# Jules's notes: the art version per card
PICK = dict(capitaine=1, matelot=1, navigateur=2, maitre_voilier=3, maitre_canonnier=3, officier=3, quartier_maitre=3,
            pillage_sabres=1, pillage_voiles=1, pillage_canons=1, pillage_pistolets=1,
            curse_kraken=2, curse_tourbillon=2,
            talisman_contre_canons=3, talisman_contre_voiles=3, talisman_contre_pistolets=1, talisman_contre_sabres=1)
for c in CARDS:
    if c['family'] == 'abordage': PICK[c['key']] = 1
SCENES = {"1": "boardscene_a_v1", "2": "boardscene_d_v1"}
BURST_D = {2: [(0.43, 0.275), (0.76, 0.295)], 3: [(0.33, 0.295), (0.60, 0.255), (0.84, 0.295)]}
BOX_SHIFT = (0.13, 0.125, 0.97, 0.74)

def hi(p):
    if LO or not p: return p
    q = p.replace('gen/', 'gen_hi/', 1) if p.startswith('gen/') else p.replace('r2/gen/', 'r2/gen_hi/', 1)
    return q if os.path.exists(q) else p

def raw(vid):
    c = CH.get(vid, {})
    return c.get('file') or plates.src('gen', vid, c.get('seed'))

def jpg(a, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).save(p, quality=93, subsampling=0)

def plate(c, paper, src=None):
    k, art = c['key'], c['art']
    box = BOX_SHIFT if k == 'capitaine' else plates.ART_BOX
    if c['family'] == 'abordage':
        bs = [(raw(f'burst_{x}_v1'), post.SUIT[x], CH.get(f'burst_{x}_v1', {}).get('erase')) for x in c['pips']]
        return plates.make_boarding(hi(raw(SCENES[c['mode']])), bs, paper, right_of_index=True, bottom=plates.BOX[1][3], pos=BURST_D)
    vid = f"{art}_v{PICK[k]}" if not src else None
    return plates.make_plate(hi(src or raw(vid)), art, paper, box=box, erase=CH.get(vid, {}).get('erase') if vid else None)

def src_of(n, s):
    return glob.glob(f'r2/gen/{n}/s{s}/*.png')[0]

def make_opts(paper, jobs):
    from opts import OPTS
    allc = {c['key']: c for c in CARDS + EXTRA}
    for k, os_ in OPTS.items():
        c = allc[k]
        for i, (n, s, kw) in enumerate(os_, 1):
            lock = c['art']
            a = plates.make_plate(hi(src_of(n, s)), lock, paper, box=plates.ART_BOX, **kw)
            f = f'{OUT}/options/{k}_{i}.jpg'; jpg(a, f)
            jobs.append((c, f, 'D', f'{OUT}/options_cards/{k}_{i}.png'))
            if i == 1:
                jpg(a, f'{OUT}/plates/{k}.jpg'); jobs.append((c, f, 'D', f'{OUT}/cards/{k}.png'))

def discs(a, spots, size=.17):
    """One value icon per spot, reversed in its colour disc with a thin paper ring, over the finished back."""
    from PIL import ImageDraw
    im = Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).convert('RGBA'); W = im.width
    S = int(W * size)
    for cx, cy, v in spots:
        d = Image.new('RGBA', (S * 2, S * 2), (0, 0, 0, 0)); dr = ImageDraw.Draw(d)
        dr.ellipse((0, 0, S * 2 - 1, S * 2 - 1), fill=(242, 234, 216, 255))
        m = int(S * .07); dr.ellipse((m, m, S * 2 - m, S * 2 - m), fill=compose.SUIT[v])
        al = Image.open(f'out/icons/v1/value_{v}.png').getchannel('A').resize((int(S * 1.42), int(S * 1.42)), Image.LANCZOS)
        o = (S * 2 - al.width) // 2; d.paste(Image.new('RGBA', al.size, (242, 234, 216, 255)), (o, o), al)
        d = d.resize((S, S), Image.LANCZOS); im.alpha_composite(d, (int(cx * W - S / 2), int(cy * im.height - S / 2)))
    return np.asarray(im.convert('RGB'), np.float32) / 255

def make_backs(paper):
    c = CH['back_events_v2']; base = plates.make_back(hi(raw('back_events_v2')), paper, keep=c.get('keep', 'top'), cy=c.get('cy'))
    [s, v, n, p] = V
    for name, sp in (('1', [(.20, .15, s), (.80, .15, v), (.80, .85, n), (.20, .85, p)]),
                     ('2', [(.19, .35, s), (.81, .35, v), (.81, .65, n), (.19, .65, p)]),
                     ('3', [(.5, .12, s), (.84, .5, v), (.5, .88, n), (.16, .5, p)])):
        jpg(discs(base, sp), f'{OUT}/backs/back_events_{name}.jpg')
    jpg(gold(plates.make_plate(hi(src_of('tresor_b', 21864)), 'back', paper, box=(.03, .03, .97, .97))), f'{OUT}/backs/back_treasures_1.jpg')
    # 2: the coins without the source's frame, mirrored; the true medallion back on the centre
    A = Image.open(hi(src_of('tresor_a', 29782))).convert('RGB'); w, h = A.size; i = int(.055 * w)
    os.makedirs('r2/gen/d_tresor', exist_ok=True); A.crop((i, i, w - i, h - i)).resize((w, h), Image.LANCZOS).save('r2/gen/d_tresor/a.png')
    b2 = gold(plates.make_back('r2/gen/d_tresor/a.png', paper, keep='bottom', colour=True, cy=.5))
    jpg(medallion(b2, A, paper, .30), f'{OUT}/backs/back_treasures_2.jpg')
    b3 = gold(plates.make_back(hi(src_of('tresor_c', 21865)), paper, colour=True))
    jpg(medallion(b3, A, paper, .19), f'{OUT}/backs/back_treasures_3.jpg')

def gold(a):
    """Generated gold comes out lemon, and black ink picks up a blue cast from the yellow source paper."""
    h, s, v = post._hsv(a)
    dark = np.clip((.42 - v) / .15, 0, 1)[..., None]
    a = a * (1 - dark) + a.mean(-1, keepdims=True) * dark
    yel = (np.clip((s - .25) / .2, 0, 1) * ((h > .09) & (h < .19)))[..., None]
    return a * (1 - yel) + a * np.array([.97, .80, .62], np.float32) * yel

def medallion(a, A, paper, r):
    """The gold sun of tresor_a, centred on the back. r: its radius as a fraction of the card width."""
    Wd, Hd = a.shape[1], a.shape[0]; w, h = A.size
    R = int(.285 * w); cx, cy = int(.5 * w), int(.555 * h)
    ink = post.ink_layer(np.asarray(A, np.float32) / 255)[cy - R:cy + R, cx - R:cx + R]
    pm = paper.mean((0, 1)); m = gold(ink * pm)
    S = int(2 * r * Wd); m = plates.resize(m, S, S)
    yy, xx = np.mgrid[0:S, 0:S]; d = np.hypot(xx - S / 2, yy - S / 2) / (S / 2)
    al = np.clip((1 - d) / .03, 0, 1)[..., None]
    x0, y0 = (Wd - S) // 2, (Hd - S) // 2; out = a.copy()
    out[y0:y0 + S, x0:x0 + S] = out[y0:y0 + S, x0:x0 + S] * (1 - al) + m * al
    return out

def make_map(paper, jobs):
    from cards import CARDS as C
    for i, n in ((1, 'd_map_a'), (2, 'd_map_b')):
        m = plates.make_map(hi(src_of(n, 0)), paper, trim=CH['map_v3'].get('trim', .03))
        jpg(plates.resize(m, 1760, 2464), f'{OUT}/map/map_{i}.jpg')
        for c in [c for c in C if c['family'] == 'coin']:
            f = f"{OUT}/plates/{c['key']}.jpg" if i == 1 else f"{OUT}/options/{c['key']}_2.jpg"
            jpg(plates.resize(plates.map_quarter(m, c['crop']), 1760, 2464), f)
            if i == 1: jobs.append((c, f, 'D', f"{OUT}/cards/{c['key']}.png"))

def icons_all():
    return {v: {os.path.basename(f)[:-4]: compose.uri(f) for f in glob.glob(f'out/icons/{v}/*.png')} for v in ('v1', 'v2')}

async def cards(jobs):
    """jobs: (card, plate path, layout, png path)"""
    from playwright.async_api import async_playwright
    fp = dict(p=compose.uri(f"{compose.FONTS}/pirata-one.woff2", "font/woff2"), f=compose.uri(f"{compose.FONTS}/im-fell-english.woff2", "font/woff2"),
              fi=compose.uri(f"{compose.FONTS}/im-fell-english-italic.woff2", "font/woff2"))
    ics = icons_all()
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": 880, "height": 1232}, device_scale_factor=2)
        for c, pl, lay, out in jobs:
            css = compose.CSS % dict(fp, ta=compose.fit_title(c, 64), tc=compose.fit_title(c, 72))
            os.makedirs(os.path.dirname(out), exist_ok=True)
            await pg.set_content(compose.html(c, pl, ics, lay, 'disc', css), wait_until='load')
            await pg.wait_for_timeout(40)
            await pg.screenshot(path=out)
        await b.close()

if __name__ == '__main__':
    pb = glob.glob('gen/parchment_v*/*/*.png')
    paper = plates.parchment(CH.get('parchment', {}).get('file') or sorted(pb)[0])
    jobs = []
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    for c in CARDS + EXTRA:
        k = c['key']
        if only and not any(o in k for o in only): continue
        if c['family'] == 'coin': continue
        if k not in PICK: continue
        f = f'{OUT}/plates/{k}.jpg'
        jpg(plate(c, paper), f)
        jobs.append((c, f, 'D', f'{OUT}/cards/{k}.png'))
        if k == 'capitaine':
            jobs.append((c, f, 'E', f'{OUT}/cards/capitaine_bandeau.png'))
    if not only:
        make_opts(paper, jobs); make_backs(paper); make_map(paper, jobs)
        a = np.asarray(Image.open(f'{OUT}/plates/maitre_du_vent.jpg').convert('RGB'), np.float32) / 255
        os.makedirs(f'{OUT}/backs', exist_ok=True); plates.make_token(a).save(f'{OUT}/backs/master_token.png')
    asyncio.run(cards(jobs))
    print('built', len(jobs))
