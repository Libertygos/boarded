#!/usr/bin/env python3
"""Round 2 icons (#1757): stencil recipe, one idea per icon, no two icons sharing a drawing. Rewrites the icon rows of prompts.json; writes icons2.json."""
import json
PRE="abordink, one bold flat black stencil pictogram on plain pale parchment, a single solid pure black closed shape with crisp clean hard edges like a hand-cut woodblock stamp, simple and geometric, readable when very small, perfectly clean plain empty background all around, floating alone in the centre filling the picture, nothing under it. Subject: "
T={
"value_sabres":("a heavy curved pirate cutlass with a broad blade and a cup guard, on a diagonal, blade pointing up to the right","two-handed thick curved scimitar seen in side profile, wide blade curving up, short grip and a round pommel"),
"value_voiles":("one single square ship's sail bellied by the wind, hanging from a short horizontal yard, a piece of cloth only, a bulging rounded rectangle with the yard across the top","one single billowing square sail on a short vertical mast with a little pennant on top, a piece of cloth bulging to the right, the mast standing alone"),
"value_canons":("a stubby ship cannon in side profile on a low wedge carriage with two solid round wheels, muzzle to the right","a short fat naval cannon barrel raised at an angle on a small solid carriage with one big solid wheel, muzzle up to the right"),
"value_pistolets":("a flintlock pirate pistol in side profile, L-shaped, thick curved butt with a ball pommel, short thick barrel, muzzle to the right","a stubby blunderbuss pistol in side profile, flared bell muzzle to the right, thick curved butt"),
"ship":("a small sailing ship in side profile with a rounded hull and one big square sail, bow to the right","a galleon in side profile, high stern, two masts with square sails and a pennant, bow to the right, a simple bold shape"),
"family_recrue":("a pirate's tricorn hat seen from the front","a pirate's head in side profile wearing a tricorn hat, a pure black silhouette with no inner lines, facing right"),
"family_pillage":("a tied bulging sack of loot with a knotted neck","a single round fortress tower with battlements, thick and squat"),
"family_abordage":("a grappling hook with four curved prongs and a ring on top","two thick curved sabres crossed in an X"),
"family_malediction":("a skull seen from the front with hollow eyes and a jaw","one curling octopus tentacle with round suckers, shaped like an S"),
"family_talisman":("a teardrop gem pendant hanging from a small ring","an open hand-drawn ring circle, thick, with a small gap at the top right and a diamond in its centre"),
"family_coin":("a big X mark made of two thick crossed strokes","a rolled parchment map scroll, half unrolled, with one small X on it"),
"res_tresor":("a closed treasure chest with a domed lid, two straps and a lock","a neat stack of five thick round coins seen slightly from above"),
"act_voler":("an open hand reaching forward with five fingers spread, palm visible","a hand clutching one big round coin, fingers closed around it"),
"act_defausser":("a pirate walking off the end of a plank, a small figure on one long thin plank","one playing card tilted, sinking into three thick wavy lines of water"),
"act_regarder":("one wide open almond eye with a big round pupil","a telescopic spyglass with three sections on a diagonal, wide end up right"),
"trig_revelation":("one rectangular playing card with rounded corners standing upright, tilted slightly, eight short thick rays around it","half a rising sun on a thick horizon line, seven thick pointed rays"),
"trig_defense":("a round buckler shield seen from the front, a central boss, a thick rim","a heater shield seen from the front, pointed at the bottom, with one thick vertical bar"),
"role_maitre":("an eight-pointed wind rose star with long thin points","a puffing cloud blowing three long straight gust lines to the right, a simple cloud shape"),
"role_retardataire":("an hourglass with a thick frame","a tiny rowing boat in side profile with two oars, seen alone"),
}
P=json.load(open('prompts.json')); by={p['id']:p for p in P}
out=[]
for k,(a,b) in T.items():
    for v,t in (("v1",a),("v2",b)):
        p=by[f"icon_{k}_{v}"]; p['prompt']=PRE+t+"."; p['subject']=t; p['workflow']='flux2-klein-base-4b'; p['width']=p['height']=1024; out.append(p)
# the two trigger aliases that share a family drawing keep their row; every row of the family is covered
print(len(out),[p['id'] for p in P if p['family']=='Icônes' and p not in out])
json.dump(P,open('prompts.json','w'),ensure_ascii=False,indent=1)
json.dump(out,open('icons2.json','w'),ensure_ascii=False,indent=1)
