#!/usr/bin/env python3
"""À l'abordage art v2 (#1757), round 2: every asset, version and prompt, after the rules check and
the art-director critique of the pilot. Run: prompts_v2.py > prompts.json

Family rules (one per family): recruits = one solid black shape; raids = pale fort, black ship;
boardings = pure black, colour added by code; curses = one dominant dark shape; talismans = wash
object, bare ensō; map = engraving only, route added by code; backs = half turned 180 by code;
role = black ornament; icons = one closed silhouette.
Positive wording throughout: an image model is primed by what a prompt names, even to forbid it."""
import json, sys

# style_bible.md §1 verbatim, with the LoRA trigger in front
PRE = ("abordink, traditional sumi-e ink painting, bold black ink on warm aged parchment paper, wet ink wash "
       "with dry-brush strokes and deliberate ink spatter, centered subject with generous negative space above "
       "and below, strictly limited palette of black ink and warm parchment, golden age of piracy, 18th century, "
       "playful adventurous tone, borderless full-bleed artwork, pristine, free of any lettering, calligraphy, stamps or seals. ")
FIG = ("The figure is one solid unbroken black shape with crisp, precise, characterful contours; the only inner marks "
       "are a few hairline parchment folds and straps; the face is a black mask with one bare eye; exactly one person; "
       "the ground is three short horizontal brush strokes; plain parchment all around. ")
FIG0 = ("The figure is one solid unbroken black shape with crisp contours and a face that is a black mask with one bare eye; "
        "exactly one person; plain parchment all around. ")
COL = {"sabres": "jade green", "voiles": "indigo blue", "canons": "vermillion red", "pistolets": "plum violet"}
SABRE = "curved cutlass with a broad clipped blade"
SAIL = "single sheet of sailcloth bellied by the wind like a great banner, hanging from one horizontal wooden spar"
CANNON = "stubby ship cannon, barrel, carriage and wheels all painted the same colour"
PISTOL = "long flintlock pistol with a curved butt"

A = []
def add(id, family, card, count, v, intent, subject, w=1024, h=1440, note="", workflow="flux2-klein-base-4b", pre=PRE):
    A.append(dict(id=f"{id}_v{v}", asset=id, family=family, card=card, count=count, version=v, intent=intent,
                  subject=subject, note=note, width=w, height=h, workflow=workflow, prompt=pre + subject))

