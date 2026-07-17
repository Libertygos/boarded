/**
 * Match flow — the interrupt-stack interpreter. gameplay.md §5 (round structure), §6
 * (bonus), §7 (events), §8 (treasures) are implemented here.
 *
 * Model: `state.stack` holds nested interrupt frames; the top frame is the active input
 * wait. `advance()` is the interpreter: it processes automatic frames (stealExec, empty
 * curse windows, combat math), auto-resolves frames whose acting seat is disconnected,
 * and returns as soon as a connected seat's input is required (or the match ends).
 * `applyMove()` validates a move against the top frame, mutates, then re-advances.
 */
import type {
  BoardingCard,
  CurseCard,
  CurseKey,
  EventCard,
  Frame,
  GameState,
  Move,
  TreasureCard,
  Value,
  ValueCounts,
} from './types.js';
import { EVENTS_PER_ROUND, RuleError } from './types.js';
import { CURSE_LABEL, CORNER_LABEL, RECRUIT_LABEL, TALISMAN_LABEL, VALUE_LABEL } from './data.js';
import {
  bonusActive,
  countValue,
  drawTreasure,
  gainTreasure,
  hasCaptain,
  laggardSeat,
  log,
  nextSeat,
  playerAt,
  profileTotal,
  seatCount,
  seatsFrom,
  stealableCrew,
  takeRandomTreasure,
} from './state.js';
import { shuffle } from './rng.js';

type Rng = () => number;

const MAX_STEPS = 10_000;

// ---- Frame helpers -------------------------------------------------------------

function top(state: GameState): Frame | undefined {
  return state.stack[state.stack.length - 1];
}

function pop(state: GameState): void {
  state.stack.pop();
}

/** Curse types eligible at each trigger window. */
const WINDOW_CURSES: Record<'reveal' | 'raid', CurseKey[]> = {
  reveal: ['tempete', 'tourbillon'],
  raid: ['bateau-fantome'],
};

function holdsEligibleCurse(state: GameState, seat: number, curses: CurseKey[]): boolean {
  const p = playerAt(state, seat);
  return p.treasures.some((t) => t.type === 'curse' && curses.includes(t.curse));
}

/** The seat whose input the top frame waits on, or null when nothing is pending. */
export function actingSeat(state: GameState): number | null {
  const f = top(state);
  if (!f) return null;
  switch (f.kind) {
    case 'pickEvent':
    case 'boardingTarget':
    case 'chooseRecruit':
    case 'singeDore':
    case 'contreAbordage':
    case 'longueVue':
    case 'pairSteal':
      return f.seat;
    case 'curseWindow':
      return f.queue[0] ?? null;
    case 'tourbillon':
      return null; // always processed by advance(); sub-frames carry the wait
    case 'stealExec':
      return null;
    case 'boardingResolve':
      if (f.step === 'kraken' || f.step === 'brumeuse') return f.queue[0] ?? null;
      if (f.step === 'tie') return state.masterSeat;
      return null;
  }
}

// ---- Round flow (stack empty) -----------------------------------------------------

function startRound(state: GameState, rng: Rng): void {
  if (state.round > 0) {
    // End of round: Master role moves one seat to the LEFT (gameplay.md §4).
    state.masterSeat = nextSeat(state, state.masterSeat);
  }
  state.round += 1;
  log(state, `— Manche ${state.round} : ${playerAt(state, state.masterSeat).displayName} est Maître du Vent —`);

  // 1. Laggard draws 1 treasure (gameplay.md §5.1).
  const lag = laggardSeat(state);
  const drawn = drawTreasure(state, rng);
  if (drawn) {
    log(state, `${playerAt(state, lag).displayName} (Retardataire) pioche 1 trésor.`);
    if (gainTreasure(state, lag, drawn)) return;
  }

  // 2. Reveal the top 4 events (reshuffle the discard on exhaustion; skip shortfall, §9).
  state.revealed = [];
  for (let i = 0; i < EVENTS_PER_ROUND; i++) {
    if (state.eventDeck.length === 0 && state.eventDiscard.length > 0) {
      state.eventDeck = shuffle(state.eventDiscard, rng);
      state.eventDiscard = [];
    }
    const card = state.eventDeck.pop();
    if (card) state.revealed.push(card);
  }

  // 3. Draft clockwise from the Master (§5.3).
  state.pickQueue = seatsFrom(state, state.masterSeat).slice(0, Math.min(seatCount(state), state.revealed.length));

  // Trigger window "round events revealed" (Tempête en Bouteille, Tourbillon).
  state.stack.push({ kind: 'curseWindow', window: 'reveal', queue: seatsFrom(state, state.masterSeat) });
}

