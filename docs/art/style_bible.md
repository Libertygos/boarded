# À l'abordage — Style Bible

**Version:** 1.0.0 (2026-07-10)
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

Color assignment by category:
- **Recruitments:** the suit element(s) in the illustration painted in suit
  color, "as the only colored element". Captain: all four (one element each).
- **Curses / Raids:** bonus suit color as an integrated ink ACCENT (spray,
  mist, wash) — never a forced literal object.
- **Away Boarding:** mix of the 2–3 involved suit colors as accents.
- **Talismans / Map Corners:** pure black ink, zero accent color.

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

- **1.0.0** (2026-07-10) — Initial frozen version from Stage 1 interview.
