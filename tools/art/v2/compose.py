#!/usr/bin/env python3
"""Art v2 (#1757): combined cards = a plate + an icon set + a layout, rendered by Chromium at 880x1232.
Layouts: A title band on top (close to the game today); B fan-friendly index down the left edge, title on a
black brush band; C thin ink frame with a text panel. compose.py <plates_dir> <icons_dir> <out_dir> [A B C]"""
import base64, json, os, sys, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cards import CARDS, EXTRA, LBL
FONTS = os.path.expanduser("~/git-projects/boarded/client/public/fonts")
SUIT = {"sabres": "#3E7C59", "voiles": "#2E5A88", "canons": "#C0432F", "pistolets": "#6E4A7E"}
FAMILY_ICON = {"recrue": "family_recrue", "pillage": "family_pillage", "abordage": "family_abordage",
               "malediction": "family_malediction", "talisman": "family_talisman", "coin": "family_coin", "role": "role_maitre"}
TRIG = {"abordage": "family_abordage", "revelation": "trig_revelation", "defense": "trig_defense", "pillage": "family_pillage", "vol": "act_voler"}
QUAD = {"hg": (0, 0), "hd": (1, 0), "bg": (0, 1), "bd": (1, 1)}


def uri(p, mime="image/png"):
    return f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()


def mask_icon(icons, name, color, size, cls=""):
    """An icon is a mask, so one drawing serves any colour."""
    u = icons.get(name)
    if not u:
        return ""
    return (f'<i class="ic {cls}" style="width:{size}px;height:{size}px;background:{color};'
            f'-webkit-mask:url({u}) center/contain no-repeat;mask:url({u}) center/contain no-repeat"></i>')


def disc_icon(icons, name, color, size):
    u = icons.get(name)
    return (f'<span class="disc" style="width:{size}px;height:{size}px;background:{color}">'
            f'<i class="ic" style="width:{size*.72:.0f}px;height:{size*.72:.0f}px;background:#F2EAD8;'
            f'-webkit-mask:url({u}) center/contain no-repeat;mask:url({u}) center/contain no-repeat"></i></span>') if u else ""


def pips(c, icons, size, style):
    f = disc_icon if style == "disc" else None
    out = ""
    for v in c["pips"]:
        n = f"value_{v}"
        out += f(icons, n, SUIT[v], size) if f else mask_icon(icons, n, SUIT[v], size)
    return out


def bonus(c, icons, size, style):
    if not c.get("bonus"):
        return ""
    v = c["bonus"]
    return (f'<span class="bonus">{disc_icon(icons, "value_" + v, SUIT[v], size)}'
            f'<b class="seuil" style="color:{SUIT[v]}">{c.get("threshold", "4+")}</b></span>')


def mode(c, icons, size):
    if "mode" not in c:
        return ""
    n = int(c["mode"])
    ship = lambda flip: f'<span style="transform:scaleX({-1 if flip else 1});display:inline-flex">{mask_icon(icons, "ship", "#1A1714", size)}</span>'
    return f'<span class="mode">{ship(False) * n}<em>c.</em>{ship(True) * n}</span>'


def effect(c, icons, size):
    t = c["effect"]
    if c["family"] == "recrue" and len(t) < 14:
        t = f'<span class="big">{t}</span>'
    trig = ""
    if c.get("trigger"):
        trig = mask_icon(icons, TRIG[c["trigger"]], "#1A1714", size, "trig")
    bon = ""
    if c.get("bonus_text"):
        col = SUIT[c["bonus"]]
        bon = f'<div class="eb">{mask_icon(icons, "value_" + c["bonus"], col, int(size * .82))}<b style="color:{col}">{c.get("threshold","4+")}</b> <span>{c["bonus_text"]}</span></div>'
    return f'<div class="et">{trig}{t}</div>{bon}'


