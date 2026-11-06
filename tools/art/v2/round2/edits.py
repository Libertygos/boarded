#!/usr/bin/env python3
"""Round 2 reference edits (#1757): keep a picked image, change one thing. Run from the scratchpad."""
import glob, json, os, subprocess, sys
sys.path.insert(0, '.')
import plates
from PIL import Image
HL = os.path.expanduser('~/git-projects/homelab-day-1106')
CH = json.load(open('choice.json'))
def raw(vid):
    c = CH.get(vid, {})
    return os.path.abspath(c.get('file') or plates.src('gen', vid, c.get('seed')))
# the dragon: a crop of the raw map, patched back later
m = Image.open(raw('map_v3')).convert('RGB'); w, h = m.size
box = (int(.60 * w), int(.62 * h), w, h); m.crop(box).resize((1024, 1024 * (box[3]-box[1]) // (box[2]-box[0])), Image.LANCZOS).save('r2/ref/dragon_crop.png')
json.dump(box, open('r2/ref/dragon_box.json', 'w'))
dw, dh = Image.open('r2/ref/dragon_crop.png').size
E = {
 'e_matelots': (raw('recruit_matelot_v3'), 'Keep this exact style, ink, paper and the same sailor. Show two of these sailors side by side, the same size, each with one curved jade green cutlass resting on the shoulder and a rope coil, both whole from head to feet, not touching, same ground strokes, plain parchment background, no text.', 1024, 1440),
 'e_canonnier': (raw('recruit_maitre_canonnier_v3'), 'Keep this exact style, ink, paper and the same man seen from behind. Remove the cannon on the left and the linstock in the left hand: there is exactly one red cannon, on the right, and one linstock. His left arm hangs at his side. Same ground strokes, plain parchment background, no text.', 1024, 1440),
 'e_singe': (os.path.abspath('r2/ref/old_singe.png'), 'Keep this exact composition: a golden monkey statue seated on a small plinth inside a black ink enso circle on parchment. Redraw it sharper and richer: a complete statue in solid polished gold from head to toe, finely shaded with crisp black ink contours, slightly larger in the circle, not touching the ring, keep the brushed ink ring, no text.', 1024, 1440),
 'e_vent': (raw('master_of_winds_v1'), 'Keep this exact black ink compass rose medallion, same style and paper. Remove the two cloud faces and every face on the sides. Instead, long swirling gusts of wind in black brush strokes spiral around the compass and stream away on both sides, curled wind scrolls and flying spray. No faces, no characters, no text.', 1024, 1440),
 'e_dragon': (os.path.abspath('r2/ref/dragon_crop.png'), 'Keep this exact engraved map style, the same hills, palm trees and paper, in the same places. Replace the malformed creature with one single well-drawn sea serpent with exactly one head, one neck and one scaled coiled body, an elegant classic map monster, mouth open, the head high up where the top head was, in the same fine black engraved cross-hatching. No second head, no text.', dw, dh),
}
for k, (ref, pr, wd, ht) in E.items():
    for i in range(4):
        seed = 3100 + 17 * i + sum(map(ord, k))
        d = f'r2/gen/{k}/s{seed}'
        if glob.glob(d + '/*.png'): continue
        os.makedirs(d, exist_ok=True)
        r = subprocess.run([f'{HL}/scripts/imagegen', 'run', '--workflow', 'flux2-klein-4b-edit', '--image', ref, '--prompt', pr, '--seed', str(seed),
                            '--width', str(wd), '--height', str(ht), '--out', os.path.abspath(d)], cwd=HL, capture_output=True, text=True)
        print(k, seed, r.returncode, r.stderr[-200:] if r.returncode else '', flush=True)
print('EDITSDONE', flush=True)
