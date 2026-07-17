# progress_home.md — À l'abordage front-end / theme integration session

> **Resume protocol**: read this file top to bottom, then `progress_theme.md` (art handoff,
> card→image mapping tables — AUTHORITATIVE), `progress_gradi.md` (game MVP handoff) and
> `docs/art/style_bible.md` v1.3.6. Continue at the first unchecked item in "Status
> checklist". Commit + push regularly (target branch: **main**, per Jules) and update this
> file in the same commits.

## Mission (Jules, 2026-07-17)

All 42 art masters are in `client/public/cards/`. This session: make the front end
**professional** — landing page, room/lobby, and game view themed like the other gosgames
tenants (war-of-guilds, Pantheons quality bar), with the card art fully integrated.
The game logic/rooms/Colyseus layer is DONE (progress_gradi.md) — do not touch the engine
or server protocol.

Jules's specific instructions:
- Landing page + room system + game with Colyseus — already implemented; this pass is visual.
- **Value logos (canons, pistolets/guns, sabres/swords, voiles/sails): crop them from
  `back_events.png`** (the events card back carries the four suit emblems in their colors).
- Don't ask his opinion unless critical. Push to main when done.

## Key facts (read progress_theme.md for the full tables)

- Art masters: `client/public/cards/*.png`, 880×1232, IMMUTABLE. Map card→image **by
  granted VALUES, not by filename** (filenames use role names that differ from engine roles).
- Overlay doctrine (style bible §5): all game info (pips, bonus badge, title, effect text)
  is overlay — never in the PNG. Quiet bands: top ~180px, bottom ~300px of 1232.
- Palette: canons `#C0432F`, voiles `#2E5A88`, sabres `#3E7C59`, pistolets `#6E4A7E`,
  parchment `#F2EAD8`, ink `#1A1714`.
- Suit translation for filenames: sailors=pistolets, officers=sabres, sails=voiles, canons=canons.
- Contre-abordage IS suit-specific in the engine (`talisman-contre-abordage-<value>`, value field)
  → `talisman_<canon|sail|officer|sailor>_counter_boarding.png`.
- Client theming surface: `client/src/index.css`. Cards were text tiles in
  `client/src/screens/GameView.tsx` (eventLabel/treasureLabel).

## Decisions taken this session (flag to Jules at the end)

1. **Corner cards** (open decision in progress_theme.md): full `map_treasure.png` on every
   corner card + a corner-highlight overlay (suit-free vermillion ring/glow on the named
   corner + corner label). Chosen over quadrant-crops because the map master is one
   cohesive composition; quadrant crops would leave 3 cards without the red X and break
   the ~60%-land density ruling. Easy to revisit — it's one branch in CardImage.
2. **Value icons**: cropped from `back_events.png` into
   `client/public/cards/icons/value_<value>.png` (new files; masters untouched) — per
   Jules's instruction. Used for pips, bonus badges, ship value rows, landing.
3. **In-game image weight**: downscaled WebP variants generated once with ImageMagick and
   COMMITTED under `client/public/cards/w440/` (440×616). Committed rather than build-time
   because the Docker build has no image tooling and masters stay the source of truth.
   `CardImage` uses `<picture>`/srcset: w440 webp for in-game sizes, master PNG as fallback / zoom.

## Status checklist

- [ ] Read handoffs + client code; write this file
- [ ] Crop 4 value icons from back_events.png (ImageMagick, new files under icons/)
- [ ] Art resolver `client/src/cards/art.ts` (+ node --test unit tests vs the mapping tables)
- [ ] CardImage component (art + overlay: pips, bonus badge, title, effect text, backs,
      corner highlight, text fallback)
- [ ] GameView integration (event row, treasure hand, piles + backs, Master of Winds marker,
      prompts with card art, longue-vue modal, discard)
- [ ] Theme pass index.css (parchment/ink, fonts, landing hero, lobby, game board)
- [ ] WebP w440 variants generated + committed
- [ ] Typecheck + build + tests green; push to main

## Work log

- **2026-07-17 (this session)**: Session start. Read progress_theme.md / progress_gradi.md /
  style_bible.md / client+engine sources. Switched from stale art branch to main (art
  branches are historical; main has everything). Plan + decisions above.
