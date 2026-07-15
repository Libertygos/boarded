# ART-09 — gate review (18 candidates, doctrine v1.2.0)

Batch of 2026-07-15, kernel v15, Z-Image-Turbo, seeds per `generation_log.csv`.
Doctrine: black sumi-e ink on parchment; recruits = suit element in suit color;
boardings/raids = fully black scene + suit-color **touches** only; talismans =
ensō + naturally-colored object; curses = bonus-suit touch; maps = standalone
monochrome full-bleed treasure maps.

**Pre-screen verdicts** (Claude's flags — the gate ruling is Jules's):

| # | Card | Pre-screen |
|---|------|-----------|
| 1 | recruitment_captain | ✅ (notes: extra red pennant at mast top; left cannon stayed grey) |
| 2 | recruitment_sailmaster | ✅ |
| 3 | recruitment_gunner | ✅ |
| 4 | recruitment_officer | ✅ |
| 5 | recruitment_deckhand | ✅ |
| 6 | talisman_trapped_chest | ✅ |
| 7 | talisman_cursed_jewel | ⚠️ jewel + tendrils read a bit like an insect (legs) |
| 8 | talisman_lucky_coin | ✅ |
| 9 | curse_whirlpool | ✅ |
| 10 | curse_tempest_in_a_jar | ✅ (note: cork rendered natural brown beyond the plum accent) |
| 11 | raid_canons | ✅ |
| 12 | raid_officers | ❌ sea painted jade-mint — colored FIELD, not a touch |
| 13 | raid_sails | ❌ sea painted indigo — colored FIELD, not a touch |
| 14 | raid_sailors | ✅ |
| 15 | boarding_1v1 | ✅ |
| 16 | boarding_2v2 | ✅ |
| 17 | map_treasure_01 | ⚠️ skull motif missing (otherwise clean) |
| 18 | map_treasure_02 | ❌ drawn rectangular border line — breaks full-bleed |

---

## Recruits (frozen prompts)

### 1. recruitment_captain — seed 1001
All four suit colors present (jade saber, plum belt/pistol, vermillion cannon, indigo sail). Notes: a small red pennant tops the mast (not a suit element) and the second cannon stayed grey/ink.
<img src="img/recruitment_captain.png" width="420">

### 2. recruitment_sailmaster — seed 1202 (bump after batch-3 reject)
Two indigo sails, strong stance, clean silhouette.
<img src="img/recruitment_sailmaster.png" width="420">

### 3. recruitment_gunner — seed 1009
Vermillion cannon, kneeling fuse-lighting pose.
<img src="img/recruitment_gunner.png" width="420">

### 4. recruitment_officer — seed 1045
Jade saber, fencing pose.
<img src="img/recruitment_officer.png" width="420">

### 5. recruitment_deckhand — seed 1044
Plum pistol, crouched and alert.
<img src="img/recruitment_deckhand.png" width="420">

## Talismans (ensō + natural-color object)

### 6. talisman_trapped_chest — seed 1011
Wood-and-iron chest with trap teeth, clean ensō.
<img src="img/talisman_trapped_chest.png" width="420">

### 7. talisman_cursed_jewel — seed 1012 ⚠️
Ruby jewel inside the ensō, but the black tendrils read like insect legs (ladybug effect). Reviewer call: charmingly sinister or re-roll.
<img src="img/talisman_cursed_jewel.png" width="420">

### 8. talisman_lucky_coin — seed 1047
Gold skull doubloon, crisp ensō.
<img src="img/talisman_lucky_coin.png" width="420">

## Curses (bonus-suit touch)

### 9. curse_whirlpool — seed 1046
Ink vortex swallowing the ship, jade splash integrated in the swirl.
<img src="img/curse_whirlpool.png" width="420">

### 10. curse_tempest_in_a_jar — seed 1021
Wave and plum lightning inside the jar. Note: natural brown cork (small extra color beyond the plum accent).
<img src="img/curse_tempest_in_a_jar.png" width="420">

## Raids (black fortress assault + one suit's touches)

### 11. raid_canons — seed 1027
Black ship and fortress, vermillion burst in the cannon explosion. Compliant.
<img src="img/raid_canons.png" width="420">

### 12. raid_officers — seed 1028 ❌
Charge and fortress composition is good, but the sea/beach rendered as a jade-mint colored field — v1.2.0 allows touches only. Suggest seed bump + prompt hardening ("the sea in black ink wash").
<img src="img/raid_officers.png" width="420">

### 13. raid_sails — seed 1029 ❌
Ship and fortress fine, but the whole sea is an indigo wash — same violation as #12. Same remedy.
<img src="img/raid_sails.png" width="420">

### 14. raid_sailors — seed 1030
Longboats, fortress towers, plum puffs in the pistol smoke. Compliant.
<img src="img/raid_sailors.png" width="420">

## Boardings (one big black ship + touches)

### 15. boarding_1v1 — seed 1042
One great black ship, two duelists, jade spark at the saber clash + plum burst at the pistol. Compliant.
<img src="img/boarding_1v1.png" width="420">

### 16. boarding_2v2 — seed 1043
Big black ship, four fighters, all four suit touches present as integrated splashes. Compliant.
<img src="img/boarding_2v2.png" width="420">

## Treasure maps (standalone, monochrome, full-bleed)

### 17. map_treasure_01 — seed 1048 ⚠️
Coastline, bay, hatched shorelines, dotted route from ship to bold X — clean full-bleed. The prompted skull motif did not materialize.
<img src="img/map_treasure_01.png" width="420">

### 18. map_treasure_02 — seed 1049 ❌
Archipelago with a proper skull-and-crossbones island and dotted route, but the model drew a rectangular border line around the sheet — breaks the full-bleed rule. Suggest seed bump.
<img src="img/map_treasure_02.png" width="420">
