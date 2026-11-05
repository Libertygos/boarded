# Art tools: the sumi-e style on the image station

The style authority is `docs/art/style_bible.md`; the 40 masters in `client/public/cards/` are
never modified. New art is generated on the image station (homelab
`docs/specs/image-station.md`), driven from the M900 by homelab's `scripts/imagegen`. The old
Kaggle pipeline (`kernel/`, `dataset/`) is dormant (dead key since 2026-07-16).

## The recipe (abordink LoRA v1, homelab #1699)

- Model: FLUX.2 klein 4B distilled (Apache-2.0), 4 steps; cards at 1024x1440 (5:7),
  board pieces at any size (1536x1024 tested).
- LoRA: `abordink`, trained with ai-toolkit on FLUX.2 klein 4B base, on 34 of the 40 masters
  (`lora/captions/`, `lora/abordink-klein4b.yaml`: 2000 steps, rank 16, lr 1e-4, 1 h 55 on the
  RTX 5070). Only 4 of the 10 boarding images are in the set, so that one scene does not
  dominate. File: file bank
  `jules/gosgames/game-art-masters/boarded/lora/abordink-klein4b-v1.safetensors`
  (sha256 `418eaaa5…2d2742`), installed on the station as
  `models/loras/abordink-klein4b-s2000.safetensors` (step 1250 also installed as `-s1250`).
- **Strength 1.0, with the style prefix.** Prompt shape:

  `abordink, traditional sumi-e ink painting, bold black ink on warm aged parchment paper, wet
  ink wash with dry-brush strokes and deliberate ink spatter, golden age of piracy, 18th
  century, playful adventurous tone. <subject: the figure or object, the value object and its
  colour (jade green / indigo blue / vermillion red / plum violet), "the X the only colour",
  framing>. No text, no lettering, no frame.`

- Run: `scripts/imagegen run --workflow flux2-klein-4b --lora abordink-klein4b-s2000.safetensors:1.0
  --prompt "..." --seed N --width 1024 --height 1440 --out DIR` (homelab clone).
- `manifest.csv`: every image generated, with its prompt, seed, LoRA and weight.

What the LoRA does (test sheet: file bank `jules/boarded/1699-style-lora/`): figures become
solid black silhouettes with one readable eye, the parchment and spatter match the set, the
seal stamps the base model adds disappear; board pieces get the heavy brushed ink of the card
backs. 1.5 adds little over 1.0.

Known limits of v1:
- Its indigo is deeper than the masters' lighter sail blue; say "light indigo blue" if needed.
- One seed in three of the Navigateur test drew a second figure; generate 2–3 seeds and pick.
