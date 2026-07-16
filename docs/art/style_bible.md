# À l'abordage — Style Bible

**Version:** 1.3.4 (2026-07-16)
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

## Color doctrine (v1.3.0 — supersedes v1.1.0/v1.2.0 per-family rules)

**Default: everything is black sumi-e ink on aged parchment.**
The four value objects are fixed game-wide and each is ALWAYS rendered in
its own suit color; nothing else carries color unless a family rule below
says so:

| Value object | Suit | Color |
|---|---|---|
| Guns (pistols) | Sailors | plum #6E4A7E |
| Sails | Sails | indigo #2E5A88 |
| Cannons | Canons | vermillion #C0432F |
| Swords (sabres) | Officers | jade #3E7C59 |

Figures, ships' hulls, rigging, water, ground, sky, architecture: black
ink only.

**Recruits** — exactly ONE human silhouette per card, never more, posed
with gravitas (no comedic pose). Single-value recruits bear exactly ONE
object of their value; double-value recruits exactly TWO objects of the
same value; objects in the value's color, silhouette otherwise black.
**Captain exception (v1.3.1)**: black silhouette bearing all FOUR value
objects, one per suit, each large and clearly visible in its suit color
(saber jade, pistol plum, cannon vermillion, sail indigo). The v1.3.0
splashes-only rule is retired after the ART-12 gate.

**Raids** — one scene concept for all four cards: a ship near a fortified
city on an island. Black ink + parchment only, plus splashes of the card's
value color around the boat. No color splashes in the sea. Compositions
may vary slightly but stay clearly the same scene.

**Away Boardings (v1.3.4)** — every boarding card shows the SAME scene:
two ships locked in battle, pirate silhouettes swinging on ropes from one
boat to the other, all in black ink. The scene does not change between
1v1 and 2v2. Per card, small bursts of colored ink ("little explosions")
mark the card's value profile — one burst color per value in the profile
(10 distinct profiles → 10 masters shared by the 13 cards). The v1.3.0
colorless one-ship/two-ship pair is retired.

**Curses** — black ink scene plus a splash of the bonus-suit color,
integrated into the ink. Loose/splashed color otherwise remains EXCLUSIVE
to curses (the captain's four-color splash and the raid splashes are the
ratified v1.3.0 exceptions).

**Talismans** — single object centered in a large hand-brushed ensō
circle; deliberately stylized brushwork, dialed BELOW the near-realistic
rendering of ART-09..11 output. Classic talismans (spyglass, trapped
chest, cursed jewel, golden monkey): muted natural color on the object
allowed. Counter-boarding talismans: ONLY the value object itself — no
ship, no scene — painted in its value's color.