function endRound(state: GameState): void {
  // 2–3 players: leftover events go to the BOTTOM of the event deck (§5.3/§9).
  for (const card of state.revealed) state.eventDeck.unshift(card);
  state.revealed = [];
}

// ---- Event resolution ---------------------------------------------------------------

function resolvePick(state: GameState, seat: number, card: EventCard, rng: Rng): void {
  const p = playerAt(state, seat);
  if (card.type === 'recruit') {
    p.crew.push(card);
    log(state, `${p.displayName} recrute ${RECRUIT_LABEL[card.kind]}.`);
    return;
  }
  if (card.type === 'raid') {
    state.eventDiscard.push(card);
    const bonus = bonusActive(state, [seat], card.bonusIcon);
    const count = bonus ? 2 : 1;
    let drawnCount = 0;
    for (let i = 0; i < count; i++) {
      const t = drawTreasure(state, rng);
      if (!t) break;
      drawnCount++;
      if (gainTreasure(state, seat, t)) return;
    }
    log(state, `${p.displayName} pille ${drawnCount} trésor${drawnCount > 1 ? 's' : ''}${bonus ? ' (bonus actif)' : ''}.`);
    if (drawnCount > 0) {
      // Trigger window "player draws treasure(s) via a raid" (Bateau Fantôme).
      state.stack.push({
        kind: 'curseWindow',
        window: 'raid',
        queue: seatsFrom(state, state.masterSeat).filter((s) => s !== seat),
        raider: seat,
        drawnCount,
      });
    }
    return;
  }
  // Boarding: designate opponent (and partner for 2v2) — gameplay.md §7.3.
  state.eventDiscard.push(card);
  const as1v1 = card.mode === '2v2' && seatCount(state) < 4;
  state.stack.push({ kind: 'boardingTarget', seat, card, as1v1 });
}

// ---- Boarding ------------------------------------------------------------------------

function beginBoarding(state: GameState, attackers: number[], defenders: number[], card: BoardingCard): void {
  const names = (seats: number[]) => seats.map((s) => playerAt(state, s).displayName).join(' + ');
  log(
    state,
    `Abordage (${card.profile.map((v) => VALUE_LABEL[v]).join(' + ')}) : ${names(attackers)} → ${names(defenders)}.`,
  );
  state.stack.push({
    kind: 'boardingResolve',
    attackers,
    defenders,
    card,
    profile: card.profile,
    bonusIcon: card.bonusIcon,
    stealsPerWinner: 1,
    step: 'kraken',
    // "Any player is boarded" — every seat except the initiator may unleash the Kraken.
    queue: seatsFrom(state, state.masterSeat).filter((s) => s !== attackers[0]),
    escaped: [],
  });
}

function resolveCombat(state: GameState, f: Extract<Frame, { kind: 'boardingResolve' }>): void {
  const defenders = f.defenders.filter((s) => !f.escaped.includes(s));
  const atk = profileTotal(state, f.attackers, f.profile);
  const def = profileTotal(state, defenders, f.profile);
  // Snapshot the combat math for the resolution report — crews can change afterwards
  // (Coffre Piégé, Kraken on a chained boarding) before the client sees the projection.
  f.totals = { atk, def };
  f.contributions = Object.fromEntries(
    [...f.attackers, ...defenders].map((s) => {
      const p = playerAt(state, s);
      const counts: Partial<ValueCounts> = {};
      for (const v of f.profile) counts[v] = countValue(p, v);
      return [s, counts];
    }),
  );
  f.tie = atk === def;
  log(state, `Combat : ${atk} contre ${def}.`);
  if (atk === def) {
    f.step = 'tie';
    log(state, `Égalité — le Maître du Vent tranche.`);
    return;
  }
  finishCombat(state, f, atk > def ? 'attackers' : 'defenders');
}