# ---------- RECRUES (9)
R = [
 ("capitaine", "Capitaine", 4, [
  ("Face, les quatre objets", f"A lone pirate captain standing tall, facing us with solemn gravitas, long coat with wide cuffs, cocked hat with one long plume. {FIG}His raised right hand holds a {SABRE} in jade green ink; his raised left hand holds a {PISTOL} in plum violet ink; at his feet a {CANNON} in vermillion red ink; behind his shoulders one {SAIL} in indigo blue ink. All four objects large, whole and fully inside the picture, each in its colour."),
  ("Pied sur le canon", f"A lone pirate captain in profile with one boot up on a {CANNON} in vermillion red ink, long coat blown back, cocked hat with one long plume. {FIG}One hand lifts a {SABRE} in jade green ink, the other hangs holding a {PISTOL} in plum violet ink, and one {SAIL} in indigo blue ink arches high above him. All four objects large, whole and fully inside the picture."),
  ("De dos, face au large", f"A lone pirate captain seen from behind, feet apart, looking away, huge long coat, cocked hat with one long plume. {FIG}His right hand lowers a {SABRE} in jade green ink, his left hand lowers a {PISTOL} in plum violet ink, to his right a {CANNON} in vermillion red ink, and in front of him, filling the upper picture, one {SAIL} in indigo blue ink. All four objects large and whole."),
 ]),
 ("matelot", "Matelot", 11, [
  ("Fente", f"A lone young pirate sailor in a low fencing lunge with gravitas, knotted headscarf, loose shirt, wide slops cut at the calf, bare feet. {FIG}He thrusts one {SABRE} painted in jade green ink, the only colour."),
  ("À la corde", f"A lone pirate sailor swinging on one rope through the air, barefoot, knees up, slops flapping, knotted headscarf, the rope a single fine black line rising out of the top of the picture. {FIG0}He brandishes one {SABRE} painted in jade green ink, the only colour."),
  ("Au repos", f"A lone pirate sailor standing still and watchful, one {SABRE} painted in jade green ink resting on his shoulder, the only colour, knit cap, barefoot, a coil of rope over the other shoulder. {FIG}"),
 ]),
 ("matelots", "Matelots", 7, [
  ("Deux lames basses", f"A lone veteran pirate sailor in a wide stance, holding two cutlasses low and out, one in each hand, both painted in jade green ink, the two blades the only colour, knotted headscarf, torn sleeves, broad shoulders, braided beard, bare feet. {FIG}"),
  ("Lames croisées", f"A lone veteran pirate sailor facing us, two cutlasses crossed before his chest, both painted in jade green ink, the two blades the only colour, knit cap, bare forearms, heavy rope belt, bare feet. {FIG}"),
  ("Deux matelots dos à dos", "Two pirate sailors standing back to back, each lifting one cutlass painted in jade green ink, the two blades the only colour. Each figure one solid unbroken black shape with crisp contours and a face that is a black mask with one bare eye; one headscarf, one knit cap; wide slops, bare feet; three short brush strokes of ground; plain parchment all around."),
 ]),
 ("navigateur", "Navigateur", 11, [
  ("Le mât de bannière", f"A lone pirate navigator standing with gravitas, holding a tall wooden pole that bears one {SAIL}, painted in indigo blue ink, the only colour, wide-brimmed hat with one feather, long waistcoat, rolled chart under his arm. {FIG}"),
  ("Backstaff", f"A lone pirate navigator with his back to the sun, measuring with a wooden backstaff at his eye, wide-brimmed hat with one feather, long waistcoat. {FIG}High above him floats one {SAIL} painted in indigo blue ink, the only colour."),
  ("Chart et compas", f"A lone pirate navigator looking down at a long chart hanging from one hand, a pair of dividers raised in the other, wide-brimmed hat, long waistcoat. {FIG}High above him swells one {SAIL} painted in indigo blue ink, the only colour."),
 ]),
 ("maitre_voilier", "Maître Voilier", 7, [
  ("Il hisse", f"A lone pirate sailmaster leaning back with all his weight, hauling on a rope with both hands, straw hat, a marlinspike at his belt. {FIG}Above him two stacked sheets of sailcloth bellied by the wind on two wooden spars, both painted in indigo blue ink, the two sails the only colour."),
  ("À l'ouvrage", f"A lone pirate sailmaster seated on a coil of rope, stitching canvas with a big curved needle, straw hat, big hands, one sheet of sailcloth spread over his knees and one more hoisted on a spar above him, both painted in indigo blue ink, the two sails the only colour. {FIG0}"),
  ("Sur la vergue", f"A lone pirate sailmaster standing high up on a wooden spar, gripping a line, wind in his coat, one sheet of sailcloth above him and one below him, both painted in indigo blue ink, the two sails the only colour, straw hat tied down with a scarf, bare feet. {FIG0}"),
 ]),
 ("canonnier", "Canonnier", 11, [
  ("La mèche", f"A lone pirate gunner kneeling on one knee with gravitas, reaching out with a long forked linstock holding a smoking match to the touch hole of one {CANNON}, painted in vermillion red ink, the only colour, head tied in a scarf, bare arms, powder horn on a strap. {FIG}"),
  ("Le refouloir", f"A lone pirate gunner standing behind one {CANNON} painted in vermillion red ink, the only colour, driving a long rammer down its muzzle with both arms, head tied in a scarf, leather apron, powder horn on a strap. {FIG}"),
  ("La visée", f"A lone pirate gunner bending low behind one {CANNON} painted in vermillion red ink, the only colour, sighting along the barrel, one hand on a long wooden handspike, head tied in a scarf, powder horn on a strap. {FIG}"),
 ]),
 ("maitre_canonnier", "Maître Canonnier", 7, [
  ("Entre deux canons", f"A lone burly pirate master gunner standing between two cannons with his fists on his hips and a linstock under one arm, bald head, enormous moustache in outline, leather apron, both cannons with barrels, carriages and wheels painted in vermillion red ink, the two cannons the only colour. {FIG}"),
  ("Sur l'épaule", f"A lone burly pirate master gunner carrying one small cannon barrel across his shoulders, a second cannon on its carriage beside him, both painted in vermillion red ink, the two cannons the only colour, bald head, bare barrel chest, leather apron. {FIG}"),
  ("Dos aux bouches", f"A lone burly pirate master gunner seen from behind with both arms spread, a smoking linstock in each hand, two cannons pointing outward to the left and to the right, both painted in vermillion red ink, the two cannons the only colour, bald head, leather apron. {FIG}"),
 ]),
 ("officier", "Officier", 11, [
  ("En duel", f"A lone pirate officer in strict profile in a duelling stance, one arm extended straight, aiming one {PISTOL} painted in plum violet ink, the only colour, cocked hat, tied-back hair, fitted long coat, high boots. {FIG}"),
  ("Pistolet levé", f"A lone pirate officer standing upright, one {PISTOL} painted in plum violet ink held pointing to the sky beside his cheek, the only colour, a thin wisp of grey smoke, cocked hat, long coat with wide cuffs, high boots. {FIG}"),
  ("La duelliste", f"A lone woman pirate officer in profile, long braid and cocked hat, one hand on her hip, the other arm aiming one {PISTOL} painted in plum violet ink, the only colour, fitted long coat, wide belt, high boots. {FIG}"),
 ]),
 ("quartier_maitre", "Quartier-maître", 7, [
  ("Deux pistolets", f"A lone stern pirate quartermaster facing us, feet apart, one flintlock pistol in each lowered hand, both painted in plum violet ink, the two pistols the only colour, slouched broad hat, heavy coat, a ring of keys at his belt. {FIG}"),
  ("Le registre", f"A lone stern pirate quartermaster standing, holding an open ledger in one hand, two flintlock pistols thrust crosswise through his wide sash, large and clearly visible, both painted in plum violet ink, the two pistols the only colour, slouched broad hat, heavy coat. {FIG}"),
  ("Bras croisés", f"A lone stern pirate quartermaster with arms crossed over his chest, a flintlock pistol in each fist pointing up and outward, both painted in plum violet ink, the two pistols the only colour, slouched broad hat, heavy coat. {FIG}"),
 ]),
]
for id, card, n, vs in R:
    for i, (intent, s) in enumerate(vs, 1):
        add("recruit_" + id, "Recrues", card, n, i, intent, s,
            note="flag: the bible says one figure; plural card name" if id == "matelots" and i == 3 else "")

