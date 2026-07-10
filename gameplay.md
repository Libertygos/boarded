# À l'abordage — gameplay.md (Source of Truth V1)

> This document is the single source of truth for all game rules and behavior.
> Any commit touching observable behavior MUST update this file in the same commit.
> The card inventory in `cards.csv` is authoritative for counts and card data.
> The legacy rules text (physical prototype) is OBSOLETE where it conflicts with this file.

---

## 1. Game identity

- **Name**: À l'abordage
- **Players**: 2–4 (4 is the reference configuration)
- **Duration**: ~20 minutes
- **Genre**: Card drafting / take-that, treasure race
- **Goal**: Be the first ship to hold all **4 distinct map corners**.

---

## 2. Components

| Deck | Count | Composition |
|------|-------|-------------|
| Event deck | **97** | 76 Recruitments, 13 Boardings, 8 Raids |
| Treasure deck | **41** | 20 Map Corners (5× each of 4 corners), 10 Curses, 11 Talismans |
| Master of the Wind token | 1 | Role marker |

> Legacy rules text said 104 events / 40 treasures — stale, superseded by CSV.

---

## 3. Ship values

Every ship (player) has four crew values, all starting at 0:

| Value | Icon asset (current) | Legacy name |
|-------|----------------------|-------------|
| **Sabres** | `icon_deckhand.png` | mousses |
| **Voiles** | `icon_sail.png` | voiles |
| **Canons** | `icon_canon.png` | canons |
| **Pistolets** | `icon_officer.png` | lieutenants |

- Values come exclusively from Recruitment cards in the player's crew.
- Crew is **public information** at all times.
- ⚠️ Asset filenames still use legacy names (`icon_officer`, `icon_deckhand`). Rename is a design-phase task; the mapping above is normative until then.

### Recruitment card values

| Card | Count | Grants |
|------|-------|--------|
| Capitaine | 4 | 1 Sabre, 1 Voile, 1 Canon, 1 Pistolet |
| Maître Voilier | 7 | 2 Voiles |
| Maître Canonnier | 7 | 2 Canons |
| Quartier-maître | 7 | 2 Pistolets |
| Matelots | 7 | 2 Sabres |
| Matelot | 11 | 1 Sabre |
| Navigateur | 11 | 1 Voile |
| Officier | 11 | 1 Pistolet |
| Canonnier | 11 | 1 Canon |

Crew size is unlimited. Recruits stay until discarded by an effect. Discarded recruits go to the event discard pile.

---

## 4. Roles

### Master of the Wind
- Starts the round: reveals the 4 events, picks first.
- **Decides all ties** (boardings, any tied comparison), **even if a participant** in the tie.
- First game round: assigned to a random player (physical rule "oldest player" is replaced by server-side random seat).

### Laggard (Retardataire)
- The player seated immediately to the **right** of the Master.
- Picks **last** in the event draft.
- **Draws 1 treasure at the start of the round** (before events are revealed).

### Rotation
At end of round, the Master becomes the Laggard → the Master role moves one seat to the **left**. Pick order within a round is clockwise from the Master.

---

## 5. Round structure

1. **Laggard draws** 1 treasure card (face-down, into their private treasure hand).
2. **Master reveals** the top 4 cards of the event deck, face-up.
   - Trigger window: *"round events revealed"* (Tempête en Bouteille, Tourbillon).
3. **Event draft**: starting with the Master, clockwise, each player picks 1 revealed event and **resolves it immediately** before the next player picks.
   - 2–3 players: still reveal 4; leftover events go to the **bottom** of the event deck.
4. **End of round**: Master role rotates left. New round begins.

There is no hand of event cards — events resolve on pick.

---

## 6. Bonus system

Raid, Boarding, and Curse cards carry a **bonus icon** (one of the 4 values) and a **bonus effect**.

- **Threshold (individual)**: the player's ship has **≥ 4 units** of the bonus icon's value.
- **Threshold (2v2 team)**: the two teammates' **combined** total is **≥ 8** of that value.
- **Timing**: checked at **card resolution**, not at pick.
- **Who is checked**:
  - **Raid**: the player who picked the card.
  - **Curse / Talisman with bonus**: the card's **owner** at the moment the effect resolves.
  - **Boarding**: each side evaluates its **own** bonus. The bonus applies to whichever side **wins** — the bonus is NOT restricted to the chooser. A defending winner with an active bonus applies it.