function finishCombat(state: GameState, f: Extract<Frame, { kind: 'boardingResolve' }>, side: 'attackers' | 'defenders'): void {
  const defenders = f.defenders.filter((s) => !f.escaped.includes(s));
  f.winners = side === 'attackers' ? f.attackers : defenders;
  f.losers = side === 'attackers' ? defenders : f.attackers;
  // The bonus applies to whichever side WINS (gameplay.md §6): evaluate on the winners.
  const bonus = f.bonusIcon !== null && bonusActive(state, f.winners, f.bonusIcon);
  f.bonus = bonus;
  f.stealsPerWinner = bonus ? 2 : 1;
  log(
    state,
    `${f.winners.map((s) => playerAt(state, s).displayName).join(' + ')} remporte l'abordage${bonus ? ' (bonus actif)' : ''}.`,
  );
  f.step = 'steal';
}

/** Deterministic winner→loser pairing when there is no real choice (or on auto-resolve). */
function autoPairing(winners: number[], losers: number[]): Array<{ winner: number; loser: number }> {
  return winners.map((w, i) => ({ winner: w, loser: losers[i % losers.length]! }));
}

function queueSteals(state: GameState, f: Extract<Frame, { kind: 'boardingResolve' }>, pairing: Array<{ winner: number; loser: number }>): void {
  // Publish the resolution report — the client animates it (sides → values → totals →
  // verdict + steals). Everything in it is public information.
  state.combatSeq += 1;
  state.lastCombat = {
    seq: state.combatSeq,
    counter: f.card === null,
    attackers: f.attackers,
    defenders: f.defenders.filter((s) => !f.escaped.includes(s)),
    profile: f.profile,
    contributions: f.contributions ?? {},
    atkTotal: f.totals?.atk ?? 0,
    defTotal: f.totals?.def ?? 0,
    tie: f.tie ?? false,
    winners: f.winners ?? [],
    losers: f.losers ?? [],
    bonus: f.bonus ?? false,
    steals: pairing.map((p) => ({ thief: p.winner, victim: p.loser, count: f.stealsPerWinner })),
  };
  pop(state); // boardingResolve done
  state.stack.push({
    kind: 'stealExec',
    ops: pairing.map((p) => ({ thief: p.winner, victim: p.loser, count: f.stealsPerWinner })),
  });
}

// ---- Steals & talisman triggers (gameplay.md §7.3 / §8.3) ------------------------------

function performSteal(state: GameState, thief: number, victim: number, rng: Rng): void {
  const card = takeRandomTreasure(state, victim, rng);
  const thiefP = playerAt(state, thief);
  const victimP = playerAt(state, victim);
  if (!card) {
    log(state, `${thiefP.displayName} tente de voler ${victimP.displayName} — main vide, le vol échoue.`);
    return;
  }
  log(state, `${thiefP.displayName} vole 1 trésor à ${victimP.displayName}.`);
  // The thief keeps the card (win check runs on the gain), then a stolen talisman fires.
  if (gainTreasure(state, thief, card)) return;
  if (card.type === 'talisman') fireTalisman(state, thief, victim, card, rng);
}

function fireTalisman(
  state: GameState,
  thief: number,
  victim: number,
  card: Extract<TreasureCard, { type: 'talisman' }>,
  rng: Rng,
): void {
  const victimP = playerAt(state, victim);
  log(state, `Talisman volé : ${TALISMAN_LABEL[card.talisman]} se déclenche !`);
  switch (card.talisman) {
    case 'singe-dore': {
      const two = bonusActive(state, [victim], 'sabres');
      state.stack.push({ kind: 'singeDore', seat: victim, remaining: two ? 2 : 1, asked: [] });
      return;
    }
    case 'contre-abordage': {
      state.stack.push({ kind: 'contreAbordage', seat: victim, value: card.value ?? 'sabres' });
      return;
    }
    case 'longue-vue': {
      state.stack.push({ kind: 'longueVue', seat: victim });
      return;
    }
    case 'coffre-piege': {
      const thiefP = playerAt(state, thief);
      if (thiefP.crew.length === 0) return;
      state.stack.push({
        kind: 'chooseRecruit',
        seat: thief,
        fromSeat: thief,
        count: 1,
        action: 'discard',
        reason: 'coffre-piege',
      });
      return;
    }
    case 'bijou-maudit': {
      const t = drawTreasure(state, rng);
      if (t) {
        log(state, `${victimP.displayName} pioche 1 trésor (Bijou Maudit).`);
        gainTreasure(state, victim, t);
      }
      return;
    }
  }
}

// ---- Curse play -----------------------------------------------------------------------

