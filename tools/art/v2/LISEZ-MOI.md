# À l'abordage : illustrations v2 (carte #1757)

Revue interactive : voir le lien sur la carte https://tickets.gosgames.com/tasks/1757

## Dossiers

- `combinees/` : 44 faces × 3 versions = illustration + icônes + mise en page.
- `illustrations/` : les mêmes illustrations sans texte, 1760×2464.
- `icones/v1`, `icones/v2` : 19 icônes, deux dessins (masques PNG). La version 3 est le dessin 1 inversé dans un disque, par le code.
- `dos/` : dos Événements et Trésors × 3 ; jeton Maître du Vent × 3.
- `carte/` : la carte entière × 3, dont les quatre Coins sont les quarts.
- `planches/` : planches de revue, comparaison des graines, tests de modèles.
- `manifest.csv` : pour chaque version, graine, modèle, LoRA et prompt exact. `choix.json` : graine retenue et retouches.

## Les trois versions

| | Illustration | Icônes | Mise en page |
|---|---|---|---|
| 1 | v1 | dessin 1 | A : titre en haut, proche du jeu actuel |
| 2 | v2 | dessin 2 | B : index à gauche, bandeau de titre noir |
| 3 | v3 | dessin 1 en disque | C : cadre encre fin, panneau de texte |

Rien n'est lié : une illustration v1 peut prendre la mise en page B.

## Inventaire : ce que les règles demandent

138 cartes, 43 faces, 2 dos, Maître du Vent (carte + jeton).

### Recrues (9 faces, 76 cartes)

| Carte | Ex. | Valeurs | Bonus |
|---|---|---|---|
| Capitaine | 4 | sabres, voiles, canons, pistolets | - |
| Matelot | 11 | sabres | - |
| Matelots | 7 | sabres, sabres | - |
| Navigateur | 11 | voiles | - |
| Maître Voilier | 7 | voiles, voiles | - |
| Canonnier | 11 | canons | - |
| Maître Canonnier | 7 | canons, canons | - |
| Officier | 11 | pistolets | - |
| Quartier-maître | 7 | pistolets, pistolets | - |

### Pillages (4 faces, 8 cartes)

| Carte | Ex. | Valeurs | Bonus |
|---|---|---|---|
| pillage_sabres | 2 | - | sabres 4+ |
| pillage_voiles | 2 | - | voiles 4+ |
| pillage_canons | 2 | - | canons 4+ |
| pillage_pistolets | 2 | - | pistolets 4+ |

### Abordages (13 faces, 13 cartes)

| Carte | Ex. | Valeurs | Bonus |
|---|---|---|---|
| abordage_1c1_canons_pistolets | 1 | canons, pistolets | voiles 4+ |
| abordage_1c1_canons_sabres | 1 | canons, sabres | pistolets 4+ |
| abordage_1c1_pistolets_voiles | 1 | pistolets, voiles | canons 4+ |
| abordage_1c1_pistolets_sabres | 1 | pistolets, sabres | canons 4+ |
| abordage_1c1_voiles_sabres | 1 | voiles, sabres | canons 4+ |
| abordage_1c1_canons_pistolets_voiles | 1 | canons, pistolets, voiles | sabres 4+ |
| abordage_1c1_canons_pistolets_sabres | 1 | canons, pistolets, sabres | voiles 4+ |
| abordage_1c1_canons_voiles_sabres | 1 | canons, voiles, sabres | pistolets 4+ |
| abordage_1c1_pistolets_voiles_sabres | 1 | pistolets, voiles, sabres | canons 4+ |
| abordage_2c2_canons_voiles | 1 | canons, voiles | pistolets 8+ |
| abordage_2c2_canons_pistolets_voiles | 1 | canons, pistolets, voiles | sabres 8+ |
| abordage_2c2_canons_pistolets_sabres | 1 | canons, pistolets, sabres | voiles 8+ |
| abordage_2c2_voiles_sabres | 1 | voiles, sabres | canons 8+ |

### Coins (4 faces, 20 cartes)

