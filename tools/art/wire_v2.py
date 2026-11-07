#!/usr/bin/env python3
"""Wire the locked v2.0.0 art (homelab #1757) into client/public/cards.

Usage: python3 tools/art/wire_v2.py <v2-dir>
  <v2-dir> holds cartes/*.png (1760x2464, title/text/icons baked in), cartes.csv,
  dos/ (backs + Maître du Vent token), carte/carte_complete.jpg, icones/*.png.

Writes, for every face: /cards/<name>.png (880x1232) + /cards/w440/<name>.webp (440x616),
under the client's art.ts names. Also the backs, the Maître du Vent token (square,
master_of_winds), the full map (map_treasure) + its 4 quarters for the victory overlay
(map_hg/hd/bg/bd), the 4 value icons (discs cropped from the Capitaine face, so they
match the printed cards) and the Retardataire marker (role_retardataire, cream glyph on
an ink disc). Re-runnable; idempotent.
"""
import csv
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "client" / "public" / "cards"

# v2 face (cartes.csv fichier stem) -> client filename (client/src/cards/art.ts).
FACE_TO_NAME = {
    "capitaine": "recruitment_captain",
    "matelot": "recruitment_officer",  # +1 Sabre
    "matelots": "recruitment_quartermaster",  # +2 Sabres
    "navigateur": "recruitment_navigator",  # +1 Voile
    "maitre_voilier": "recruitment_sailmaster",  # +2 Voiles
    "canonnier": "recruitment_gunner",  # +1 Canon
    "maitre_canonnier": "recruitment_master_gunner",  # +2 Canons
    "officier": "recruitment_deckhand",  # +1 Pistolet
    "quartier_maitre": "recruitment_deckhands",  # +2 Pistolets
    "pillage_sabres": "raid_officers",
    "pillage_voiles": "raid_sails",
    "pillage_canons": "raid_canons",
    "pillage_pistolets": "raid_sailors",
    "abordage_1c1_canons_pistolets": "boarding_canons_sailors",
    "abordage_1c1_canons_sabres": "boarding_canons_officers",
    "abordage_1c1_pistolets_voiles": "boarding_sails_sailors",
    "abordage_1c1_pistolets_sabres": "boarding_officers_sailors",
    "abordage_1c1_voiles_sabres": "boarding_officers_sails",
    "abordage_1c1_canons_pistolets_voiles": "boarding_canons_sails_sailors",
    "abordage_1c1_canons_pistolets_sabres": "boarding_canons_officers_sailors",
    "abordage_1c1_canons_voiles_sabres": "boarding_canons_officers_sails",
    "abordage_1c1_pistolets_voiles_sabres": "boarding_officers_sails_sailors",
    "abordage_2c2_canons_voiles": "boarding_team_canons_sails",
    "abordage_2c2_canons_pistolets_voiles": "boarding_team_canons_sails_sailors",
    "abordage_2c2_canons_pistolets_sabres": "boarding_team_canons_officers_sailors",
    "abordage_2c2_voiles_sabres": "boarding_team_officers_sails",
    "coin_hg": "corner_hg",
    "coin_hd": "corner_hd",
    "coin_bg": "corner_bg",
    "coin_bd": "corner_bd",
    "curse_kraken": "curse_release_the_kraken",
    "curse_tourbillon": "curse_whirlpool",
    "curse_ile_brumeuse": "curse_foggy_island",
    "curse_tempete": "curse_tempest_in_a_jar",
    "curse_bateau_fantome": "curse_ghost_ship",
    "talisman_singe_dore": "talisman_golden_monkey",
    "talisman_longue_vue": "talisman_spyglass",
    "talisman_coffre_piege": "talisman_trapped_chest",
    "talisman_bijou_maudit": "talisman_cursed_jewel",
    "talisman_contre_sabres": "talisman_officer_counter_boarding",
    "talisman_contre_voiles": "talisman_sail_counter_boarding",
    "talisman_contre_canons": "talisman_canon_counter_boarding",
    "talisman_contre_pistolets": "talisman_sailor_counter_boarding",
    "maitre_du_vent": "role_master_of_winds",
}

# Value discs on the Capitaine face (1760x2464): centre x, centre y, radius.
CAPTAIN_DISCS = {"sabres": 142, "voiles": 314, "canons": 486, "pistolets": 658}
DISC_X, DISC_R = 156, 76


def save_card(im: Image.Image, name: str, size=(880, 1232)) -> None:
    im = im.convert("RGB")
    im.resize(size, Image.LANCZOS).save(OUT / f"{name}.png", optimize=True)
    half = (size[0] // 2, size[1] // 2)
    im.resize(half, Image.LANCZOS).save(OUT / "w440" / f"{name}.webp", quality=86, method=6)


def disc_mask(size: int) -> Image.Image:
    big = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(big).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    return big.resize((size, size), Image.LANCZOS)


def main(v2: Path) -> None:
    (OUT / "w440").mkdir(parents=True, exist_ok=True)
    (OUT / "icons").mkdir(parents=True, exist_ok=True)
    rows = list(csv.DictReader(open(v2 / "cartes.csv", encoding="utf-8")))
    stems = {Path(r["fichier"]).stem for r in rows}
    missing = stems - FACE_TO_NAME.keys()
    if missing:
        sys.exit(f"unmapped faces: {sorted(missing)}")
    for stem in sorted(stems):
        save_card(Image.open(v2 / "cartes" / f"{stem}.png"), FACE_TO_NAME[stem])

    save_card(Image.open(v2 / "dos" / "dos_evenements.jpg"), "back_events")
    save_card(Image.open(v2 / "dos" / "dos_tresors.jpg"), "back_treasures")

    token = Image.open(v2 / "dos" / "jeton_maitre_du_vent.png").convert("RGBA")
    token.resize((880, 880), Image.LANCZOS).save(OUT / "master_of_winds.png", optimize=True)
    token.resize((440, 440), Image.LANCZOS).save(OUT / "w440" / "master_of_winds.webp", quality=88, method=6)

    full = Image.open(v2 / "carte" / "carte_complete.jpg").convert("RGB")
    save_card(full, "map_treasure")
    w, h = full.size
    quarters = {"hg": (0, 0), "hd": (w // 2, 0), "bg": (0, h // 2), "bd": (w // 2, h // 2)}
    for q, (x, y) in quarters.items():
        save_card(full.crop((x, y, x + w // 2, y + h // 2)), f"map_{q}")

    captain = Image.open(v2 / "cartes" / "capitaine.png").convert("RGBA")
    mask = disc_mask(2 * DISC_R)
    for value, cy in CAPTAIN_DISCS.items():
        disc = captain.crop((DISC_X - DISC_R, cy - DISC_R, DISC_X + DISC_R, cy + DISC_R))
        disc.putalpha(mask)
        disc.resize((160, 160), Image.LANCZOS).save(OUT / "icons" / f"value_{value}.png", optimize=True)

    glyph = Image.open(v2 / "icones" / "role_retardataire.png").convert("LA")
    size = 160
    marker = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ink = Image.new("RGBA", (size, size), (26, 23, 20, 255))
    marker.paste(ink, (0, 0), disc_mask(size))
    g = glyph.resize((104, 104), Image.LANCZOS)
    cream = Image.new("RGBA", g.size, (239, 230, 211, 255))
    marker.paste(cream, (28, 28), g.split()[1])
    marker.save(OUT / "icons" / "role_retardataire.png", optimize=True)
    print(f"wired {len(stems)} faces + backs, token, map, quarters, icons")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
