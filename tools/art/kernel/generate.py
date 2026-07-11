import os
# Keep the HF cache OFF /kaggle/working: that volume is the ~20GB kernel
# output — model weights overflow it (ENOSPC) and bloat the output archive.
os.environ["HF_HOME"] = "/tmp/hf_home"

import csv
import gc
import zipfile
import torch
from diffusers import FluxPipeline

# Mirrored VERBATIM from docs/art/style_bible.md v1.0.0 — do not edit here.
STYLE_PREFIX = "traditional sumi-e ink painting, bold black ink on warm aged parchment paper, wet ink wash with dry-brush strokes and deliberate ink spatter, centered subject with generous negative space above and below, strictly limited palette of black ink and warm parchment, golden age of piracy, 18th century, playful adventurous tone, borderless full-bleed artwork, pristine, free of any lettering, calligraphy, stamps or seals"

MANIFEST = "/kaggle/input/abordage-art-manifest/art_manifest.csv"
OUT_DIR = "/kaggle/working/art"
os.makedirs(OUT_DIR, exist_ok=True)

# ---- FLUX block (disabled: FLUX.1-schnell is gated on HF, needs an authorized token) ----
# pipe = FluxPipeline.from_pretrained(
#     "black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16
# )
# pipe.enable_model_cpu_offload()
#
# MODEL_NAME = "FLUX.1-schnell"
# STEPS = 4
# -----------------------------------------------------------------------------------------

# ---- Z-Image-Turbo fallback (uncomment this block, comment the FLUX block) ----
from diffusers import DiffusionPipeline
pipe = DiffusionPipeline.from_pretrained(
    "Tongyi-MAI/Z-Image-Turbo", torch_dtype=torch.float16,
    trust_remote_code=True,
)
pipe.enable_model_cpu_offload()
MODEL_NAME = "Z-Image-Turbo"
STEPS = 9
# -------------------------------------------------------------------------------

with open(MANIFEST, newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

log_rows = []
for row in rows:
    if row["status"].strip().lower() != "pending":
        continue
    filename = row["filename"].strip()
    seed = int(row["seed"])
    width = int(row["width"])
    height = int(row["height"])
    prompt = f"{STYLE_PREFIX}, {row['subject_prompt']}"
    generator = torch.Generator("cpu").manual_seed(seed)
    print(f"[gen] {filename} seed={seed}", flush=True)
    image = pipe(
        prompt=prompt,
        width=width,
        height=height,
        guidance_scale=0.0,
        num_inference_steps=STEPS,
        generator=generator,
    ).images[0]
    image.save(os.path.join(OUT_DIR, filename))
    log_rows.append([filename, seed, STEPS, MODEL_NAME])
    # Rewrite the log after every image: RAM is borderline with the model
    # offloaded to CPU, and an OOM kill must not erase the record.
    with open("/kaggle/working/generation_log.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "seed", "steps", "model"])
        writer.writerows(log_rows)

# Free the ~12GB pipeline before packaging — the final zip step got
# OOM-killed with the model still resident.
del pipe
gc.collect()
torch.cuda.empty_cache()

log_path = "/kaggle/working/generation_log.csv"

zip_path = "/kaggle/working/art_batch.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for fn in sorted(os.listdir(OUT_DIR)):
        z.write(os.path.join(OUT_DIR, fn), fn)
    z.write(log_path, "generation_log.csv")

print(f"[done] {len(log_rows)} images -> {zip_path}", flush=True)