CSS = """
@font-face{font-family:Pirata;src:url(%(p)s)}
@font-face{font-family:Fell;src:url(%(f)s)}
@font-face{font-family:Fell;font-style:italic;src:url(%(fi)s)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:880px;height:1232px;overflow:hidden}
.card{position:relative;width:880px;height:1232px;overflow:hidden;background:#F2EAD8}
.card>img.bg{position:absolute;inset:0;width:100%%;height:100%%}
.ic{display:inline-block;flex:none}
.disc{display:inline-flex;align-items:center;justify-content:center;border-radius:50%%;flex:none}
.bonus{display:inline-flex;align-items:center;gap:8px}
.seuil{font-family:Pirata;font-size:50px;line-height:1}
.mode{display:inline-flex;align-items:center;gap:2px}
.mode em{font:italic 34px Fell;margin:0 8px;color:#1A1714}
.et{display:flow-root}.et .trig{float:left;margin:2px 14px 0 0}
.eb{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;font-weight:700}
.eb b{font-family:Pirata;font-weight:400;font-size:42px}
/* A */
.A .top{position:absolute;left:44px;right:44px;top:40px;height:110px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;column-gap:10px}
.A .l{display:flex;gap:4px;flex-wrap:wrap}
.A .r{display:flex;justify-content:flex-end;align-items:center}
.A .t{font:400 %(ta)spx/1 Pirata;color:#7e2a1c;text-align:center;white-space:nowrap}
.A .mm{position:absolute;top:150px;left:0;right:0;display:flex;justify-content:center}
.A .tx{position:absolute;left:60px;right:60px;bottom:44px;height:254px;display:flex;flex-direction:column;justify-content:center;font:italic 43px/1.18 Fell;color:#2c2013;text-align:center}
/* B */
.B .idx{position:absolute;left:30px;top:32px;width:118px;display:flex;flex-direction:column;align-items:center;gap:12px}
.B .fam{opacity:.92}
.B .pp{display:flex;flex-direction:column;gap:8px;align-items:center}
.B .r{position:absolute;right:34px;top:36px}
.B .mm{position:absolute;right:38px;top:138px}
.B .band{position:absolute;left:0;right:0;top:886px;height:92px;background:#1A1714;display:flex;align-items:center;justify-content:center;
 -webkit-mask:linear-gradient(90deg,transparent,#000 3%%,#000 97%%,transparent)}
.B .t{font:400 64px/1 Pirata;color:#F2EAD8}
.B .tx{position:absolute;left:60px;right:60px;top:978px;bottom:36px;display:flex;flex-direction:column;justify-content:center;font:italic 41px/1.16 Fell;color:#2c2013;text-align:center}
/* C */
.C .fr{position:absolute;inset:26px;border:5px solid #1A1714;outline:2px solid #1A1714;outline-offset:-14px;border-radius:4px;filter:url(#rough)}
.C .t{position:absolute;left:60px;right:60px;top:52px;height:92px;font:400 %(tc)spx/1 Pirata;color:#1A1714;display:flex;align-items:center;justify-content:center;text-align:center;white-space:nowrap}
.C .pan{position:absolute;left:44px;right:44px;bottom:44px;height:282px;background:rgba(242,234,216,.93);border-top:4px double #1A1714;
 display:flex;flex-direction:column;justify-content:center;padding:44px 34px 12px;font:41px/1.14 Fell;color:#2c2013;text-align:center}
.C .rib{position:absolute;left:0;right:0;bottom:292px;display:flex;justify-content:center;align-items:center;gap:8px}
.C .rib>div{display:flex;gap:6px;align-items:center;background:#F2EAD8;padding:0 14px;border-radius:50px}
/* D, E: round 2 */
.D .idx,.E .idx{position:absolute;left:30px;top:32px;width:96px;display:flex;flex-direction:column;align-items:center;gap:10px}
.D .pp,.E .pp{display:flex;flex-direction:column;gap:8px;align-items:center}
.D .r,.E .r{position:absolute;right:30px;top:34px}
.D .mm,.E .mm{position:absolute;right:30px;top:126px}
.D .t{position:absolute;left:140px;right:176px;top:40px;height:96px;font:400 %(ta)spx/1 Pirata;color:#1A1714;display:flex;align-items:center;justify-content:center;text-align:center;white-space:nowrap}
.D .tx{position:absolute;left:60px;right:60px;bottom:44px;height:254px;display:flex;flex-direction:column;justify-content:center;font:italic 43px/1.18 Fell;color:#2c2013;text-align:center}
.E .band{position:absolute;left:0;right:0;top:886px;height:92px;background:#1A1714;display:flex;align-items:center;justify-content:center;-webkit-mask:linear-gradient(90deg,transparent,#000 3%%,#000 97%%,transparent)}
.E .t{font:400 64px/1 Pirata;color:#F2EAD8}
.E .tx{position:absolute;left:60px;right:60px;top:978px;bottom:36px;display:flex;flex-direction:column;justify-content:center;font:italic 41px/1.16 Fell;color:#2c2013;text-align:center}
.disc.trig{float:left;margin:2px 14px 0 0}
.big{font-size:64px!important;font-style:normal;font-weight:700}
.cob{position:absolute;left:0;right:0;top:0;padding:30px 40px 26px;background:linear-gradient(rgba(242,234,216,.97) 80%%,rgba(242,234,216,0));text-align:center;color:#1A1714}
.cob .t2{font:400 62px/1 Pirata;color:#7e2a1c}
.cob.n{background:#1A1714;padding:24px 40px 22px}.cob.n .t2{color:#F2EAD8}.cob.n .e2{color:#F2EAD8}
.cob .e2{font:italic 33px/1.1 Fell;margin-top:6px;color:#2c2013}
"""
SVGF = '<svg width="0" height="0" style="position:absolute"><filter id="rough"><feTurbulence baseFrequency=".04" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter></svg>'