function removeCurse(state: GameState, seat: number, cardId: string): CurseCard {
  const p = playerAt(state, seat);
  const i = p.treasures.findIndex((t) => t.id === cardId);
  const card = i >= 0 ? p.treasures[i] : undefined;
  if (!card || card.type !== 'curse') throw new RuleError('Cette carte ne peut pas être jouée.');
  p.treasures.splice(i, 1);
  state.treasureDiscard.push(card);
  log(state, `${p.displayName} joue ${CURSE_LABEL[card.curse]} !`);
  return card;
}

function playCurseEffect(state: GameState, seat: number, curse: CurseCard, rng: Rng): void {
  switch (curse.curse) {
    case 'tempete': {
      // Owner becomes Master immediately; rotation continues from them (gameplay.md §8.2).
      state.masterSeat = seat;
      state.pickQueue = seatsFrom(state, seat).slice(0, Math.min(seatCount(state), state.revealed.length));
      log(state, `${playerAt(state, seat).displayName} devient Maître du Vent !`);
      if (bonusActive(state, [seat], curse.bonusIcon)) {
        const t = drawTreasure(state, rng);
        if (t) {
          log(state, `${playerAt(state, seat).displayName} pioche 1 trésor (bonus).`);
          gainTreasure(state, seat, t);
        }
      }
      return;
    }
    case 'tourbillon': {
      const ownerChooses = bonusActive(state, [seat], curse.bonusIcon);
      state.stack.push({
        kind: 'tourbillon',
        owner: seat,
        ownerChooses,
        queue: seatsFrom(state, state.masterSeat).filter((s) => s !== seat),
      });
      return;
    }
    case 'bateau-fantome': {
      const f = top(state);
      const raider = f?.kind === 'curseWindow' && f.window === 'raid' ? f.raider : undefined;
      const drawnCount = f?.kind === 'curseWindow' ? (f.drawnCount ?? 1) : 1;
      if (raider === undefined) return;
      const count = drawnCount + (bonusActive(state, [seat], curse.bonusIcon) ? 1 : 0);
      state.stack.push({ kind: 'stealExec', ops: [{ thief: seat, victim: raider, count }] });
      return;
    }
    case 'kraken': {
      const f = top(state);
      if (f?.kind !== 'boardingResolve' || f.step !== 'kraken') return;
      const initiator = f.attackers[0]!;
      // One Capitaine per ship: an initiator's Capitaine is out of reach when the owner
      // already has one, so it does not count toward the stealable pool.
      const count = Math.min(
        bonusActive(state, [seat], curse.bonusIcon) ? 2 : 1,
        stealableCrew(state, seat, initiator).length,
      );
      if (count === 0) {
        log(state, `Aucune recrue à voler à l'initiateur — le Kraken repart bredouille.`);
        return;
      }
      state.stack.push({ kind: 'chooseRecruit', seat, fromSeat: initiator, count, action: 'steal', reason: 'kraken' });
      return;
    }
    case 'ile-brumeuse': {
      const f = top(state);
      if (f?.kind !== 'boardingResolve' || f.step !== 'brumeuse') return;
      f.escaped.push(seat);
      log(state, `${playerAt(state, seat).displayName} s'échappe vers l'Île Brumeuse.`);
      if (bonusActive(state, [seat], curse.bonusIcon)) {
        const initiator = f.attackers[0]!;
        const count = Math.min(1, stealableCrew(state, seat, initiator).length);
        if (count > 0) {
          state.stack.push({
            kind: 'chooseRecruit',
            seat,
            fromSeat: initiator,
            count,
            action: 'steal',
            reason: 'brumeuse-bonus',
          });
        }
      }
      return;
    }
  }
}

// ---- Auto-resolution for disconnected seats ---------------------------------------------

/** A revealed event `seat` is allowed to pick (one Capitaine per ship, gameplay.md §3). */
function pickable(state: GameState, seat: number, card: EventCard): boolean {
  return !(card.type === 'recruit' && card.kind === 'capitaine' && hasCaptain(playerAt(state, seat)));
}

function autoPick(state: GameState, seat: number, rng: Rng): void {
  // Callers guarantee at least one pickable card exists (advance() skips the pick otherwise).
  const card =
    state.revealed.find((c) => c.type === 'recruit' && pickable(state, seat, c)) ??
    state.revealed.find((c) => c.type === 'raid') ??
    state.revealed.find((c) => pickable(state, seat, c))!;
  applyPickEvent(state, seat, card.id, rng);
}