# ---------- PILLAGES (4)
FORT = "a Caribbean bastion fort with angled ramparts, round sentry boxes and palm trees on a rocky island, painted as a pale grey ink wash mass, "
SHIP = "a three-masted pirate ship with precise rigging and torn sails, a darker black mass in front of the fort, "
ACT = {
 "sabres": ("Sabres", "jade green", "longboats reaching the beach, crews as tiny black figures raising cutlasses, the blades in jade green ink"),
 "voiles": ("Voiles", "indigo blue", "the ship arriving under full press of sail, its sails in indigo blue ink"),
 "canons": ("Canons", "vermillion red", "the ship firing a broadside, the muzzle flashes in vermillion red ink"),
 "pistolets": ("Pistolets", "plum violet", "tiny black figures on the rocks firing a volley, the muzzle flashes in plum violet ink"),
}
for k, (nm, col, act) in ACT.items():
    c = f"Pillage, bonus {nm}"
    add("raid_" + k, "Pillages", c, 2, 1, "Éclaboussures (bible)", f"{SHIP}at anchor before {FORT}{col} ink bursting around the ship as thin translucent spatter and rays, {col} the only colour anywhere, the water in black ink.")
    add("raid_" + k, "Pillages", c, 2, 2, "La valeur en action", f"{SHIP}close under the walls of {FORT}{act}, {col} the only colour anywhere, grey wash smoke, the sea a few thick black strokes.", note="flag: the bible asks for splashes around the boat; here the colour is the value in action")
    add("raid_" + k, "Pillages", c, 2, 3, "Le fort domine", f"A towering view: {FORT}rising high above and filling the middle of the picture, and small in the foreground {SHIP}{act}, {col} the only colour anywhere, stylized curling waves with claw foam beneath the ship.", note="flag: as v2")

