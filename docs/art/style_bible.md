# À l'abordage — Style Bible

**Version:** 1.1.0 (2026-07-13)
**Status:** FROZEN — any change requires a version bump + changelog entry.
This document is the single visual authority. The Kaggle notebook mirrors
STYLE_PREFIX verbatim; `art_manifest.csv` subject_prompts assume it is prepended.

---

## 1. STYLE_PREFIX (frozen, verbatim)
traditional sumi-e ink painting, bold black ink on warm aged parchment paper, wet ink wash with dry-brush strokes and deliberate ink spatter, centered subject with generous negative space above and below, strictly limited palette of black ink and warm parchment, golden age of piracy, 18th century, playful adventurous tone, borderless full-bleed artwork, pristine, free of any lettering, calligraphy, stamps or seals

Rules:
- Prepended to every subject_prompt by the notebook. Never edited per-row.
- Prompts use color NAMES (FLUX does not parse hex). Hex values below are
  authoritative for the overlay/UI layer only.

## 2. Palette

| Suit / use            | Color      | Hex       | Prompt name        |
|-----------------------|------------|-----------|--------------------|
| Canons                | Vermillion | `#C0432F` | "vermillion red"   |
| Sails (voile)         | Indigo     | `#2E5A88` | "indigo blue"      |
| Officers (sabre)      | Jade       | `#3E7C59` | "jade green"       |
| Sailors (pistolet)    | Plum       | `#6E4A7E` | "plum violet"      |
| Parchment field       | Cream      | `#F2EAD8` | (implicit in prefix) |
| Ink                   | Black      | `#1A1714` | (implicit in prefix) |

## Color doctrine (v1.1.0 — supersedes all per-family color rules in v1.0.0)

**Default: everything is black sumi-e ink on aged parchment.**
Color appears ONLY on suit objects themselves, rendered as those objects:

| Suit object | Color |
|---|---|
| Sails | indigo #2E5A88 |
| Canons | vermillion #C0432F |
| Sabres | jade #3E7C59 |
| Pistols | plum #6E4A7E |

No colored smoke, no ambient washes, no colored splashes, no color accents
anywhere except the objects listed above. Figures, ships' hulls, rigging,
water, ground, sky, architecture: black ink only.

**Applies to**: crew/recruitment, boardings, raids.
**Boarding composition rule**: exactly one boat; all figures inside the
boat; suit-colored objects only.

**Exception 1 — Curses**: black ink shapes plus a splash of the bonus-suit
color, integrated into the ink. Loose/splashed color is EXCLUSIVE to
curses and functions as the curse marker. No other family may splash.

**Exception 2 — Talismans**: monochrome ensō circle; the central object
may carry its natural colors (whatever makes sense for the object).
Everything outside the object is colorless.

**Map**: one single full-bleed nautical chart image (monochrome ink
cartography, one compass rose, content bleeding off all four edges, no
border or frame composition). The four corner card masters are produced
by offline 2× Lanczos upscale + quadrant crop of this single image —
they are not generated individually.

v1.0.0 line "Away Boarding = mix of involved suit colors" is RETIRED.
Approved masters predating v1.1.0 (batch-1 kraken, batch-1 gold-object
talisman) are grandfathered and remain immutable.

## 3. Category visual grammar

| Category      | Grammar |
|---------------|---------|
| Recruitments  | Human figure, near-solid black semi-silhouette, ONE readable feature in negative space (eye, grin, scar). Suit element in suit color, same brush language (colored ink, not flat cutout). Value-2 cards may echo count in art where natural, never forced — overlay pips are the source of truth. |
| Talismans     | Single object centered inside a large hand-brushed ensō circle. Monochrome. Ensō is EXCLUSIVE to talismans. |
| Map Corners   | Aged nautical chart fragment: fine cartographic linework, coastline, compass rose, dotted routes, torn edges. Art bleeds toward the card's named corner (composition exception, §4). Four prompts written as quadrants of one implied chart. |
| Curses        | Scene (kraken, whirlpool, tempest…), one readable feature in negative space where a creature has a face. Bonus-color accent. |
| Raids / Away Boarding | Action scenes, same silhouette rules; colors per §2. |

## 4. Composition rules

- Canvas: 880 × 1232 (5:7 portrait, poker size). Non-negotiable.
- Subject silhouette within central ~70% width.
- Quiet low-ink parchment bands: top ~180px (title + suit pips top-left,
  bonus badge top-right) and bottom ~300px (effect text). Spatter stays in
  the mid-zone.
- **Exception:** Map Corners bleed toward their named corner; their text
  zone stays clear by construction.
- Enforcement is by prompt phrasing + anchor review (diffusion ignores pixel
  specs); violators get seed bumps or prompt rewrites (Stage 5).

## 5. Overlay layer doctrine

All game information (suit pips, values, bonus badge, title, effect text) is
SVG/CSS overlay — NEVER baked into generated PNGs. PNG masters are pure
flavor and immutable once approved.
- Suit pips: brushed-ink glyphs in suit color on parchment roundel, fixed
  top-left band, pip repetition for value (1 icon = 1, 2 icons = 2; Captain
  = four icons, one per suit).
- Bonus badge: bonus suit glyph inside a small ensō-like ring with "+",
  fixed top-right.
- Glyph shapes differ per suit → color-blind safe (double coding with art).

## 6. Interview decisions log

| # | Decision | Ruling |
|---|----------|--------|
| 1 | Mood | Sumi-e black ink on parchment (user reference image) — supersedes A–E ladder |
| 2 | Talisman vs Corner differentiation | Ensō circle vs cartography |
| 3 | Character design | Semi-silhouette, one readable feature in negative space |
| 4 | Iconography | Overlay-only; pips + bonus badge as specced (§5) |
| 5 | Background | Full generated parchment field; legacy background_*.png retired for this game |
| 6 | Composition | Center-weighted, quiet top/bottom bands; Map Corners exception |
| 7 | Ink technique | Wet sumi-e + controlled spatter; colored elements in same brush language |
| 8 | Exclusions | Positive-phrasing table ratified (folded into STYLE_PREFIX) |
| 9 | Curse/Raid coloring | Bonus color as integrated accent, not literal object |
| 10 | Suit mapping | canon→Canons, voile→Sails, sabre→Officers, pistolet→Sailors |

## 7. Known data gaps (blocking Stage 2, not style)

- CSV has no `Picture` column → slug convention to be ratified in Stage 2.
- CSV shows 4× "Raid 1" with empty Bonus; ruling: 8 raids, 2 per suit,
  bonus = second treasure draw. Manifest rows generated from ruling, not CSV.
- Corner assembly into one physical map: assumed YES (quadrant prompts)
  unless overridden.

## 8. Changelog

- **1.1.0** (2026-07-13) — Color doctrine v1.1.0 (§2): black-ink default,
  color restricted to suit objects only; splashed color exclusive to
  Curses; Talisman natural-color exception; single full-bleed map chart
  replaces per-corner generation; Away Boarding suit-color-mix rule
  retired. Batch-1 kraken and gold-object talisman grandfathered.
- **1.0.0** (2026-07-10) — Initial frozen version from Stage 1 interview.