function autoBoardingTarget(state: GameState, f: Extract<Frame, { kind: 'boardingTarget' }>): void {
  const target = nextSeat(state, f.seat);
  const partner =
    f.card.mode === '2v2' && !f.as1v1
      ? seatsFrom(state, f.seat).find((s) => s !== f.seat && s !== target)
      : undefined;
  applyChooseBoarding(state, f.seat, { type: 'CHOOSE_BOARDING', targetSeat: target, partnerSeat: partner }, f);
}

// ---- The interpreter ----------------------------------------------------------------------

export function advance(state: GameState, rng: Rng): void {
  for (let steps = 0; steps < MAX_STEPS; steps++) {
    if (state.status !== 'playing') return;
    const f = top(state);

    if (!f) {
      if (state.pickQueue.length > 0) {
        state.stack.push({ kind: 'pickEvent', seat: state.pickQueue[0]! });
        continue;
      }
      if (state.revealed.length > 0) {
        endRound(state);
        continue;
      }
      startRound(state, rng);
      continue;
    }

    switch (f.kind) {
      case 'stealExec': {
        const op = f.ops[0];
        if (!op) {
          pop(state);
          continue;
        }
        if (op.count <= 0) {
          f.ops.shift();
          continue;
        }
        op.count -= 1;
        performSteal(state, op.thief, op.victim, rng);
        continue; // a fired talisman frame now sits above and will be processed next
      }

      case 'curseWindow': {
        const seat = f.queue[0];
        if (seat === undefined) {
          pop(state);
          continue;
        }
        const eligible =
          playerAt(state, seat).connected && holdsEligibleCurse(state, seat, WINDOW_CURSES[f.window]);
        if (!eligible) {
          f.queue.shift();
          continue;
        }
        return; // wait for PLAY_CURSE / PASS_CURSE
      }

      case 'boardingResolve': {
        if (f.step === 'kraken' || f.step === 'brumeuse') {
          const curses: CurseKey[] = f.step === 'kraken' ? ['kraken'] : ['ile-brumeuse'];
          const seat = f.queue[0];
          if (seat === undefined) {
            if (f.step === 'kraken') {
              // Île Brumeuse window: defenders only (gameplay.md §8.2).
              f.step = 'brumeuse';
              f.queue = seatsFrom(state, state.masterSeat).filter((s) => f.defenders.includes(s));
            } else {
              const remaining = f.defenders.filter((s) => !f.escaped.includes(s));
              if (remaining.length === 0) {
                log(state, `Tous les défenseurs se sont échappés — l'abordage est annulé.`);
                pop(state);
              } else {
                f.step = 'combat';
              }
            }
            continue;
          }
          const ok = playerAt(state, seat).connected && holdsEligibleCurse(state, seat, curses);
          if (!ok) {
            f.queue.shift();
            continue;
          }
          return; // wait for PLAY_CURSE / PASS_CURSE
        }
        if (f.step === 'combat') {
          resolveCombat(state, f);
          continue;
        }
        if (f.step === 'tie') {
          if (!playerAt(state, state.masterSeat).connected) {
            finishCombat(state, f, 'attackers'); // auto-decision: initiator side
            continue;
          }
          return; // wait for MASTER_DECIDE
        }
        // step === 'steal'
        const winners = f.winners ?? [];
        const losers = f.losers ?? [];
        if (winners.length === 0 || losers.length === 0) {
          pop(state);
          continue;
        }
        if (winners.length === 1 && losers.length === 1) {
          queueSteals(state, f, autoPairing(winners, losers));
          continue;
        }
        // The winning side chooses the pairing; chooser = winner closest to the Master.
        const chooser = seatsFrom(state, state.masterSeat).find((s) => winners.includes(s))!;
        if (!playerAt(state, chooser).connected) {
          queueSteals(state, f, autoPairing(winners, losers));
          continue;
        }
        const already = top(state);
        if (already && already.kind === 'pairSteal') return; // defensive; should not happen
        state.stack.push({ kind: 'pairSteal', seat: chooser, winners, losers, stealsPerWinner: f.stealsPerWinner });
        return;
      }

      case 'tourbillon': {
        const seat = f.queue.shift();
        if (seat === undefined) {
          pop(state);
          continue;
        }
        const target = playerAt(state, seat);
        if (target.crew.length === 0) continue;
        const chooser = f.ownerChooses ? f.owner : seat;
        state.stack.push({
          kind: 'chooseRecruit',
          seat: chooser,
          fromSeat: seat,
          count: 1,
          action: 'discard',
          reason: 'tourbillon',
        });
        continue;
      }

      case 'pickEvent': {
        if (state.revealed.length === 0) {
          state.pickQueue = [];
          pop(state);
          continue;
        }
        // One Capitaine per ship: if every remaining event is an unpickable second
        // Capitaine, the seat skips its pick (gameplay.md §13 ruling) — never deadlock.
        if (!state.revealed.some((c) => pickable(state, f.seat, c))) {
          log(state, `${playerAt(state, f.seat).displayName} ne peut recruter un second Capitaine — choix passé.`);
          state.pickQueue.shift();
          pop(state);
          continue;
        }
        if (!playerAt(state, f.seat).connected) {
          autoPick(state, f.seat, rng);
          continue;
        }
        return;
      }

      case 'boardingTarget': {
        if (!playerAt(state, f.seat).connected) {
          autoBoardingTarget(state, f);
          continue;
        }
        return;
      }

      case 'chooseRecruit': {
        const pool =
          f.action === 'steal' ? stealableCrew(state, f.seat, f.fromSeat) : playerAt(state, f.fromSeat).crew;
        const count = Math.min(f.count, pool.length);
        if (count === 0) {
          pop(state);
          continue;
        }
        if (!playerAt(state, f.seat).connected) {
          applyChooseRecruit(state, f.seat, pool.slice(0, count).map((c) => c.id), f);
          continue;
        }
        return;
      }

      case 'singeDore': {
        if (!playerAt(state, f.seat).connected) {
          pop(state); // effect benefits the disconnected victim; skip
          continue;
        }
        return;
      }

      case 'contreAbordage': {
        if (!playerAt(state, f.seat).connected) {
          const target = nextSeat(state, f.seat);
          applyContreAbordage(state, f.seat, target, f);
          continue;
        }
        return;
      }

      case 'longueVue': {
        if (!playerAt(state, f.seat).connected) {
          pop(state);
          continue;
        }
        return;
      }

      case 'pairSteal': {
        if (!playerAt(state, f.seat).connected) {
          pop(state);
          const parent = top(state);
          if (parent?.kind === 'boardingResolve') queueSteals(state, parent, autoPairing(f.winners, f.losers));
          continue;
        }
        return;
      }
    }
  }
  throw new Error('advance(): step limit exceeded — engine stuck in a loop');
}

