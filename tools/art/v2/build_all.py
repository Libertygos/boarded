#!/usr/bin/env python3
"""Art v2 (#1757): every plate, icon, back and token from gen/ + choice.json. build_all.py [--plates-only key-substring]"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, post, plates
from PIL import Image
from cards import CARDS, EXTRA, V
SCENES = {"1": ["boardscene_a_v1", "boardscene_b_v2", "boardscene_c_v3"], "2": ["boardscene_d_v1", "boardscene_e_v2", "boardscene_a_v1"]}
EMBL = {1: [(0.18, 0.16, "sabres"), (0.82, 0.16, "voiles"), (0.14, 0.42, "canons"), (0.86, 0.42, "pistolets")]}
CH = json.load(open("choice.json")) if os.path.exists("choice.json") else {}
ROOT = "gen_hi" if os.path.isdir("gen_hi") else "gen"
only = sys.argv[1] if len(sys.argv) > 1 else ""

def S(vid):
    c = CH.get(vid, {})
    if c.get("file"):
        return c["file"]
    for root in (ROOT, "gen"):
        p = plates.src(root, vid, c.get("seed"))
        if p: return p
    return None

def jpg(a, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).save(p, quality=92, subsampling=0)

pb = glob.glob("gen/parchment_v*/*/*.png")
paper = plates.parchment(CH.get("parchment", {}).get("file") or sorted(pb)[0])
jpg(paper, "out/master_parchment.jpg")

# icons
for ver in (1, 2):
    d = f"out/icons/v{ver}"; os.makedirs(d, exist_ok=True)
    for f in glob.glob(f"gen/icon_*_v{ver}"):
        name = os.path.basename(f)[5:-3]
        p = S(f"icon_{name}_v{ver}")
        if not p: continue
        al = post.icon_alpha(post.load(p), bold=post.BOLD.get(name, 0))
        if al: Image.merge("LA", (al, al)).save(f"{d}/{name}.png")

for v in (1, 2, 3):
    # map first: four quarters share one master
    m = None
    if not only or "coin" in only:
        p = S(f"map_v{v}")
        if p:
            c = CH.get(f"map_v{v}", {})
            kw = {k: [tuple(x) for x in c[k]] if k == "route" else tuple(c[k]) for k in ("route", "xat") if k in c}
            m = plates.make_map(p, paper, trim=c.get("trim", 0.03), **kw)
            jpg(plates.resize(m, 1760, 2464), f"out/map/map_v{v}.jpg")
    for c in CARDS + EXTRA:
        if only and only not in c["key"]: continue
        out = f"out/plates/{c['key']}_v{v}.jpg"
        fam = c["family"]
        try:
            if fam == "coin":
                if m is None: continue
                a = plates.resize(plates.map_quarter(m, c["crop"]), 1760, 2464)
            elif fam == "abordage":
                sc = S(SCENES[c["mode"]][v - 1])
                if not sc: continue
                bv = 2 if v == 2 else 1
                bs = [(S(f"burst_{x}_v{bv}"), post.SUIT[x], CH.get(f"burst_{x}_v{bv}", {}).get("erase")) for x in c["pips"]]
                if not all(b[0] for b in bs): continue
                a = plates.make_boarding(sc, bs, paper, right_of_index=(v == 2), bottom=plates.BOX[v][3])
            else:
                vid = f"{c['art']}_v{v}"
                p = S(vid)
                if not p: continue
                a = plates.make_plate(p, c["art"], paper, box=plates.BOX[v], erase=CH.get(vid, {}).get("erase"))
            jpg(a, out)
        except Exception as e:
            print("ERR", c["key"], v, e)
    if only: continue
    # backs
    al = {x: Image.open(f"out/icons/v1/value_{x}.png").getchannel("A") for x in V if os.path.exists(f"out/icons/v1/value_{x}.png")}
    for kind in ("back_events", "back_treasures"):
        p = S(f"{kind}_v{v}")
        if not p: continue
        keep = CH.get(f"{kind}_v{v}", {}).get("keep", "top"); cy = CH.get(f"{kind}_v{v}", {}).get("cy")
        em = EMBL[1] if kind == "back_events" and len(al) == 4 else None
        jpg(plates.make_back(p, paper, keep=keep, emblems=em, emblem_alpha=al, cy=cy), f"out/backs/{kind}_v{v}.jpg")
    # the role: a card and a round token cut from it
    f = f"out/plates/maitre_du_vent_v{v}.jpg"
    if os.path.exists(f):
        plates.make_token(np.asarray(Image.open(f).convert("RGB"), np.float32) / 255).save(f"out/backs/master_token_v{v}.png")
print("built")
