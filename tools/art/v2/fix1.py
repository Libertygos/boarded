#!/usr/bin/env python3
"""Round 2 prompts (#1757): corrections after reviewing pass 1. Rewrites prompts.json in place, writes retry1.json with the changed ids."""
import json
P=json.load(open('prompts.json')); by={p['id']:p for p in P}
CANNON="one stubby ship cannon, barrel, carriage and wheels all painted the same colour"
SAIL1="one single sheet of sailcloth bellied by the wind like a great banner, hanging from one horizontal wooden spar"
PISTOL="short flintlock pirate pistol with a curved butt, its barrel no longer than its grip, a stubby one-handed sidearm"
def sub(i,a,b):
    p=by[i]; assert a in p['prompt'],(i,a); p['prompt']=p['prompt'].replace(a,b); ch.add(i)
ch=set()
sub('recruit_capitaine_v1','at his feet a stubby ship cannon, barrel, carriage and wheels all painted the same colour in vermillion red ink','at his feet exactly one small cannon, its barrel, carriage and wheels entirely vermillion red ink')
sub('recruit_capitaine_v3','to his right a stubby ship cannon, barrel, carriage and wheels all painted the same colour in vermillion red ink','to his right exactly one small cannon, its barrel, carriage and wheels entirely vermillion red ink')
for v in ('v1','v3'):
    sub('recruit_capitaine_'+v,'a long flintlock pistol with a curved butt','a short flintlock pistol with a curved butt')
    sub('recruit_capitaine_'+v,SAIL1+' in indigo blue ink','one single sheet of indigo blue sailcloth bellied by the wind like a great banner, painted entirely in indigo blue ink, on one thin black spar')
sub('recruit_canonnier_v2',CANNON+' painted in vermillion red ink, the only colour','one stubby cannon with a vermillion red barrel, a vermillion red carriage and vermillion red wheels, the whole cannon vermillion red, the only colour')
sub('recruit_maitre_canonnier_v2','one small cannon barrel across his shoulders, a second cannon on its carriage beside him, both painted in vermillion red ink, the two cannons the only colour','one small vermillion red cannon barrel across his shoulders, and beside him a second vermillion red cannon on a vermillion red carriage, vermillion red the only colour')
sub('recruit_maitre_canonnier_v3','a smoking linstock in each hand, two cannons pointing outward to the left and to the right, both painted in vermillion red ink, the two cannons the only colour','standing between two full-size ship cannons resting on the ground on wooden carriages, one on his left and one on his right, pointing outward, their barrels and carriages entirely vermillion red, a black linstock in each hand, vermillion red the only colour')
sub('recruit_maitre_voilier_v1','Above him two stacked sheets of sailcloth bellied by the wind on two wooden spars, both painted in indigo blue ink, the two sails the only colour.','The rope rises to two plain rectangles of indigo blue cloth hanging one above the other like laundry, each from a thin black pole, nothing else up there, indigo blue the only colour.')
for v in ('v2','v3'):
    sub('recruit_navigateur_'+v,SAIL1+' painted in indigo blue ink, the only colour','one single plain sheet of indigo blue sailcloth bellied by the wind, painted entirely in indigo blue ink from edge to edge, on one thin black spar, indigo blue the only colour')
by['curse_tempete_v2']['prompt']=by['curse_tempete_v2']['prompt'].split(' One corked flask')[0]+" One long-necked corked glass bottle lying on its side, a tiny ship with sails visible inside it, the glass drawn in loose bold black brush strokes and thin parchment highlights, a long crack down its side, a storm of black ink cloud pouring out of the crack and rising, forked lightning bolts bursting from the cloud. The lightning and a few drops are jade green ink, jade green the only colour."; ch.add('curse_tempete_v2')
by['talisman_coffre_piege_v3']['prompt']=by['talisman_coffre_piege_v3']['prompt'].split(' One single treasure chest')[0]+" One small treasure chest seen at three-quarter view, planks in a pale muted wood-brown wash, black iron bands, its lid open like a mouth showing big jagged iron teeth, the whole chest sitting well inside one open hand-brushed black ink enso circle whose inside is plain bare parchment, wood-brown the only colour."; ch.add('talisman_coffre_piege_v3')
ch.add('talisman_contre_canons_v3')
for v in ('v1','v2','v3'):
    sub('talisman_contre_pistolets_'+v,'long flintlock pistol with a curved butt',PISTOL)
by['master_of_winds_v2']['prompt']=by['master_of_winds_v2']['prompt'].split(' A wind rose')[0]+" A wind rose in the exact centre, and at the four corners four solemn old wind gods as on antique engraved sea charts, bearded human heads in profile emerging from curling clouds, cheeks puffed, each blowing long straight gust lines toward the rose, stern and mythic, flat ornamental design, entirely black ink."; ch.add('master_of_winds_v2')
ch.add('master_of_winds_v3')
for s in ('canons','voiles','pistolets','sabres'):
    sub(f'burst_{s}_v2','with heavy spatter','perfectly round like a sphere, sparks radiating evenly in every direction, floating alone in the air')
print(by['icon_value_pistolets_v1']['prompt'][-250:]); print(by['icon_value_pistolets_v2']['prompt'][-250:])
json.dump(P,open('prompts.json','w'),ensure_ascii=False,indent=1)
json.dump([by[i] for i in sorted(ch)],open('retry1.json','w'),ensure_ascii=False,indent=1)
json.dump([p for p in P if p['id'] not in ch and p['family']!='Parchemin'],open('rest1.json','w'),ensure_ascii=False,indent=1)
print(len(ch))