// ---- Move application ------------------------------------------------------------------

function applyPickEvent(state: GameState, seat: number, cardId: string, rng: Rng): void {
  const i = state.revealed.findIndex((c) => c.id === cardId);
  const card = i >= 0 ? state.revealed[i] : undefined;
  if (!card) throw new RuleError("Cet événement n'est pas disponible.");
  if (!pickable(state, seat, card)) throw new RuleError('Un seul Capitaine par navire !');
  state.revealed.splice(i, 1);
  state.pickQueue.shift();
  pop(state); // pickEvent frame
  resolvePick(state, seat, card, rng);
}

function applyChooseBoarding(
  state: GameState,
  seat: number,
  move: Extract<Move, { type: 'CHOOSE_BOARDING' }>,
  f: Extract<Frame, { kind: 'boardingTarget' }>,
): void {
  const n = seatCount(state);
  const valid = (s: number | undefined): s is number => s !== undefined && Number.isInteger(s) && s >= 0 && s < n;
  if (!valid(move.targetSeat) || move.targetSeat === seat) throw new RuleError('Cible invalide.');
  pop(state); // boardingTarget
  if (f.card.mode === '2v2' && !f.as1v1) {
    if (!valid(move.partnerSeat) || move.partnerSeat === seat || move.partnerSeat === move.targetSeat) {
      throw new RuleError('Partenaire invalide.');
    }
    // The two remaining players form the opposing team (gameplay.md §7.3).
    const defenders = seatsFrom(state, 0).filter((s) => s !== seat && s !== move.partnerSeat);
    if (!defenders.includes(move.targetSeat)) throw new RuleError('Cible invalide.');
    beginBoarding(state, [seat, move.partnerSeat], defenders, f.card);
    return;
  }
  beginBoarding(state, [seat], [move.targetSeat], f.card);
}