# ---------- ABORDAGES: colourless plates; the bursts are composited by code
T = " Silhouette ships and crews in black ink with grey smoke, a thick ink line for the sea, and nothing but bare parchment above the masts, the top third of the picture empty."
add("boardscene_a", "Abordages (scène)", "Abordage 1 c. 1", 9, 1, "Flanc contre flanc", "Two pirate ships locked side by side in a boarding battle, seen from low on the water, precise hulls with gun ports, fine rigging lines, torn square sails, grappling lines taut between the hulls, tiny pirate figures swinging on ropes between the decks." + T)
add("boardscene_b", "Abordages (scène)", "Abordage 1 c. 1", 9, 2, "Plan large sous la vague", "A wide view at a great distance: two small pirate ships grappled together under one huge Hokusai-like wave curling over them with claw foam, tiny figures on ropes between them." + T.replace("a thick ink line for the sea", "the great wave in bold black strokes"))
add("boardscene_c", "Abordages (scène)", "Abordage 1 c. 1", 9, 3, "Le sloop contre le galion", "A small pirate sloop lashed against the flank of a tall galleon with a high stern castle, tiny pirate figures climbing the galleon's side on ropes, fine rigging lines, torn sails." + T)
add("boardscene_d", "Abordages (scène)", "Abordage 2 c. 2", 4, 1, "Quatre navires, deux paires", "Four pirate ships in a boarding battle, two against two, in two grappled pairs one behind the other, tiny pirate figures swinging on ropes, fine rigging lines, torn square sails." + T, note="flag: bible 1.3.4 ruled one scene for 1v1 and 2v2; four ships make the mode readable. v3 of a 2 c. 2 card uses the two-ship scene a, as ruled")
add("boardscene_e", "Abordages (scène)", "Abordage 2 c. 2", 4, 2, "Quatre navires, mêlée", "Four pirate ships, two rafted together on the left against two rafted together on the right, crews crossing in the middle on ropes and planks, tiny precise pirate figures, fine rigging lines, torn sails." + T, note="flag: as boardscene_d")
for c, nm in COL.items():
    add(f"burst_{c}", "Abordages (gerbes)", "composant", 0, 1, "Gerbe fine", f"One single huge exploding firework of {nm} ink centred on plain parchment: long fine radiating lines with tiny droplets at their tips and a small core, {nm} the only colour.", 1024, 1024)
    add(f"burst_{c}", "Abordages (gerbes)", "composant", 0, 2, "Gerbe dense", f"One single huge exploding firework of {nm} ink centred on plain parchment: a dense round chrysanthemum of many thick petals of ink with heavy spatter, {nm} the only colour.", 1024, 1024)

# ---------- MALÉDICTIONS (5): colour = the rules' bonus value (rulebook P10)
CUR = [
 ("kraken", "Libérez le Kraken", "canons", "vermillion red", [
  ("Le navire enlacé", "A colossal black kraken rising from the sea, one dominant dark shape, thick tentacles with rows of sucker dots wrapped around a small fragile pirate ship, one huge round eye in negative space"),
  ("Tentacules en spirale", "Huge black kraken tentacles with sucker dots erupting in one tall spiral from the sea, a small pirate longboat tossed in the air between them"),
  ("L'œil", "An enormous black kraken head rising face on from the water, one enormous eye in negative space, tentacles curling up both sides of the picture, a tiny ship before it for scale"),
 ]),
 ("tourbillon", "Tourbillon", "pistolets", "plum violet", [
  ("Vue plongeante", "A giant whirlpool seen from above at an angle, concentric spiralling black brush strokes with spray lines, a small pirate ship tilting on its rim"),
  ("Le gouffre", "A whirlpool seen from the side, a deep funnel of black brush strokes plunging down the middle of the picture, small ships and broken masts circling down it"),
  ("La roue", "One perfect spiral of wet black ink with claw foam on its arms, filling the middle of the picture, barrels, planks and tiny figures flung outward"),
 ]),
 ("ile_brumeuse", "Île Brumeuse", "voiles", "indigo blue", [
  ("Le pic", "A tall jagged island of sharp rocky peaks half hidden in banks of fog, layered grey wash mountains in the splashed-ink manner of Sesshu, a tiny pirate ship slipping away"),
  ("La crique", "Rows of pale wash peaks fading in fog, in the foreground a dark rocky cove with a small pirate ship disappearing behind a veil of mist"),
  ("L'île crâne", "A lonely misty island whose rock face vaguely suggests a giant skull, veiled by rolling wash fog, a small longboat rowing away"),
 ]),
 ("tempete", "Tempête en Bouteille", "sabres", "jade green", [
  ("Le flacon", "One squat round corked flask drawn entirely in loose bold black brush strokes, filling the middle of the picture, a raging miniature storm of black waves and a tiny ship inside it, forked lightning"),
  ("Le flacon qui craque", "One corked flask lying on its side drawn entirely in loose bold black brush strokes, cracking, a storm of black ink pouring out through the crack, a tiny ship inside it, forked lightning"),
  ("Dans la main", "A solid black silhouetted hand holding up one small corked flask by the neck, the flask in loose black brush strokes, a raging miniature storm with a tiny ship inside it, forked lightning"),
 ]),
 ("bateau_fantome", "Bateau Fantôme", "pistolets", "plum violet", [
  ("Hors de la brume", "A spectral ship drifting out of rolling mist, one large shape in pale dry-brush grey with fraying edges, tattered sails full of holes, the hull dissolving at the waterline"),
  ("La proue", "A huge spectral ship seen bow on, towering, pale dry-brush grey, tattered sails hanging like rags, a tiny dark ship before it for scale"),
  ("Le reflet", "A spectral ship that is only faint dry-brush mist and rags above still black water, while its reflection below is a sharp solid black ship"),
 ]),
]
for id, card, val, col, vs in CUR:
    tail = {"tempete": f" The lightning and a few drops are {col} ink, {col} the only colour.",
            "ile_brumeuse": f" A few wisps of {col} ink drift in the mist, {col} the only colour.",
            "bateau_fantome": f" A soft glow of {col} ink in the mist around the hull, {col} the only colour."}.get(id, f" {col.capitalize()} ink falls as a few translucent drops on the spray, {col} the only colour.")
    for i, (intent, s) in enumerate(vs, 1):
        add("curse_" + id, "Malédictions", f"{card} (bonus {val})", 2, i, intent, s + "." + tail)

