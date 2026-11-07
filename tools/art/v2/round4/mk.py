import json
P="abordink, traditional sumi-e ink painting, bold black ink on warm aged parchment paper, wet ink wash with dry-brush strokes and deliberate ink spatter, centered subject with generous negative space above and below, strictly limited palette of black ink and warm parchment, golden age of piracy, 18th century, playful adventurous tone, borderless full-bleed artwork, pristine, free of any lettering, calligraphy, stamps or seals. "
# talismans: the exact skeleton of the validated Contre-Abordage prompts
TAL=", painted as a loose brush wash with a black outline, centred inside one open hand-brushed black ink enso circle whose inside is plain bare parchment, the object big and filling most of the circle. %s the only colour."
G="ochre gold"
T={
"singe_a":"One single complete golden monkey idol statue, the whole statue from its head to its small square plinth, squatting with its hands on its knees, the whole object painted in ochre gold ink"+TAL%G,
"singe_b":"One single golden monkey idol statue sitting upright on a round plinth, its long tail curled around the plinth, a calm round face, the whole object painted in ochre gold ink"+TAL%G,
"longue_a":"One single extended pirate spyglass, three tubes getting thinner from a wide lens end to a small eyepiece, held on a steep diagonal, the whole object painted in ochre gold ink"+TAL%G,
"longue_b":"One single extended pirate spyglass lying on a gentle diagonal with a short carrying cord, a wide lens end and a small eyepiece, the whole object painted in ochre gold ink"+TAL%G,
"coffre_a":"One single treasure chest with its rounded lid open, a row of sharp jagged iron teeth like a bear trap lining the opening, the whole chest painted in warm brown ink, the teeth in black ink"+TAL%"Warm brown",
"coffre_b":"One single treasure chest seen from the front, its lid gaping like a mouth with big jagged teeth on the lid and on the rim, the whole chest painted in warm brown ink, the teeth in black ink"+TAL%"Warm brown",
# back parts, each alone on plain parchment, assembled in code
"helm":"One ship's steering wheel seen perfectly straight on, a round rim with eight spokes ending in turned wooden handles, a hub in the centre, perfectly symmetrical, painted in bold black sumi-e brush strokes, flat frontal view, alone in the centre, plain parchment all around.",
"hooks":"One round heraldic crest in the style of a Japanese kamon: a coiled rope ring with four boarding grappling hooks pointing outward at the four diagonals, perfectly rotationally symmetric, flat bold black ink brush strokes, alone in the centre, plain parchment all around.",
"waves":"A seamless decorative pattern of overlapping concentric wave arcs, the Japanese seigaiha wave pattern, drawn in pale grey ink wash with dry brush, evenly filling the whole surface from edge to edge, flat ornamental woodblock print, no other motif.",
"inkfield":"A full-bleed field of dense black sumi-e ink wash covering the whole surface, rich dark ink with subtle dry-brush streaks and pooled tones, a few lighter brush textures, no motif, no shapes, only black ink.",
"rope":"A rectangular border made of one thick twisted rope drawn in black ink running all around the edge of the picture, rope knots at the four corners, the whole inside empty plain parchment.",
"doubloon":"One large gold doubloon coin seen flat from the front, an old Spanish piece of eight with a cross dividing it into four quarters and small castles and lions in the quarters, the whole coin painted in a flat wash of ochre gold ink with loose black sumi-e brush contours, no metallic sheen, no shading, alone in the centre, plain parchment all around. Ochre gold the only colour.",
"wreath":"One circular wreath made of overlapping gold coins and strings of pearls, a perfectly round ring with an empty centre, the coins painted in a flat wash of ochre gold ink with loose black brush contours, no metallic sheen, alone, plain parchment all around and inside the ring. Ochre gold the only colour.",
}
SQ={"helm","hooks","doubloon","wreath"}
json.dump([{"id":k,"family":"r4","prompt":P+v,"width":1024 if k in SQ else 1024,"height":1024 if k in SQ else 1440} for k,v in T.items()],open('r4/prompts.json','w'),ensure_ascii=False,indent=1)
print(len(T))
