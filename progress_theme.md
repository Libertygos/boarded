# progress_theme.md — À l'abordage art integration (next session handoff)

> **Resume protocol**: read this file top to bottom, then `progress_gradi.md` (game MVP
> handoff) and `docs/art/style_bible.md` v1.3.6 (visual authority). Continue at the first
> unchecked item in "Status checklist". Commit + push regularly and update this file in
> the same commits.

## Mission

The game (engine + server + client) is implemented and the FULL card art set is final.
This session's job: **integrate the art into the client** — a CardImage component with
the SVG/CSS overlay layer (pips, bonus badge, title, effect text), themed UI — and
leave the game visually complete.

## What is DONE — do not redo

- **Game MVP** (see `progress_gradi.md`): engine (packages/engine, pure rules, 13 tests
  green), Colyseus server, React client with landing/lobby/game screens. Cards render
  as text tiles in `client/src/screens/GameView.tsx` (`eventLabel`/`treasureLabel`) —
  that is the integration point.
- **All 42 art masters, final and Jules-approved**, in `client/public/cards/` (880×1232
  PNG, 5:7 poker). Immutable — NEVER regenerate or edit them. Served by Vite at
  `/cards/<name>.png`.
- **Art pipeline** (GitHub Actions → Kaggle, `kaggle-art-batch.yml`): dormant. Only
  needed if NEW cards are designed. Docs: `pipeline_kaggle_turbo.me`, review galleries
  ART-12..17 on branch `art-review-09`.

## Card → image mapping (AUTHORITATIVE — map by VALUE, not by filename)

⚠️ The art filenames use role names that DIFFER from gameplay.md §3 / engine
`data.ts` role→value assignments (a known open item, gameplay.md §14). Every image
shows the CORRECT objects in the CORRECT suit colors — so always key art off the
card's **granted values**, per this table:

| Engine recruit kind | grants | image |
|---|---|---|
| capitaine | 1 of each | `recruitment_captain.png` |
| maitre-voilier | 2 voiles | `recruitment_sailmaster.png` |
| maitre-canonnier | 2 canons | `recruitment_master_gunner.png` |
| quartier-maitre | 2 pistolets | `recruitment_deckhands.png` (named "deckhands", shows 2 plum pistols) |
| matelots | 2 sabres | `recruitment_quartermaster.png` (named "quartermaster", shows 2 jade sabers) |
| matelot | 1 sabre | `recruitment_officer.png` (named "officer", shows 1 jade saber) |
| navigateur | 1 voile | `recruitment_navigator.png` |
| officier | 1 pistolet | `recruitment_deckhand.png` (named "deckhand", shows 1 plum pistol) |
| canonnier | 1 canon | `recruitment_gunner.png` |

Boardings — one shared two-ship scene per **value profile** (13 cards → 10 images);
translate suits as sailors=pistolets, officers=sabres, sails=voiles:

| Engine profile | image |
|---|---|
| canons+pistolets | `boarding_canons_sailors.png` |
| canons+sabres | `boarding_canons_officers.png` |
| voiles+pistolets | `boarding_sails_sailors.png` |
| sabres+pistolets | `boarding_officers_sailors.png` |
| sabres+voiles | `boarding_officers_sails.png` |
| canons+voiles | `boarding_canons_sails.png` |
| canons+voiles+pistolets | `boarding_canons_sails_sailors.png` |
| canons+sabres+pistolets | `boarding_canons_officers_sailors.png` |
| canons+sabres+voiles | `boarding_canons_officers_sails.png` |
| sabres+voiles+pistolets | `boarding_officers_sails_sailors.png` |

Raids (8 cards, 2 per suit → 4 images): `raid_canons.png`, `raid_sails.png` (voiles),
`raid_officers.png` (sabres), `raid_sailors.png` (pistolets).

Curses: kraken→`curse_release_the_kraken.png`, tourbillon→`curse_whirlpool.png`,
ile-brumeuse→`curse_foggy_island.png`, tempete→`curse_tempest_in_a_jar.png`,
bateau-fantome→`curse_ghost_ship.png`.

Talismans: singe-dore→`talisman_golden_monkey.png`, longue-vue→`talisman_spyglass.png`,
coffre-piege→`talisman_trapped_chest.png`, bijou-maudit→`talisman_cursed_jewel.png`,
contre-abordage→`talisman_<suit>_counter_boarding.png` (canon/sail/officer/sailor —
if the engine's Contre-Abordage cards are not suit-specific, pick one or rotate; check
`data.ts` and decide with Jules).

Map corners (20 cards, 4 distinct HG/BG/HD/BD): master is `map_treasure.png` (single
full-bleed map, red dashed route through three corners, one red X top-right).
**OPEN DECISION**: quadrant-crop per corner card (historic plan, style bible v1.1.0)
vs. full map on every corner card with a corner-highlight overlay. Ask Jules.

Backs & role: `back_events.png` (recruits+raids+boardings deck), `back_treasures.png`
(treasure deck), `master_of_winds.png` (role card, same image both faces).

## Overlay layer doctrine (style bible §5 — game info is NEVER in the PNG)

- Suit pips: brushed-ink glyphs in suit color on a parchment roundel, top-left band;
  pip count = value (captain: four pips, one per suit). Glyph SHAPES differ per suit
  (color-blind safety).
- Bonus badge: bonus-suit glyph in a small ensō ring with "+", top-right.
- Title + effect text: quiet bands reserved in the art — top ~180px, bottom ~300px
  (of 1232). Map/backs have no bands (full-bleed, no overlay except maybe corners).
- Palette (overlay/UI hex, authoritative): Canons vermillion `#C0432F`, Voiles indigo
  `#2E5A88`, Sabres jade `#3E7C59`, Pistolets plum `#6E4A7E`, parchment `#F2EAD8`,
  ink `#1A1714`.
- All client theming lives in `client/src/index.css` (single theming surface).

## Suggested implementation order

1. `CardImage` component (art + overlay skeleton, text fallback while loading);
   value-based art resolver module (pure function card→image path, unit-testable
   against the tables above).
2. Suit pip glyphs + bonus badge as inline SVG (4 distinct shapes).
3. Replace text tiles in GameView (event row, treasure hand, log thumbnails);
   card-back rendering for face-down piles; Master of Winds marker.
4. Corner-card treatment (after Jules's quadrant-vs-full decision).
5. Parchment/ink UI theme pass on index.css (landing, lobby, gameroom).
6. Perf: preload the 42 PNGs (~60MB total — consider generating downscaled webp
   variants at build time for in-game use; masters stay untouched).

## Status checklist — ALL DONE 2026-07-17, see progress_home.md for the session log

- [x] Read this file + progress_gradi.md + style_bible.md
- [x] Art resolver module with unit tests (value-based mapping above)
- [x] CardImage + overlay (pips, badge, title, effect text)
- [x] GameView integration (events, treasures, piles, role marker)
- [x] Corner-card decision + implementation (full map + vermillion corner ring — taken
      without Jules per his "don't ask unless critical"; flagged for review in progress_home.md)
- [x] UI theme pass (index.css)
- [x] Image weight optimization (committed w440 webp variants, masters untouched)
- [x] Typecheck + build + visual smoke green; pushed

## Work log

- **2026-07-16/17 (art sessions, ART-12..17)**: full 33-face set + 2 backs + role card
  generated via GitHub Actions → Kaggle pipeline, gated by Jules over 6 review
  galleries; final treasure map generated externally (ChatGPT Images) and installed
  at 880×1232. All masters in `client/public/cards/`, everything merged to main.