# ---------- TALISMANS (8): open ensō, bare parchment inside
E = "painted as a loose brush wash with a black outline, centred inside one open hand-brushed black ink enso circle whose inside is plain bare parchment, the object big and filling most of the circle. "
TAL = [
 ("singe_dore", "Singe Doré", 1, "golden monkey idol squatting on a small plinth, grinning", "golden monkey idol seen in three-quarter view, hands over its eyes, on a small plinth", "flat muted gold ink, gold the only colour"),
 ("longue_vue", "Longue-vue", 2, "antique brass telescope fully extended on a diagonal, three tapering sections, one tube", "antique brass telescope half collapsed and lying horizontally, one tube, with a short carrying cord", "muted brass ink, brass the only colour"),
 ("coffre_piege", "Coffre Piégé", 2, "treasure chest with iron bands, its lid open like a mouth showing large jagged iron teeth", "treasure chest seen from the front and slightly above, its lid half open, jagged iron teeth biting out and a chain around it", "muted wood-brown ink, brown the only colour"),
 ("bijou_maudit", "Bijou Maudit", 2, "large faceted ruby in a claw setting on a broken chain, thin curling wisps of black smoke rising from it", "large teardrop-cut ruby pendant hanging from a broken chain, a thin wisp of black smoke curling up around it", "deep ruby ink, ruby the only colour"),
]
for id, card, n, o1, o2, colr in TAL:
    add("talisman_" + id, "Talismans", card, n, 1, "Pose 1", f"One single {o1}, {E}{colr}.")
    add("talisman_" + id, "Talismans", card, n, 2, "Pose 2", f"One single {o2}, {E}{colr}.")
    add("talisman_" + id, "Talismans", card, n, 3, "Noir, un seul accent", f"One single {o1}, as a solid black ink shape with one small area of colour, centred inside one open hand-brushed black ink enso circle whose inside is plain bare parchment, {colr}.")
OBJ_T = {"sabres": (SABRE, "held nearly upright on a steep diagonal"), "voiles": (SAIL, "seen straight on"),
         "canons": (CANNON, "in side profile"), "pistolets": (PISTOL, "in side profile, muzzle up")}
for v, nm in COL.items():
    o, pose = OBJ_T[v]
    add("talisman_contre_" + v, "Talismans", f"Contre-Abordage {v}", 1, 1, "L'objet seul", f"One single {o}, {pose}, the whole object painted in {nm} ink, {E}{nm} the only colour.")
    add("talisman_contre_" + v, "Talismans", f"Contre-Abordage {v}", 1, 2, "L'objet, encre dense", f"One single {o}, large and dramatic on a diagonal, in dense wet {nm} ink with heavy spatter, centred inside one open hand-brushed black ink enso circle whose inside is plain bare parchment, {nm} the only colour.")
    add("talisman_contre_" + v, "Talismans", f"Contre-Abordage {v}", 1, 3, "Corde tranchée", f"One single {o}, {pose}, painted in {nm} ink, lying across a cut rope drawn in black ink, {E}{nm} the only colour.", note="flag: the bible says the value object alone; the cut rope says 'counter'")