| Carte | Ex. | Valeurs | Bonus |
|---|---|---|---|
| Coin Haut-Gauche | 5 | - | - |
| Coin Haut-Droit | 5 | - | - |
| Coin Bas-Gauche | 5 | - | - |
| Coin Bas-Droit | 5 | - | - |

### Malédictions (5 faces, 10 cartes)

| Carte | Ex. | Valeurs | Bonus |
|---|---|---|---|
| Libérez le Kraken | 2 | - | canons 4+ |
| Tourbillon | 2 | - | pistolets 4+ |
| Île Brumeuse | 2 | - | voiles 4+ |
| Tempête en Bouteille | 2 | - | sabres 4+ |
| Bateau Fantôme | 2 | - | pistolets 4+ |

### Talismans (8 faces, 11 cartes)

| Carte | Ex. | Valeurs | Bonus |
|---|---|---|---|
| Singe Doré | 1 | - | sabres 4+ |
| Longue-vue | 2 | - | - |
| Coffre Piégé | 2 | - | - |
| Bijou Maudit | 2 | - | - |
| talisman_contre_sabres | 1 | sabres | - |
| talisman_contre_voiles | 1 | voiles | - |
| talisman_contre_canons | 1 | canons | - |
| talisman_contre_pistolets | 1 | pistolets | - |

### Icônes (19)

4 valeurs, navire (mode d'abordage), 6 familles (dont abordage et pillage servent aussi de déclencheurs), 2 rôles, trésor, voler, défausser, regarder, révélation, défense.

## Choix de fabrication

- Modèle : FLUX.2 klein 4B base + LoRA abordink s2000, parce que le modèle distillé éclaire les visages et perd la silhouette. Exception : cartes v1 et v3, en distillé, plus denses.
- Encre séparée de son papier, posée sur un parchemin unique : mêmes tons sur tout le jeu.
- Couleurs de valeur verrouillées sur les hex de la bible par le code. Sabres #3E7C59, Voiles #2E5A88, Canons #C0432F, Pistolets #6E4A7E.
- Abordages : scène en noir, gerbes posées par le code d'après le profil exact, donc pas d'erreur de valeur possible.
- Dos : moitié + rotation de 180°, un dos ne marque pas une carte.
- Carte : route et X tracés par le code à travers les quatre quarts.
- Icônes : recette pochoir séparée, bord légèrement irrégulier ajouté par le code, épaissies si besoin pour tenir à 14 px.

## Écarts à la bible à trancher

1. Matelots v3 : deux personnages.
2. Pillages v2 et v3 : couleur dans l'action (tirs, voiles) plutôt qu'une éclaboussure.
3. Abordages 2 c. 2 : scènes à quatre navires en v1 et v2. La v3 garde la scène à deux navires de la règle.
4. Contre-Abordage v3 : corde coupée dans l'image.
5. Dos Trésors v1 : fond noir.
6. Couleurs : hex exacts de la bible, moins vives que les anciens masters.
7. Officier v3 : duelliste femme.
8. Gerbes v2 (chrysanthèmes) : plus denses, plus proches de la fleur que de l'explosion.
9. Talisman, icône v2 : se lit comme une bague.

## Limites connues

- Daltonisme : calcul fait, Voiles et Pistolets sont presque indiscernables en protanopie, Sabres et Canons faibles, et les quatre ont la même clarté. Les icônes portent donc l'information. Pistolets plus clairs et Canons plus vifs aideraient : non appliqué, à décider.
- Résolution : images générées en 1024×1440, agrandies à 1760×2464 par simple rééchantillonnage. Un agrandissement dédié est prévu sur les versions retenues seulement.
- Recherche sur les jeux de pirates et le design de cartes : sources maigres, à prendre comme des pistes.
- Le dos Trésors v3 (coffre coupé puis miroir) et les deux navires tête-bêche du dos Événements v2 sont des paris visuels.
- P10 à P12 attendent toujours les décisions de #1694 et #1742 : les valeurs suivent le code. Les textes viennent du livret #1711.

Les masters du jeu et le client n'ont pas été modifiés.
