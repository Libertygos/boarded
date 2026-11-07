#!/usr/bin/env python3
"""Round 3 review page (#1757): redos with options to pick, then the whole deck with a note per card."""
import base64, glob, json, os, shutil, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'r4')
from PIL import Image
from cards import CARDS, EXTRA
from opts4 import OPTS
R = 'review'; shutil.rmtree(R, ignore_errors=True); os.makedirs(R + '/i')
O = 'r4/out'
def th(src, name, w=520):
    im = Image.open(src)
    if im.mode in ('LA', 'RGBA'):
        bg = Image.new('RGB', im.size, '#F2EAD8'); bg.paste(im.convert('RGB'), (0, 0), im.getchannel('A')); im = bg
    im = im.convert('RGB'); im.resize((w, int(im.height * w / im.width)), Image.LANCZOS).save(f'{R}/i/{name}.jpg', quality=84)
    return f'i/{name}.jpg'
T = {c['key']: c['title'] for c in CARDS + EXTRA}
WHY = {
 'talisman_singe_dore': 'Même recette que les Contre-Abordage validés : l’objet seul, lavis d’une couleur et contour noir, grand dans l’ensō. Statue en or complète, socle compris.',
 'talisman_longue_vue': 'Même recette. Trois tubes qui s’affinent, lentille large d’un côté, oculaire de l’autre.',
 'talisman_coffre_piege': 'Même recette, en brun bois : des dents de piège à loup dans l’ouverture du coffre (règle de la bible).',
}
redo = []
for k, os_ in OPTS.items():
    if k.startswith('back'): continue
    vs = [{'v': i, 'card': th(f'{O}/options_cards/{k}_{i}.png', f'{k}_{i}'), 'plate': th(f'{O}/options/{k}_{i}.jpg', f'{k}_{i}_p')} for i in range(1, len(os_) + 1)]
    redo.append({'id': k, 'title': T[k], 'sub': WHY[k], 'vs': vs})
redo += [
 {'id': 'back_events', 'title': 'Dos Événements', 'sub': 'Repris de zéro selon la bible : panneau ornemental symétrique, sans scène. Tes quatre symboles en coins. Emblème d’équipage au centre : la barre (1, 2) ou les grappins d’abordage (3). Fond clair à vagues seigaiha (1, 3) ou fond d’encre noire (2).',
  'vs': [{'v': i, 'card': th(f'{O}/backs/back_events_{i}.jpg', f'be_{i}')} for i in (1, 2, 3)]},
 {'id': 'back_treasures', 'title': 'Dos Trésors', 'sub': 'De l’or qui ressort, dans le style du jeu : un doublon (pièce de huit) dans une couronne de pièces, seul or de la carte. 1 et 3 sur fond noir, où l’or ressort le plus ; 2 sur fond clair. Conseil : un paquet clair et un paquet sombre se distinguent d’un coup d’œil (Événements 1 avec Trésors 1).',
  'vs': [{'v': i, 'card': th(f'{O}/backs/back_treasures_{i}.jpg', f'bt_{i}')} for i in (1, 2, 3)]},
]
oth = [
 {'id': 'talismans_set', 'title': 'Les talismans ensemble', 'sub': 'Option 1 de chaque talisman à côté de ton Bijou Maudit et des Contre-Abordage validés.',
  'vs': [{'v': i, 'card': th(f'{O}/cards/{k}.png', f'ts_{i}')} for i, k in enumerate(('talisman_singe_dore', 'talisman_longue_vue', 'talisman_coffre_piege', 'talisman_bijou_maudit', 'talisman_contre_canons', 'talisman_contre_sabres'), 1)]},
]
GR = {'recrue': 'Recrues', 'pillage': 'Pillages', 'abordage': 'Abordages', 'coin': 'Coins', 'malediction': 'Malédictions', 'talisman': 'Talismans', 'role': 'Rôle'}
deck = []
for f, t in GR.items():
    its = [{'id': 'deck_' + c['key'], 'title': c['title'], 'card': th(f"{O}/cards/{c['key']}.png", 'd_' + c['key'], 420), 'plate': th(f"{O}/plates/{c['key']}.jpg", 'd_' + c['key'] + '_p', 420), 'redo': c['key'] in OPTS}
           for c in CARDS + EXTRA if c['family'] == f]
    deck.append({'id': f, 'title': t, 'items': its})
page = open('r4/tpl.html').read().replace('/*DATA*/null', json.dumps({'redo': redo, 'oth': oth, 'deck': deck}, ensure_ascii=False))
open(R + '/index.html', 'w').write(page)
b = {'cards': {}, 'plates': {}}
for f in glob.glob(R + '/i/*.jpg'):
    n = os.path.basename(f)[:-4]
    b['plates' if n.endswith('_p') else 'cards']['i/' + n + '.jpg'] = 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
for g, d in b.items():
    json.dump(d, open(f'{R}/{g}.json', 'w')); print(g, len(d), os.path.getsize(f'{R}/{g}.json') // 1024 // 1024, 'MB')
shutil.rmtree(R + '/i')