# ---------- CARTE: one master cut in four. Route, X and border trim are done by code. Distilled model: finer engraving.
MPRE = "abordink, fine vintage cartographic black ink linework on warm aged parchment paper, antique engraved sea chart of the golden age of piracy, 18th century, free of any lettering, stamps or seals. "
LAY = ("Top left a large smoking volcano on jungle slopes, top right a skull-shaped rock in a bay, bottom left a harbour with a small sailing ship, "
       "bottom right a sea serpent coiled among reefs, and a large ornate compass rose exactly in the centre of the picture. ")
ML = "A dense pirate treasure map filling the whole sheet edge to edge, about sixty percent land: rugged islands with hatched shorelines, countless tiny palm trees and mountain ridges, coves and reefs, the whole sheet evenly dense, every patch of water filled with small repeated wave marks, entirely black ink. "
add("map", "Carte", "4 Coins (×5)", 20, 1, "Gravure fine", ML + LAY, 1440, 2016, workflow="flux2-klein-4b", pre=MPRE)
add("map", "Carte", "4 Coins (×5)", 20, 2, "Lavis sumi-e", "A pirate treasure map painted in wet sumi-e ink wash and bold brush strokes, islands as dark washes, about sixty percent land, small wave marks in the water, entirely black ink. " + LAY, 1440, 2016)
add("map", "Carte", "4 Coins (×5)", 20, 3, "Gravure et lavis", ML + "Grey ink wash shading over the fine linework of the land. " + LAY, 1440, 2016, workflow="flux2-klein-4b", pre=MPRE)

# ---------- DOS & RÔLE: the best half is kept and turned 180 degrees by code; colour emblems are stamped by code
add("back_events", "Dos", "Dos Événements", 97, 1, "Rose et corde", "A symmetrical ornamental panel, a parchment-coloured ground with a black rope border and a centred compass rose, thin line scrollwork, large areas left light, flat woodblock print style, entirely black ink.")
add("back_events", "Dos", "Dos Événements", 97, 2, "Vagues seules", "A symmetrical ornamental panel, the whole surface one even repeating pattern of thin-line Japanese seigaiha waves in black ink on parchment, a narrow rope border, flat woodblock print style.")
add("back_events", "Dos", "Dos Événements", 97, 3, "Ancres et nœuds", "A symmetrical ornamental panel on parchment, two large crossed anchors behind a compass rose in the exact centre, thin scrollwork and rope knots, a black rope border, large areas left light, flat woodblock print style.")
add("back_treasures", "Dos", "Dos Trésors", 41, 1, "Fond noir, X", "A symmetrical ornamental panel, solid black ink background, a large bold brushed X in parchment colour inside a rope wreath in the exact centre, anchors and antique keys in parchment colour at the corners, wave pattern in parchment lines, flat woodblock print style, monochrome.", note="flag: a black ground differs most face down, but stands apart from the parchment deck")
add("back_treasures", "Dos", "Dos Trésors", 41, 2, "Parchemin, X", "A symmetrical ornamental panel on parchment, a large bold brushed black X inside a rope wreath in the exact centre, anchors and antique keys at the corners, thin line wave pattern, a heavy black border, flat woodblock print style.")
add("back_treasures", "Dos", "Dos Trésors", 41, 3, "Parchemin, coffre", "A symmetrical ornamental panel on parchment, a treasure chest emblem with a bold X in the exact centre, scattered doubloons in thin line, a heavy black rope border, flat woodblock print style.")
for v, (intent, s) in enumerate([
  ("Vents opposés", "Black scroll ornament around a large wind rose in the exact centre, two puffing cloud faces with round cheeks blowing from opposite edges in the manner of antique map wind-heads, flat ornamental design, entirely black ink."),
  ("Quatre vents", "A wind rose in the exact centre, four puffing cloud faces with round cheeks at the four corners blowing inward, like the corners of an antique map, flat ornamental design, entirely black ink."),
  ("Rose et volutes", "One large eight-pointed wind rose in the exact centre, spiral gust lines curling outward, drawn as plain black scrolls, flat ornamental design, entirely black ink."),
], 1):
    add("master_of_winds", "Rôle", "Maître du Vent", 1, v, intent, s, note="5:7 card; the round token is cut from its centre by code")

