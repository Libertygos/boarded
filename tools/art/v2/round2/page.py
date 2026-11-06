#!/usr/bin/env python3
"""Round 2 review page (#1757): redos with options to pick, then the whole deck with a note per card."""
import base64, glob, json, os, shutil, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'r2')
from PIL import Image
from cards import CARDS, EXTRA
from opts import OPTS
R = 'review'; shutil.rmtree(R, ignore_errors=True); os.makedirs(R + '/i')
O = 'r2/out'
def th(src, name, w=520):
    im = Image.open(src)
    if im.mode in ('LA', 'RGBA'):
        bg = Image.new('RGB', im.size, '#F2EAD8'); bg.paste(im.convert('RGB'), (0, 0), im.getchannel('A')); im = bg
    im = im.convert('RGB'); im.resize((w, int(im.height * w / im.width)), Image.LANCZOS).save(f'{R}/i/{name}.jpg', quality=84)
    return f'i/{name}.jpg'
T = {c['key']: c['title'] for c in CARDS + EXTRA}
WHY = {'canonnier': 'Repart de Maître Canonnier v3. 1 : ton image, un canon retiré. 2 et 3 : redessinés.',
 'matelots': 'L’illustration de Matelot v3 avec deux matelots. Les trois varient surtout par les sabres.',
 'curse_bateau_fantome': 'Coque estompée, transparente, lueur violette.',
 'curse_ile_brumeuse': 'Navire au premier plan, entouré de brouillard, beaucoup plus de bleu.',
 'curse_tempete': 'La tempête reste dans la bouteille, rien n’en sort.',
 'maitre_du_vent': 'Partie de ta v1 : plus de vent, plus aucun visage.',
 'talisman_singe_dore': 'Statue en or complète, comme l’illustration initiale. 3 en est la plus proche.',
 'talisman_longue_vue': 'Une vraie longue-vue, dans l’anneau sans le couper. L’ancienne ressemblait à un canon.',
 'talisman_coffre_piege': 'Coffre d’une seule pièce, couvercle attaché.',
 'talisman_bijou_maudit': 'Bijou plus grand, vrai rouge rubis.'}
redo = []
for k, os_ in OPTS.items():
    vs = [{'v': i, 'card': th(f'{O}/options_cards/{k}_{i}.png', f'{k}_{i}'), 'plate': th(f'{O}/options/{k}_{i}.jpg', f'{k}_{i}_p')} for i in range(1, len(os_) + 1)]
    redo.append({'id': k, 'title': T[k], 'sub': WHY[k], 'vs': vs})
oth = [
 {'id': 'layout', 'title': 'Mise en page', 'sub': 'Ta note sur Capitaine, appliquée à tout le jeu. « Titre en noir » : 1 titre noir en haut (utilisé partout ici), 2 bandeau noir de la v2.',
  'vs': [{'v': 1, 'card': th(f'{O}/cards/capitaine.png', 'lay_1')}, {'v': 2, 'card': th(f'{O}/cards/capitaine_bandeau.png', 'lay_2')}]},
 {'id': 'back_events', 'title': 'Dos Événements', 'sub': 'Base v2, un seul symbole de chaque, dans tes icônes choisies. Trois placements.',
  'vs': [{'v': i, 'card': th(f'{O}/backs/back_events_{i}.jpg', f'be_{i}')} for i in (1, 2, 3)]},
 {'id': 'back_treasures', 'title': 'Dos Trésors', 'sub': 'Refait : or et trésors. 1 n’est pas symétrique : tourné de 180°, il se voit. 2 et 3 le sont.',
  'vs': [{'v': i, 'card': th(f'{O}/backs/back_treasures_{i}.jpg', f'bt_{i}')} for i in (1, 2, 3)]},
 {'id': 'map', 'title': 'Carte, dragon refait', 'sub': 'Carte v3. Il n’y avait qu’un dragon, en bas à droite, avec deux têtes : le voici avec une seule, le corps passe derrière la colline.',
  'vs': [{'v': i, 'card': th(f'{O}/map/map_{i}.jpg', f'map_{i}')} for i in (1, 2)]},
 {'id': 'token', 'title': 'Jeton', 'sub': 'Découpé dans le Maître du Vent choisi. Il suivra ton choix.', 'vs': [{'v': 1, 'card': th(f'{O}/backs/master_token.png', 'token', 420)}]},
]
GR = {'recrue': 'Recrues', 'pillage': 'Pillages', 'abordage': 'Abordages', 'coin': 'Coins', 'malediction': 'Malédictions', 'talisman': 'Talismans', 'role': 'Rôle'}
deck = []
for f, t in GR.items():
    its = [{'id': 'deck_' + c['key'], 'title': c['title'], 'card': th(f"{O}/cards/{c['key']}.png", 'd_' + c['key'], 420), 'plate': th(f"{O}/plates/{c['key']}.jpg", 'd_' + c['key'] + '_p', 420), 'redo': c['key'] in OPTS}
           for c in CARDS + EXTRA if c['family'] == f]
    deck.append({'id': f, 'title': t, 'items': its})
page = open('r2/tpl.html').read().replace('/*DATA*/null', json.dumps({'redo': redo, 'oth': oth, 'deck': deck}, ensure_ascii=False))
open(R + '/index.html', 'w').write(page)
b = {'cards': {}, 'plates': {}}
for f in glob.glob(R + '/i/*.jpg'):
    n = os.path.basename(f)[:-4]
    b['plates' if n.endswith('_p') else 'cards']['i/' + n + '.jpg'] = 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
for g, d in b.items():
    json.dump(d, open(f'{R}/{g}.json', 'w')); print(g, len(d), os.path.getsize(f'{R}/{g}.json') // 1024 // 1024, 'MB')
shutil.rmtree(R + '/i')