def html(c, plate, icons, lay, istyle, css):
    bg = f'<img class="bg" src="{uri(plate, "image/jpeg")}">'
    if lay in ("D", "E"):
        return html_d(c, bg, icons, lay, css)
    if c["family"] == "coin":
        # the quarter of the compass and the landmark identify the card: all text sits in one band on the outer edge
        cls = "cob n" if lay == "B" else "cob"
        fr = '<div class="fr"></div>' if lay == "C" else ""
        return (f'<!doctype html><meta charset=utf-8><style>{css}</style>{SVGF}<div class="card {lay}">{bg}{fr}'
                f'<div class="{cls}"><div class="t2">{c["title"]}</div><div class="e2">{c["effect"]}</div></div></div>')
    style = "disc" if istyle == "disc" else "mask"
    if lay == "A":
        fam = mask_icon(icons, FAMILY_ICON[c["family"]], "#1A1714", 62) if not c["pips"] else ""
        body = (f'<div class="top"><div class="l">{fam}{pips(c, icons, 66 if len(c["pips"]) > 2 else 76, style)}</div><div class="t">{c["title"]}</div>'
                f'<div class="r">{bonus(c, icons, 84, style)}</div></div><div class="mm">{mode(c, icons, 54)}</div>'
                f'<div class="tx">{effect(c, icons, 54)}</div>')
    elif lay == "B":
        body = (f'<div class="idx">{mask_icon(icons, FAMILY_ICON[c["family"]], "#1A1714", 72, "fam")}<div class="pp">{pips(c, icons, 78, style)}</div></div>'
                f'<div class="r">{bonus(c, icons, 88, style)}</div><div class="mm">{mode(c, icons, 54)}</div>'
                f'<div class="band"><div class="t">{c["title"]}</div></div><div class="tx">{effect(c, icons, 50)}</div>')
    else:
        body = (f'<div class="fr"></div><div class="t">{c["title"]}</div><div class="pan">{effect(c, icons, 50)}</div>'
                f'<div class="rib"><div>{pips(c, icons, 72, style)}{mode(c, icons, 46)}{bonus(c, icons, 72, style)}</div></div>')
    return f'<!doctype html><meta charset=utf-8><style>{css}</style>{SVGF}<div class="card {lay}">{bg}{body}</div>'


# Round 2, from Jules's note on Capitaine: discs (his icon picks), index down the left edge as in B, no family
# icon on recruits (the values say it), title in black. D = black title on top; E = the title on B's black band.
PICK = {"act_defausser": 2, "act_regarder": 2, "family_abordage": 2, "family_coin": 2, "trig_defense": 2}  # all the others: 3

def ic(icons, name, size, colour="#1A1714"):
    """One icon as Jules picked it: drawing 2 as a plain mask, or drawing 1 reversed in a disc."""
    if PICK.get(name) == 2:
        return mask_icon(icons["v2"], name, colour, size)
    return disc_icon(icons["v1"], name, colour, size)

