"""Every distinct card face of À l'abordage (#1757). Counts, values and bonuses from
packages/engine/src/data.ts and the rulebook draft §3; wording from the rulebook draft."""
V = ["sabres", "voiles", "canons", "pistolets"]
LBL = {"sabres": "Sabres", "voiles": "Voiles", "canons": "Canons", "pistolets": "Pistolets"}
ONE = {"sabres": "Sabre", "voiles": "Voile", "canons": "Canon", "pistolets": "Pistolet"}


def recruit(asset, title, n, value, k):
    return dict(key=asset, art=f"recruit_{asset}", family="recrue", title=title, count=n, pips=[value] * k,
                effect=f"+{k} {ONE[value] if k == 1 else LBL[value]}", bonus=None, bonus_text=None)


CARDS = [
    dict(key="capitaine", art="recruit_capitaine", family="recrue", title="Capitaine", count=4, pips=V,
         effect="+1 dans chaque valeur. Un seul Capitaine par navire.", bonus=None, bonus_text=None),
    recruit("matelot", "Matelot", 11, "sabres", 1),
    recruit("matelots", "Matelots", 7, "sabres", 2),
    recruit("navigateur", "Navigateur", 11, "voiles", 1),
    recruit("maitre_voilier", "Maître Voilier", 7, "voiles", 2),
    recruit("canonnier", "Canonnier", 11, "canons", 1),
    recruit("maitre_canonnier", "Maître Canonnier", 7, "canons", 2),
    recruit("officier", "Officier", 11, "pistolets", 1),
    recruit("quartier_maitre", "Quartier-maître", 7, "pistolets", 2),
]
for v in V:
    CARDS.append(dict(key=f"pillage_{v}", art=f"raid_{v}", family="pillage", title="Pillage", count=2, pips=[],
                      effect="Piochez 1 trésor.", bonus=v, bonus_text="Piochez-en 2.", threshold="4+"))

# (profile, bonus, mode) exactly as the rulebook §3.2 table
BOARD = [
    (["canons", "pistolets"], "voiles", "1"), (["canons", "sabres"], "pistolets", "1"),
    (["pistolets", "voiles"], "canons", "1"), (["pistolets", "sabres"], "canons", "1"),
    (["voiles", "sabres"], "canons", "1"), (["canons", "pistolets", "voiles"], "sabres", "1"),
    (["canons", "pistolets", "sabres"], "voiles", "1"), (["canons", "voiles", "sabres"], "pistolets", "1"),
    (["pistolets", "voiles", "sabres"], "canons", "1"), (["canons", "voiles"], "pistolets", "2"),
    (["canons", "pistolets", "voiles"], "sabres", "2"), (["canons", "pistolets", "sabres"], "voiles", "2"),
    (["voiles", "sabres"], "canons", "2"),
]
for p, b, m in BOARD:
    key = f"abordage_{m}c{m}_" + "_".join(p)
    CARDS.append(dict(key=key, art=key, family="abordage", title="Abordage", count=1, pips=p, mode=m, bonus=b,
                      threshold="4+" if m == "1" else "8+",
                      effect=("Désignez un navire : le plus haut total gagne et vole 1 trésor." if m == "1" else
                              "Désignez un partenaire : chaque gagnant vole 1 trésor à un perdant différent."),
                      bonus_text="2 trésors."))

CORNERS = [("hg", "Coin Haut-Gauche"), ("hd", "Coin Haut-Droit"), ("bg", "Coin Bas-Gauche"), ("bd", "Coin Bas-Droit")]
for k, t in CORNERS:
    CARDS.append(dict(key=f"coin_{k}", art="map", crop=k, family="coin", title=t, count=5, pips=[], bonus=None, bonus_text=None,
                      effect="Réunissez les 4 coins différents pour gagner."))

CURSES = [
    ("kraken", "Libérez le Kraken", "canons", "abordage", "Un abordage est lancé : volez 1 Recrue à l'initiateur.", "Volez-en 2."),
    ("tourbillon", "Tourbillon", "pistolets", "revelation", "Événements révélés : chaque autre joueur défausse 1 Recrue de son choix.", "Vous choisissez la Recrue."),
    ("ile_brumeuse", "Île Brumeuse", "voiles", "defense", "Vous êtes en défense : vous vous échappez.", "Volez aussi 1 Recrue à l'initiateur."),
    ("tempete", "Tempête en Bouteille", "sabres", "revelation", "Événements révélés : vous devenez Maître du Vent.", "Piochez aussi 1 trésor."),
    ("bateau_fantome", "Bateau Fantôme", "pistolets", "pillage", "Un autre joueur pille : volez-lui 1 trésor par trésor pioché.", "Volez-en 1 de plus."),
]
for k, t, b, trig, e, bt in CURSES:
    CARDS.append(dict(key=f"curse_{k}", art=f"curse_{k}", family="malediction", title=t, count=2, pips=[], bonus=b,
                      threshold="4+", trigger=trig, effect=e, bonus_text=bt))

TALISMANS = [
    ("singe_dore", "Singe Doré", 1, "Si volé : nommez un coin et un joueur ; s'il le détient, il vous le remet.", "sabres", "Interrogez 2 joueurs."),
    ("longue_vue", "Longue-vue", 2, "Si volé : regardez en secret tous les trésors d'un joueur.", None, None),
    ("coffre_piege", "Coffre Piégé", 2, "Si volé : le voleur défausse 1 de ses Recrues.", None, None),
    ("bijou_maudit", "Bijou Maudit", 2, "Si volé : piochez 1 trésor.", None, None),
]
for k, t, n, e, b, bt in TALISMANS:
    CARDS.append(dict(key=f"talisman_{k}", art=f"talisman_{k}", family="talisman", title=t, count=n, pips=[], bonus=b,
                      threshold="4+" if b else None, trigger="vol", effect=e, bonus_text=bt))
for v in V:
    CARDS.append(dict(key=f"talisman_contre_{v}", art=f"talisman_contre_{v}", family="talisman", title="Contre-Abordage",
                      count=1, pips=[v], bonus=None, bonus_text=None, trigger="vol",
                      effect=f"Si volé : abordez aussitôt qui vous voulez, sur les seuls {LBL[v]}. Ni malédiction, ni bonus."))

assert sum(c["count"] for c in CARDS) == 138, sum(c["count"] for c in CARDS)
assert sum(c["count"] for c in CARDS if c["family"] in ("recrue", "pillage", "abordage")) == 97


# not part of the 138: the role card and its token
EXTRA = [dict(key="maitre_du_vent", art="master_of_winds", family="role", title="Maître du Vent", count=1, pips=[],
              effect="Révèle les événements, choisit en premier, tranche les égalités. Le rôle tourne vers la gauche à chaque manche.",
              bonus=None, bonus_text=None)]