---

## 7. Events

### 7.1 Recruitments (76 cards)
Picked card joins the picker's crew. No other effect.

### 7.2 Raids (8 cards; 2 per bonus icon)
- **Effect**: draw 1 treasure.
- **Bonus** (≥4 of the icon's value): draw 1 more (total 2).
- Trigger window: *"player draws treasure(s) via a raid"* (Bateau Fantôme).

### 7.3 Boardings (13 cards: 9× 1v1, 4× 2v2)

Each boarding card specifies:
- A **combat profile**: 2 or 3 of the four values (e.g. Canons + Pistolets).
- A **bonus icon** (always the/a value NOT in the profile).

**Targeting**
- **1v1**: the picker designates one opponent.
- **2v2**: the picker designates one partner; the two remaining players form the opposing team. (At 2–3 players, all 2v2 cards are played as 1v1.)

**Resolution**
1. Each side sums the profile values across its ship(s) (2v2: teammates' values are added).
2. Higher total wins. **Tie → Master of the Wind decides the winner**, even if a participant. A 0 vs 0 comparison is a tie.
3. **1v1 steal**: winner steals 1 treasure from the loser. **Bonus active on winner**: steals 2.
4. **2v2 steal**: **each** winning player steals 1 treasure, each from a **different** losing player (winner A ↔ loser X, winner B ↔ loser Y; the winning side chooses the pairing). **Team bonus active (≥8 combined)**: each winner steals **2**, still one distinct loser per winner.

**Stealing (universal rule)**
- A steal takes 1 **random** card from the target's face-down treasure hand. The victim does not choose; the thief does not see before taking.
- **All** treasure types are stealable: corners, curses, talismans.
- Stealing a Talisman fires its trigger (see §9). The thief keeps the talisman after the trigger resolves.
- If the target has no treasures, the steal fizzles (no substitute).

**Boarding card inventory**

| Mode | Profile | Bonus icon | Count |
|------|---------|-----------|-------|
| 1v1 | Canons + Pistolets | Voiles | 1 |
| 1v1 | Canons + Sabres | Pistolets | 1 |
| 1v1 | Pistolets + Voiles | Canons | 1 |
| 1v1 | Pistolets + Sabres | Canons | 1 |
| 1v1 | Voiles + Sabres | Canons | 1 |
| 1v1 | Canons + Pistolets + Voiles | Sabres | 1 |
| 1v1 | Canons + Pistolets + Sabres | Voiles | 1 |
| 1v1 | Canons + Voiles + Sabres | Pistolets | 1 |
| 1v1 | Pistolets + Voiles + Sabres | Canons | 1 |
| 2v2 | Canons + Voiles | Pistolets | 1 |
| 2v2 | Canons + Pistolets + Voiles | Sabres | 1 |
| 2v2 | Canons + Pistolets + Sabres | Voiles | 1 |
| 2v2 | Voiles + Sabres | Canons | 1 |

---

## 8. Treasures

Treasure cards are held **face-down** in a private hand. Hidden-information rule: a player's treasure hand contents are NEVER sent to other seats (top security property). Counts (hand size) are public.

### 8.1 Map Corners (20 cards: 5× each)
- Coin Haut-Gauche, Coin Bas-Gauche, Coin Haut-Droit, Coin Bas-Droit.
- **Win condition**: hold at least **1 of each of the 4 distinct corners** → **immediate win**.
- **Win check**: state-based, performed immediately after ANY treasure gain (laggard draw, raid draw, steal, curse/talisman effect), including mid-effect. First player to satisfy it wins on the spot; remaining effects are not resolved.
- Duplicates have no additional value (no pairing mechanic — legacy "babioles" rule is obsolete).

### 8.2 Curses (10 cards)
- Played **from the treasure hand** when their trigger occurs. **Optional** to play. No cost, no per-turn limit. Discarded (treasure discard) after resolution.
- Curses do not count toward the win condition.
- **Simultaneous triggers** (multiple curses eligible at the same window): resolve in turn order starting from the Master.

| Curse | Count | Bonus icon | Trigger | Effect | Bonus effect (owner ≥4 of icon) |
|-------|-------|-----------|---------|--------|-------------------------------|
| Libérez le Kraken | 2 | Canons | Any player is boarded | Owner steals 1 recruit (**owner's choice**) from the boarding initiator | Steal 2 recruits |
| Tourbillon | 2 | Pistolets | The round's 4th event is revealed | Every other player discards 1 recruit (**their own choice**) | **Owner chooses** the discarded recruits |
| Île Brumeuse | 2 | Voiles | Owner is on the defending side of a boarding | Owner escapes. 1v1: boarding fully cancelled. 2v2: owner withdraws, boarding proceeds 2v1 (if both defenders escape, cancelled) | Owner also steals 1 recruit (owner's choice) from the boarding initiator |
| Tempête en Bouteille | 2 | Sabres | The round's 4 events are revealed, before any pick | Owner becomes Master of the Wind **immediately**: picks first, decides this round's ties; rotation continues from them | Owner also draws 1 treasure |
| Bateau Fantôme | 2 | Pistolets | Another player draws treasure(s) via a Raid | For **each** treasure drawn, owner steals 1 treasure from that player | Steal 1 more. Stacks: raid bonus (2 drawn) + owner bonus → steal 3 |

Tourbillon note: fires at the reveal window each round (not deck exhaustion). Tourbillon and Tempête share the reveal window → Master-order resolution applies.

### 8.3 Talismans (11 cards)
- **Decoys**: they hold no corner value; their purpose is to punish/deter theft, protecting corners and curses in the hand.
- Trigger fires when the talisman is **stolen** (by any means: boarding, curse, another talisman). Effects are **mandatory**. The thief keeps the talisman after resolution.
- Effects resolve for the benefit of the **victim** (previous owner), except where stated.

| Talisman | Count | Trigger effect (victim = previous owner, thief = stealer) |
|----------|-------|----------------------------------------------------------|
| Singe Doré | 1 | Victim names one specific corner type and one player; if that player holds ≥1, they must hand one to the victim. **Bonus (victim ≥4 Sabres)**: interrogate two players |
| Contre-Abordage (×4, one per value) | 4 | Victim immediately launches a 1v1 boarding using **only** the stated value (Canons / Sabres / Voiles / Pistolets version) against any player of their choice (thief included). Winner steals 1 treasure from loser. No bonus. Tie → Master decides |
| Longue-vue | 2 | Victim looks at **all** treasures of one player of their choice |
| Coffre Piégé | 2 | Thief discards 1 of their recruits (**thief's choice**). Thief keeps the chest |
| Bijou Maudit | 2 | Victim draws 1 treasure |

---

## 9. Deck management

- **Event deck** empty: reshuffle the event discard pile into a new deck. If both empty, skip the reveal shortfall (reveal as many as possible).
- **Treasure deck** empty: reshuffle the treasure discard pile. If both empty, treasure draws fizzle.
- 2–3 player leftover events go to the **bottom** of the event deck (not discard).

---

## 10. Player-count variants

| Players | Rules delta |
|---------|-------------|
| 4 | Reference rules |
| 3 | Reveal 4 events, each player picks 1, leftover to deck bottom. 2v2 cards → played as 1v1 |
| 2 | Same as 3-player deltas. Master and Laggard alternate between the two players; Laggard still draws a treasure each round |

---

## 11. Hidden information & server authority

- Server-authoritative state; pure engine with injected randomness and time.
- **Private per seat**: treasure hand contents (identities). Never serialized to other seats.
- **Public**: crews, treasure hand counts, revealed events, role assignments, discard piles' top-level events (recruit discards are public; treasure discards are public once discarded).
- Longue-vue grants a one-time private reveal to the victim only — reveal payload goes to that seat exclusively.
- Random steal selection is server-side; neither party sees the selection space.

---

## 12. Obsolete legacy rules (do NOT implement)

- Babioles / pairing mechanic (boussole, lanterne, dés, parchemin) — removed.
- "Any 4 corners win" — replaced by 4 **distinct** corners.
- Talismans counting as corners — never true in this version.
- Legacy value names (lieutenants, mousses) — renamed Pistolets, Sabres.
- Tourbillon on deck exhaustion — replaced by per-round reveal trigger.
- 104 events / 40 treasures counts.

---

## 13. Open items (design phase)

- Icon/asset renames to match Sabres/Pistolets nomenclature (`icon_officer.png`, `icon_deckhand.png`, card names "Officier", "Quartier-maître", "Matelots" may need thematic review).
- All card art = placeholder until redesign; art is immutable-PNG + CSS-overlay policy as per house standard.