def html_d(c, bg, icons, lay, css):
    fam = "" if c["family"] == "recrue" else ic(icons, FAMILY_ICON[c["family"]], 72)
    pp = "".join(ic(icons, "value_" + v, 78, SUIT[v]) for v in c["pips"])
    bon = ""
    if c.get("bonus"):
        bon = (f'<span class="bonus">{ic(icons, "value_" + c["bonus"], 84, SUIT[c["bonus"]])}'
               f'<b class="seuil" style="color:{SUIT[c["bonus"]]}">{c.get("threshold", "4+")}</b></span>')
    mm = ""
    if "mode" in c:
        n = int(c["mode"])
        sh = lambda flip: f'<span style="transform:scaleX({-1 if flip else 1});display:inline-flex">{ic(icons, "ship", 50)}</span>'
        mm = f'<span class="mode">{sh(False) * n}<em>c.</em>{sh(True) * n}</span>'
    t = c["effect"]
    if c["family"] == "recrue" and len(t) < 14:
        t = f'<span class="big">{t}</span>'
    trig = ic(icons, TRIG[c["trigger"]], 54).replace('class="ic ', 'class="ic trig ').replace('class="disc"', 'class="disc trig"') if c.get("trigger") else ""
    eb = ""
    if c.get("bonus_text"):
        col = SUIT[c["bonus"]]
        eb = f'<div class="eb">{ic(icons, "value_" + c["bonus"], 44, col)}<b style="color:{col}">{c.get("threshold","4+")}</b> <span>{c["bonus_text"]}</span></div>'
    body = f'<div class="et">{trig}{t}</div>{eb}'
    if c["family"] == "coin":
        return (f'<!doctype html><meta charset=utf-8><style>{css}</style><div class="card D">{bg}'
                f'<div class="cob"><div class="t2" style="color:#1A1714">{c["title"]}</div><div class="e2">{c["effect"]}</div></div></div>')
    title = f'<div class="t">{c["title"]}</div>' if lay == "D" else f'<div class="band"><div class="t">{c["title"]}</div></div>'
    return (f'<!doctype html><meta charset=utf-8><style>{css}</style><div class="card {lay}">{bg}'
            f'<div class="idx">{fam}<div class="pp">{pp}</div></div><div class="r">{bon}</div><div class="mm">{mm}</div>'
            f'{title}<div class="tx">{body}</div></div>')


def fit_title(c, base):
    n = len(c["title"])
    return base if n <= 12 else int(base * (12 / n) ** 0.72)


async def run(plates, iconsets, out, layouts):
    from playwright.async_api import async_playwright
    fp = dict(p=uri(f"{FONTS}/pirata-one.woff2", "font/woff2"), f=uri(f"{FONTS}/im-fell-english.woff2", "font/woff2"),
              fi=uri(f"{FONTS}/im-fell-english-italic.woff2", "font/woff2"))
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": 880, "height": 1232})
        os.makedirs(out, exist_ok=True)
        for lay, ver, istyle in layouts:
            d = f"{iconsets}/{'v1' if istyle == 'disc' else istyle}"
            icons = {f[:-4]: uri(f"{d}/{f}") for f in os.listdir(d) if f.endswith(".png")}
            for c in CARDS + EXTRA:
                plate = f"{plates}/{c['key']}_v{ver}.jpg"
                if not os.path.exists(plate):
                    print("no plate", plate); continue
                css = CSS % dict(fp, ta=fit_title(c, 66), tc=fit_title(c, 72))
                await pg.set_content(html(c, plate, icons, lay, istyle, css), wait_until="load")
                await pg.wait_for_timeout(40)
                await pg.screenshot(path=f"{out}/{c['key']}_{lay}{ver}.png")
        await b.close()


if __name__ == "__main__":
    plates, iconsets, out = sys.argv[1:4]
    # version 1 = art v1, icons drawing 1, layout A; 2 = art v2, drawing 2, layout B; 3 = art v3, reversed discs, layout C
    asyncio.run(run(plates, iconsets, out, [("A", 1, "v1"), ("B", 2, "v2"), ("C", 3, "disc")]))