function applyChooseRecruit(
  state: GameState,
  seat: number,
  cardIds: string[],
  f: Extract<Frame, { kind: 'chooseRecruit' }>,
): void {
  const source = playerAt(state, f.fromSeat);
  // Steals cannot take a Capitaine when the thief already has one (gameplay.md §3).
  const pool = f.action === 'steal' ? stealableCrew(state, seat, f.fromSeat) : source.crew;
  const count = Math.min(f.count, pool.length);
  if (cardIds.length !== count) throw new RuleError(`Choisissez ${count} recrue${count > 1 ? 's' : ''}.`);
  const picked = cardIds.map((id) => {
    const card = pool.find((c) => c.id === id);
    if (!card) {
      if (source.crew.some((c) => c.id === id)) throw new RuleError('Un seul Capitaine par navire !');
      throw new RuleError('Recrue introuvable.');
    }
    return card;
  });
  if (new Set(cardIds).size !== cardIds.length) throw new RuleError('Recrues en double.');
  pop(state);
  for (const card of picked) {
    source.crew.splice(source.crew.indexOf(card), 1);
    if (f.action === 'steal') {
      playerAt(state, seat).crew.push(card);
      log(state, `${playerAt(state, seat).displayName} vole la recrue ${RECRUIT_LABEL[card.kind]} à ${source.displayName}.`);
    } else {
      state.eventDiscard.push(card); // discarded recruits → event discard (gameplay.md §3)
      log(state, `${source.displayName} défausse la recrue ${RECRUIT_LABEL[card.kind]}.`);
    }
  }
}

function applyContreAbordage(
  state: GameState,
  seat: number,
  targetSeat: number,
  f: Extract<Frame, { kind: 'contreAbordage' }>,
): void {
  const n = seatCount(state);
  if (!Number.isInteger(targetSeat) || targetSeat < 0 || targetSeat >= n || targetSeat === seat) {
    throw new RuleError('Cible invalide.');
  }
  pop(state);
  log(
    state,
    `Contre-Abordage (${VALUE_LABEL[f.value]}) : ${playerAt(state, seat).displayName} → ${playerAt(state, targetSeat).displayName}.`,
  );
  // Curse-level counter-boarding: single value, no bonus, no curse windows (design decision).
  state.stack.push({
    kind: 'boardingResolve',
    attackers: [seat],
    defenders: [targetSeat],
    card: null,
    profile: [f.value],
    bonusIcon: null,
    stealsPerWinner: 1,
    step: 'combat',
    queue: [],
    escaped: [],
  });
}

