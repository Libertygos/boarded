#!/usr/bin/env python3
"""abordink LoRA v1 test round (homelab #1699).

Three subjects, each without the LoRA and with it at 1.0 and 1.5, on FLUX.2 klein 4B
distilled (homelab's `flux2-klein-4b` workflow + `--lora`):
  A. in the training set: the Navigateur recruit (fidelity, next to its master);
  B. a new card subject: a pirate cook recruit;
  C. a board element: a game board panel.
Usage: lora_test_round1.py <homelab clone> <out dir> [lora file on the station]
Appends one row per image to tools/art/manifest.csv.
"""
import csv
import os
import subprocess
import sys

HOMELAB, OUT = sys.argv[1], sys.argv[2]
LORA = sys.argv[3] if len(sys.argv) > 3 else "abordink-klein4b-s2000.safetensors"
HERE = os.path.dirname(os.path.abspath(__file__))
PREFIX = ("traditional sumi-e ink painting, bold black ink on warm aged parchment paper, wet ink wash "
          "with dry-brush strokes and deliberate ink spatter, golden age of piracy, 18th century, "
          "playful adventurous tone. ")
SUBJECTS = [
    ("A-navigateur", 1024, 1440,
     "a lone pirate navigator standing beside a tall staff bearing one billowing indigo blue square "
     "sail, black silhouette with a tricorne hat, the sail the only colour, full figure, centered."),
    ("B-cuisinier", 1024, 1440,
     "a lone pirate ship's cook standing with a big ladle, black silhouette with a headscarf and an "
     "apron, one copper cooking pot at his feet, the pot the only colour, full figure, centered."),
    ("C-plateau", 1536, 1024,
     "a game board panel seen from directly above, an ornamental border of brushed rope and waves, "
     "four empty card-sized rectangular frames in a row across the middle, a compass rose in the "
     "lower right corner, small islands and wave marks in the background."),
]
SEED = 11
VARIANTS = [("base", None), ("lora1.0", 1.0), ("lora1.5", 1.5)]

os.makedirs(OUT, exist_ok=True)
rows = []
for name, w, h, subject in SUBJECTS:
    for tag, weight in VARIANTS:
        trig = "abordink, " if weight else ""
        prompt = trig + PREFIX + subject + " No text, no lettering, no frame."
        stem = f"{name}-{tag}"
        cmd = [f"{HOMELAB}/scripts/imagegen", "run", "--workflow", "flux2-klein-4b", "--prompt", prompt,
               "--seed", str(SEED), "--width", str(w), "--height", str(h), "--name", stem, "--out", OUT]
        if weight:
            cmd += ["--lora", f"{LORA}:{weight}"]
        before = set(os.listdir(OUT))
        subprocess.run(cmd, check=True)
        new = sorted(f for f in set(os.listdir(OUT)) - before if f.endswith(".png"))
        final = f"{stem}.png"
        os.replace(os.path.join(OUT, new[0]), os.path.join(OUT, final))
        side = os.path.join(OUT, new[0][:-4] + ".json")
        if os.path.exists(side):
            os.replace(side, os.path.join(OUT, f"{stem}.json"))
        rows.append([final, "lora_test_round1", "flux-2-klein-4b", LORA if weight else "", weight or "",
                     SEED, f"{w}x{h}", prompt])

man = os.path.join(HERE, "manifest.csv")
new_file = not os.path.exists(man)
with open(man, "a", newline="") as f:
    wr = csv.writer(f)
    if new_file:
        wr.writerow(["file", "round", "model", "lora", "weight", "seed", "size", "prompt"])
    wr.writerows(rows)
print("\n".join(r[0] for r in rows))
