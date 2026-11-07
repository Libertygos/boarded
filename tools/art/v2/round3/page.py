#!/usr/bin/env python3
"""Round 3 review page (#1757): redos with options to pick, then the whole deck with a note per card."""
import base64, glob, json, os, shutil, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'r3')
from PIL import Image
from cards import CARDS, EXTRA
from opts3 import OPTS
R = 'review'; shutil.rmtree(R, ignore_errors=True); os.makedirs(R + '/i')
O = 'r3/out'
def th(src, name, w=520):
    im = Image.open(src)
    if im.mode in ('LA', 'RGBA'):
        bg = Image.new('RGB', im.size, '#F2EAD8'); bg.paste(im.convert('RGB'), (0, 0), im.getchannel('A')); im = bg
    im = im.convert('RGB'); im.resize((w, int(im.height * w / im.width)), Image.LANCZOS).save(f'{R}/i/{name}.jpg', quality=84)
    return f'i/{name}.jpg'
T = {c['key']: c['title'] for c in CARDS + EXTRA}
WHY = {
 'talisman_singe_dore': 'Redessiné comme les Contre-Abordage : objet coloré dans l’anneau, fond nu. Ocre doré, même teinte pour les trois talismans d’or.',
 'talisman_longue_vue': 'Même style. Lentille large, oculaire étroit : plus de confusion avec un canon.',
 'talisman_coffre_piege': 'Même style. 1 : la mâchoire est le couvercle. 2 et 3 : un piège à dents posé sur le coffre.',
 'talisman_bijou_maudit': 'Même style, en cramoisi, distinct du rouge des Canons. 1 : pendentif ; 2 et 3 : bague.',
 'curse_bateau_fantome': '1 : ton illustration retouchée (voiles en lambeaux, squelettes, brume violette). 2 : lune, figure de proue en crâne. 3 : feu violet sur le pont.',
 'curse_ile_brumeuse': 'L’île est le sujet, noyée dans le brouillard bleu. 1 et 3 : un petit navire au pied des falaises. 2 : rocher en crâne.',
}
redo = []
for k, os_ in OPTS.items():
    if k.startswith('back'): continue
    vs = [{'v': i, 'card': th(f'{O}/options_cards/{k}_{i}.png', f'{k}_{i}'), 'plate': th(f'{O}/options/{k}_{i}.jpg', f'{k}_{i}_p')} for i in range(1, len(os_) + 1)]
    redo.append({'id': k, 'title': T[k], 'sub': WHY[k], 'vs': vs})
redo += [
 {'id': 'back_events', 'title': 'Dos Événements', 'sub': 'Refait : le paquet des Recrues, Pillages et Abordages. Tes symboles en coins (option 1 de la revue 2). En figure de carte à jouer, le motif entier en haut, retourné en bas : symétrique sans couper le motif. 1 capitaine, 2 abordage, 3 pavillon.',
  'vs': [{'v': i, 'card': th(f'{O}/backs/back_events_{i}.jpg', f'be_{i}')} for i in (1, 2, 3)]},
 {'id': 'back_treasures', 'title': 'Dos Trésors', 'sub': 'Refait de zéro dans le style du jeu : encre noire, une seule couleur d’or. 1 coffre (en figure, tête-bêche), 2 doublon et clés, 3 os en croix sur la boussole. Tous symétriques.',
  'vs': [{'v': i, 'card': th(f'{O}/backs/back_treasures_{i}.jpg', f'bt_{i}')} for i in (1, 2, 3)]},
]
oth = [
 {'id': 'layout', 'title': 'Texte agrandi', 'sub': 'Règles de 43 à 50 px, bonus et texte des Coins agrandis d’autant. Exemples ci-dessus et dans tout le jeu.',
  'vs': [{'v': 1, 'card': th(f'{O}/cards/talisman_singe_dore.png', 'lay_1')}, {'v': 2, 'card': th(f'{O}/cards/curse_tourbillon.png', 'lay_2')}, {'v': 3, 'card': th(f'{O}/cards/coin_hg.png', 'lay_3')}]},
 {'id': 'boarding', 'title': 'Abordages', 'sub': 'Navires agrandis (environ 1,4 fois), les feux d’artifice passent derrière eux.',
  'vs': [{'v': i, 'card': th(f'{O}/cards/{k}.png', f'ab_{i}')} for i, k in enumerate(('abordage_1c1_canons_pistolets', 'abordage_2c2_canons_pistolets_sabres', 'abordage_1c1_canons_voiles_sabres'), 1)]},
]
GR = {'recrue': 'Recrues', 'pillage': 'Pillages', 'abordage': 'Abordages', 'coin': 'Coins', 'malediction': 'Malédictions', 'talisman': 'Talismans', 'role': 'Rôle'}
deck = []
for f, t in GR.items():
    its = [{'id': 'deck_' + c['key'], 'title': c['title'], 'card': th(f"{O}/cards/{c['key']}.png", 'd_' + c['key'], 420), 'plate': th(f"{O}/plates/{c['key']}.jpg", 'd_' + c['key'] + '_p', 420), 'redo': c['key'] in OPTS}
           for c in CARDS + EXTRA if c['family'] == f]
    deck.append({'id': f, 'title': t, 'items': its})
page = open('r3/tpl.html').read().replace('/*DATA*/null', json.dumps({'redo': redo, 'oth': oth, 'deck': deck}, ensure_ascii=False))
open(R + '/index.html', 'w').write(page)
b = {'cards': {}, 'plates': {}}
for f in glob.glob(R + '/i/*.jpg'):
    n = os.path.basename(f)[:-4]
    b['plates' if n.endswith('_p') else 'cards']['i/' + n + '.jpg'] = 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
for g, d in b.items():
    json.dump(d, open(f'{R}/{g}.json', 'w')); print(g, len(d), os.path.getsize(f'{R}/{g}.json') // 1024 // 1024, 'MB')
shutil.rmtree(R + '/i')