export function applyMove(state: GameState, userId: string, move: Move, rng: Rng): void {
  if (state.status !== 'playing') throw new RuleError('La partie est terminée.');
  const seat = state.seatOrder.indexOf(userId);
  if (seat < 0) throw new RuleError('Vous ne participez pas à cette partie.');
  const f = top(state);
  if (!f) throw new RuleError('Aucune action attendue.');
  if (actingSeat(state) !== seat) throw new RuleError("Ce n'est pas à vous d'agir.");

  switch (move.type) {
    case 'PICK_EVENT': {
      if (f.kind !== 'pickEvent') throw new RuleError('Action inattendue.');
      applyPickEvent(state, seat, move.cardId, rng);
      break;
    }
    case 'CHOOSE_BOARDING': {
      if (f.kind !== 'boardingTarget') throw new RuleError('Action inattendue.');
      applyChooseBoarding(state, seat, move, f);
      break;
    }
    case 'PLAY_CURSE': {
      const isWindow =
        f.kind === 'curseWindow' ||
        (f.kind === 'boardingResolve' && (f.step === 'kraken' || f.step === 'brumeuse'));
      if (!isWindow) throw new RuleError('Action inattendue.');
      const allowed: CurseKey[] =
        f.kind === 'curseWindow' ? WINDOW_CURSES[f.window] : f.step === 'kraken' ? ['kraken'] : ['ile-brumeuse'];
      const p = playerAt(state, seat);
      const target = p.treasures.find((t) => t.id === move.cardId);
      if (!target || target.type !== 'curse' || !allowed.includes(target.curse)) {
        throw new RuleError('Cette malédiction ne peut pas être jouée maintenant.');
      }
      const curse = removeCurse(state, seat, move.cardId);
      // Île Brumeuse escape consumes the defender's window slot; other plays keep the seat
      // at the head of the queue (they may hold a second eligible curse).
      if (f.kind === 'boardingResolve' && f.step === 'brumeuse' && curse.curse === 'ile-brumeuse') {
        f.queue.shift();
      }
      playCurseEffect(state, seat, curse, rng);
      break;
    }
    case 'PASS_CURSE': {
      if (f.kind === 'curseWindow') f.queue.shift();
      else if (f.kind === 'boardingResolve' && (f.step === 'kraken' || f.step === 'brumeuse')) f.queue.shift();
      else throw new RuleError('Action inattendue.');
      break;
    }
    case 'MASTER_DECIDE': {
      if (f.kind !== 'boardingResolve' || f.step !== 'tie') throw new RuleError('Action inattendue.');
      finishCombat(state, f, move.side === 'attackers' ? 'attackers' : 'defenders');
      break;
    }
    case 'CHOOSE_RECRUIT': {
      if (f.kind !== 'chooseRecruit') throw new RuleError('Action inattendue.');
      applyChooseRecruit(state, seat, move.cardIds, f);
      break;
    }
    case 'SINGE_DORE': {
      if (f.kind !== 'singeDore') throw new RuleError('Action inattendue.');
      const n = seatCount(state);
      if (!Number.isInteger(move.targetSeat) || move.targetSeat < 0 || move.targetSeat >= n || move.targetSeat === seat) {
        throw new RuleError('Cible invalide.');
      }
      if (f.asked.includes(move.targetSeat)) throw new RuleError('Joueur déjà interrogé.');
      f.asked.push(move.targetSeat);
      f.remaining -= 1;
      const targetP = playerAt(state, move.targetSeat);
      const idx = targetP.treasures.findIndex((t) => t.type === 'corner' && t.corner === move.corner);
      log(
        state,
        `Singe Doré : ${playerAt(state, seat).displayName} interroge ${targetP.displayName} sur ${CORNER_LABEL[move.corner]}.`,
      );
      if (f.remaining <= 0) pop(state);
      if (idx >= 0) {
        const cornerCard = targetP.treasures.splice(idx, 1)[0]!;
        log(state, `${targetP.displayName} doit remettre ${CORNER_LABEL[move.corner]}.`);
        if (gainTreasure(state, seat, cornerCard)) return;
      } else {
        log(state, `${targetP.displayName} n'en détient pas.`);
      }
      break;
    }
    case 'CONTRE_ABORDAGE': {
      if (f.kind !== 'contreAbordage') throw new RuleError('Action inattendue.');
      applyContreAbordage(state, seat, move.targetSeat, f);
      break;
    }
    case 'LONGUE_VUE': {
      if (f.kind !== 'longueVue') throw new RuleError('Action inattendue.');
      const n = seatCount(state);
      if (!Number.isInteger(move.targetSeat) || move.targetSeat < 0 || move.targetSeat >= n || move.targetSeat === seat) {
        throw new RuleError('Cible invalide.');
      }
      pop(state);
      const targetP = playerAt(state, move.targetSeat);
      state.reveals.push({
        to: playerAt(state, seat).userId,
        kind: 'longue-vue',
        aboutSeat: move.targetSeat,
        treasures: targetP.treasures.slice(),
      });
      log(
        state,
        `Longue-vue : ${playerAt(state, seat).displayName} observe tous les trésors de ${targetP.displayName}.`,
      );
      break;
    }
    case 'PAIR_STEAL': {
      if (f.kind !== 'pairSteal') throw new RuleError('Action inattendue.');
      const pairing = move.pairing ?? [];
      const winners = pairing.map((p) => p.winner);
      if (
        pairing.length !== f.winners.length ||
        new Set(winners).size !== f.winners.length ||
        !f.winners.every((w) => winners.includes(w)) ||
        !pairing.every((p) => f.losers.includes(p.loser))
      ) {
        throw new RuleError('Répartition invalide.');
      }
      // Each winner steals from a DIFFERENT loser when enough losers exist (gameplay.md §7.3).
      if (f.losers.length >= f.winners.length && new Set(pairing.map((p) => p.loser)).size !== pairing.length) {
        throw new RuleError('Chaque gagnant doit voler un perdant différent.');
      }
      const steals = f.stealsPerWinner;
      pop(state); // pairSteal
      const parent = top(state);
      if (parent?.kind === 'boardingResolve') {
        queueSteals(state, parent, pairing); // also emits the combat report
      } else {
        // Defensive: should not happen (pairSteal always sits on its boardingResolve).
        state.stack.push({
          kind: 'stealExec',
          ops: pairing.map((p) => ({ thief: p.winner, victim: p.loser, count: steals })),
        });
      }
      break;
    }
    default:
      throw new RuleError('Action inconnue.');
  }

  advance(state, rng);
}