**Treasure map** — standalone full-bleed treasure map occupying the
entire card, no lettering. Density ruling (v1.3.2): ~60% of the surface
covered in land — islands, palms, jungle, volcanoes, skull rocks and
markers — the remaining water filled with small wave marks; nothing may
feel empty. Model-drawn border lines are tolerated and cropped in-game.
Color ruling (v1.3.3, from Jules's vintage-map references): the map
carries ONE color — a vermillion red dashed treasure route ending at a
vermillion red X; the route must touch at least two corners of the card
and the X sits in exactly one corner. Everything else black ink.
Seven candidate prompts/seeds are generated; exactly one master is kept.

**Card backs** — one events back (recruits + raids + boardings) and one
treasures back. Symmetric/ornamental, unmistakably card backs, no scene
illustration. Events back may carry the four value-object emblems in
their suit colors; treasures back stays monochrome.

**Master of Winds** — single illustration used on both faces, ornamental
card-back treatment, monochrome black ink.

Approved masters predating v1.3.0 are grandfathered and remain immutable
unless Jules explicitly re-opens them.

## 3. Category visual grammar

| Category      | Grammar |
|---------------|---------|
| Recruitments  | Human figure, near-solid black semi-silhouette, ONE readable feature in negative space (eye, grin, scar). Suit element in suit color, same brush language (colored ink, not flat cutout). Value-2 cards may echo count in art where natural, never forced — overlay pips are the source of truth. |
| Talismans     | Single object centered inside a large hand-brushed ensō circle, stylized brushwork (realism dialed down per v1.3.0). Ensō is EXCLUSIVE to talismans. |
| Treasure Map  | Standalone full-bleed monochrome treasure map (island, volcano, dotted route ship→X, compass rose, sea monster, wave marks — sumi-e, never cartoon). No border, no lettering. |
| Curses        | Scene (kraken, whirlpool, tempest…), one readable feature in negative space where a creature has a face. Bonus-color accent. |
| Raids / Away Boarding | Action scenes, same silhouette rules; colors per §2 (boardings colorless). |
| Card Backs / Master of Winds | Symmetric ornamental designs, no scene, per §2. |

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

- **1.3.4** (2026-07-16) — Jules's evening rulings: boardings redone —
  one shared two-ship rope-boarding scene for all 13 cards, with per-card
  value-color ink bursts (10 profile masters; colorless 1v1/2v2 pair
  retired). Treasure map: candidate #5's three-corner route layout
  ratified as the base; rework with more landmass and fewer skulls/odd
  elements (3 candidates, seeds 1370-72).

- **1.3.3** (2026-07-16) — ART-14 gate: everything validated except the
  treasure maps. Map family re-specced from Jules's vintage-map
  references: red dashed route + red X as the map's only color, route
  through ≥2 corners, X in exactly one corner; 7 candidates generated
  (map_treasure_01..07), one to keep. Captain, golden monkey and both
  card backs approved (31/33 masters committed).
- **1.3.2** (2026-07-16) — ART-13 gate rulings: treasure maps must be
  dense (~60% land: islands/trees/skulls; waves everywhere else, never
  empty) and their drawn borders are cropped in-game rather than fought
  in the prompt; golden monkey must read as a drawing, not a photo;
  card-back prompts may not contain playing-card vocabulary (the "no
  spades no clubs" phrasing planted literal card faces in ART-13) —
  described as ornamental woodblock-style ink panels instead. 7 more
  masters approved (27/33).
- **1.3.1** (2026-07-16) — ART-12 gate rulings from Jules: captain carries
  all four value objects again (large, suit-colored) instead of abstract
  splashes; golden monkey must read as a gold statue; trapped chest must
  show its trap teeth inside a complete ensō; treasure maps must fill all
  four corners with illustrations and carry no border; card backs may not
  use classic playing-card pips. 20 ART-12 masters approved and committed
  under client/public/cards/ (plain git, no LFS — ruling supersedes the
  LFS plan).
- **1.3.0** (2026-07-16) — ART-12 full-batch rulings from Jules: recruits
  strictly ONE silhouette with gravitas (captain = four-color splashes, no
  value objects; single-value = 1 object, double-value = 2 objects); raid
  scene fixed (ship near fortified island city, value-color splashes
  around the boat only, none in the sea); boardings pure black (color in
  post; 1v1 = one ship, 2v2 = two ships); talisman realism dialed down;
  counter-boarding talismans = lone value object in suit color; treasure
  map = 2 standalone full-bleed monochrome candidates (1 kept); new
  categories: events/treasures card backs (ornamental, no scene) and
  Master of Winds (ornamental, both faces). "Value object" vocabulary
  ratified: guns/sails/cannons/swords.
- **1.2.0** (2026-07-14, recorded retroactively — ratified during the
  ART-09..11 M900 gate reviews) — boardings/raids = fully black scene +
  suit-color touches; maps = standalone monochrome full-bleed treasure
  maps (map_treasure_01/02) replacing the quadrant-crop plan; talisman =
  ensō + naturally-colored object.
- **1.1.0** (2026-07-13) — Color doctrine v1.1.0 (§2): black-ink default,
  color restricted to suit objects only; splashed color exclusive to
  Curses; Talisman natural-color exception; single full-bleed map chart
  replaces per-corner generation; Away Boarding suit-color-mix rule
  retired. Batch-1 kraken and gold-object talisman grandfathered.
- **1.0.0** (2026-07-10) — Initial frozen version from Stage 1 interview.
