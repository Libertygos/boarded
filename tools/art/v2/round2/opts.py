# Round 2 options per redone asset, first one = default in the deck
g = lambda n, s: f'r2/gen/{n}/s{s}'
OPTS = {
 'canonnier': [('d_canonnier', 0, {}), ('canonnier_a', 30068, {}), ('canonnier_a', 22149, {})],
 'matelots': [('e_matelots', 4186, {}), ('e_matelots', 4203, {}), ('e_matelots', 4220, {})],
 'curse_bateau_fantome': [('fantome_a', 21938, {'ghost': (.70, .42)}), ('fantome_b', 21939, {'ghost': (.68, .7)}), ('fantome_b', 29858, {'ghost': (.70, .7)})],
 'curse_ile_brumeuse': [('brume_a', 21731, {}), ('brume_b', 29651, {}), ('brume_b', 21732, {})],
 'curse_tempete': [('tempete_a', 21948, {}), ('tempete_a', 29867, {}), ('tempete_b', 29868, {})],
 'maitre_du_vent': [('e_vent', 3775, {}), ('e_vent', 3758, {}), ('vent_a', 29556, {})],
 'talisman_singe_dore': [('singe_b', 29646, {}), ('singe_a', 21726, {}), ('e_singe', 3830, {})],
 'talisman_longue_vue': [('longue_c', 41065, {}), ('longue_c', 41052, {}), ('longue_c', 41026, {})],
 'talisman_coffre_piege': [('coffre_a', 29740, {}), ('coffre_a', 21821, {}), ('coffre_b', 21822, {})],
 'talisman_bijou_maudit': [('bijou_a', 21729, {}), ('bijou_b', 29649, {}), ('bijou_a', 29648, {})],
}