# ---------- ICÔNES: two different drawings; the third version (reversed in a disc) is made by code
IC = "one solid black silhouette of {x}, a single closed shape with no inner lines, simple and bold, readable when tiny, centred and filling the picture, alone on plain parchment."
ICONS = [
 ("value_sabres", "Valeurs", "Sabres", "a curved cutlass on a steep diagonal, wide clipped blade, big shell guard", "a broad curved sabre pointing up, seen flat, with a knuckle bow"),
 ("value_voiles", "Valeurs", "Voiles", "one billowing square sail hanging from one horizontal spar, seen from the front", "one square sail curved by wind like a shield, with a spar on top and two lines at the bottom corners"),
 ("value_canons", "Valeurs", "Canons", "a stubby cannon in side profile on a two-wheeled carriage, muzzle to the left", "a cannon barrel on a low carriage with one big wheel, in side profile, muzzle raised to the left"),
 ("value_pistolets", "Valeurs", "Pistolets", "a flintlock pistol in side profile, L-shaped, thick curved butt, muzzle to the right", "a long-barrelled flintlock pistol in side profile with a ball-shaped butt, muzzle to the right"),
 ("ship", "Mode", "Navire (1 c. 1, 2 c. 2)", "a small boat in side profile with one mast and one square sail, round hull", "a small three-masted ship seen from the side, plain hull"),
 ("family_recrue", "Famille", "Recrue", "a pirate's cocked hat seen from the front", "a pirate's head and shoulders in profile wearing a cocked hat"),
 ("family_pillage", "Famille / déclencheur", "Pillage", "a sack of loot tied at the neck", "a fortified tower with battlements on a small rock"),
 ("family_abordage", "Famille / déclencheur", "Abordage", "a grappling iron: a straight shank with four curved claws spreading from its lower end, seen from the side, with a ring on top", "two crossed curved cutlasses"),
 ("family_malediction", "Famille", "Malédiction", "a grinning skull seen from the front", "a kraken tentacle curling upward in an S shape"),
 ("family_talisman", "Famille", "Talisman", "a round pendant amulet on a short loop of cord", "a closed padlock-shaped charm with a round eye-shaped hole"),
 ("family_coin", "Famille", "Coin de carte", "a torn rectangular scrap of map with a big X cut out of it", "a rolled parchment scroll"),
 ("role_maitre", "Rôles", "Maître du Vent", "a wind rose with eight sharp points", "a puffing cloud face in profile blowing a gust"),
 ("role_retardataire", "Rôles", "Retardataire", "an hourglass", "an anchor"),
 ("res_tresor", "Ressources", "Trésor", "a small closed treasure chest with a domed lid", "a stack of three round coins"),
 ("act_voler", "Actions / si volé", "Voler", "an open hand seen from the back, five spread fingers pointing down, reaching to grab", "a clenched fist holding a coin"),
 ("act_defausser", "Actions", "Défausser", "an anchor rope being cut by a blade", "a figure walking off a plank"),
 ("act_regarder", "Actions", "Regarder", "a wide-open almond-shaped eye", "a telescope on a diagonal"),
 ("trig_revelation", "Déclencheurs", "À la révélation", "four plain rectangles fanned out like a hand of cards", "a rising sun with short rays over a horizon line"),
 ("trig_defense", "Déclencheurs", "En défense", "a round wooden shield with a central boss", "a stone tower gate with a portcullis"),
]
for id, fam, card, x1, x2 in ICONS:
    add("icon_" + id, "Icônes", card + " · " + fam, 0, 1, "Dessin 1", IC.format(x=x1), 1024, 1024)
    add("icon_" + id, "Icônes", card + " · " + fam, 0, 2, "Dessin 2", IC.format(x=x2), 1024, 1024)

SCENES = {"1": ["boardscene_a_v1", "boardscene_b_v2", "boardscene_c_v3"], "2": ["boardscene_d_v1", "boardscene_e_v2", "boardscene_a_v1"]}
if __name__ == "__main__":
    json.dump(A, sys.stdout, ensure_ascii=False, indent=1)
