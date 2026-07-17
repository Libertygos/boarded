/**
 * Per-seat projection — THE hidden-information boundary (gameplay.md §11).
 * A seat's treasure hand contents are NEVER serialized to other seats; only counts are
 * public. Filtering happens here, at the source. `state.reveals` (Longue-vue payloads)
 * is never projected — the server unicasts and drains it.
 *
 * Curse-window privacy: while a curse window waits on a seat, other seats must not learn
 * WHO is being asked (that would reveal they hold an eligible curse) — non-actors see a
 * generic wait with no seat attribution.
 */
import type {
  BoardingCard,
  CombatReport,
  EventCard,
  Frame,
  GameState,
  LogEntry,
  RecruitCard,
  TreasureCard,
  Value,
  ValueCounts,
} from './types.js';
import { VALUES } from './types.js';
import { actingSeat } from './flow.js';
import { countValue, laggardSeat, playerAt, stealableCrew } from './state.js';

export interface SelfView {
  seatId: number;
  userId: string;
  displayName: string;
  crew: RecruitCard[];
  values: ValueCounts;
  treasures: TreasureCard[];
}

export interface OpponentView {
  seatId: number;
  userId: string;
  displayName: string;
  connected: boolean;
  crew: RecruitCard[];
  values: ValueCounts;
  treasureCount: number;
}

/** What the viewer is being asked to do (only the acting seat gets frame details). */
export type PendingView =
  | { kind: 'none' }
  | { kind: 'wait'; seat: number | null }
  | { kind: 'pickEvent' }
  | { kind: 'boardingTarget'; card: EventCard; as1v1: boolean }
  | { kind: 'curseWindow'; window: 'reveal' | 'raid' | 'kraken' | 'brumeuse'; playable: string[] }
  | { kind: 'masterTie'; attackers: number[]; defenders: number[]; profile: Value[] }
  | {
      kind: 'chooseRecruit';
      fromSeat: number;
      count: number;
      action: 'steal' | 'discard';
      reason: string;
      choices: RecruitCard[];
    }
  | { kind: 'singeDore'; remaining: number; asked: number[] }
  | { kind: 'contreAbordage'; value: Value }
  | { kind: 'longueVue' }
  | { kind: 'pairSteal'; winners: number[]; losers: number[] };

export interface BoardingView {
  attackers: number[];
  defenders: number[];
  profile: Value[];
  escaped: number[];
  /** The boarding card being resolved (public — it was picked face-up); null for a Contre-Abordage. */
  card: BoardingCard | null;
  bonusIcon: Value | null;
}

export interface PlayerProjection {
  matchId: string;
  status: 'playing' | 'ended';
  winner: string | null;
  round: number;
  masterSeat: number;
  laggardSeat: number;
  self: SelfView;
  opponents: OpponentView[];
  revealed: EventCard[];
  eventDeckCount: number;
  treasureDeckCount: number;
  treasureDiscard: TreasureCard[];
  boarding: BoardingView | null;
  /** Latest resolved boarding (public) — clients diff `seq` to animate the resolution. */
  combat: CombatReport | null;
  pending: PendingView;
  log: LogEntry[];
}

function valueCounts(state: GameState, seat: number): ValueCounts {
  const p = playerAt(state, seat);
  return Object.fromEntries(VALUES.map((v) => [v, countValue(p, v)])) as ValueCounts;
}

const WINDOW_CURSE_TYPES: Record<'reveal' | 'raid', string[]> = {
  reveal: ['tempete', 'tourbillon'],
  raid: ['bateau-fantome'],
};

function pendingFor(state: GameState, seat: number): PendingView {
  const f = state.stack[state.stack.length - 1];
  if (!f) return { kind: 'none' };
  const actor = actingSeat(state);
  if (actor === null) return { kind: 'wait', seat: null };

  const p = playerAt(state, seat);
  const isCurseWindow =
    f.kind === 'curseWindow' || (f.kind === 'boardingResolve' && (f.step === 'kraken' || f.step === 'brumeuse'));
  if (actor !== seat) {
    // Never attribute a curse-window wait — it would leak who holds a curse.
    return { kind: 'wait', seat: isCurseWindow ? null : actor };
  }

  switch (f.kind) {
    case 'pickEvent':
      return { kind: 'pickEvent' };
    case 'boardingTarget':
      return { kind: 'boardingTarget', card: f.card, as1v1: f.as1v1 };
    case 'curseWindow': {
      const allowed = WINDOW_CURSE_TYPES[f.window];
      const playable = p.treasures.filter((t) => t.type === 'curse' && allowed.includes(t.curse)).map((t) => t.id);
      return { kind: 'curseWindow', window: f.window, playable };
    }
    case 'boardingResolve': {
      if (f.step === 'kraken' || f.step === 'brumeuse') {
        const curse = f.step === 'kraken' ? 'kraken' : 'ile-brumeuse';
        const playable = p.treasures.filter((t) => t.type === 'curse' && t.curse === curse).map((t) => t.id);
        return { kind: 'curseWindow', window: f.step, playable };
      }
      // step === 'tie' (steal/combat never wait on input)
      return {
        kind: 'masterTie',
        attackers: f.attackers,
        defenders: f.defenders.filter((s) => !f.escaped.includes(s)),
        profile: f.profile,
      };
    }
    case 'chooseRecruit': {
      // Steals: a Capitaine the thief cannot take (already has one) is not offered.
      const pool =
        f.action === 'steal' ? stealableCrew(state, f.seat, f.fromSeat) : playerAt(state, f.fromSeat).crew.slice();
      return {
        kind: 'chooseRecruit',
        fromSeat: f.fromSeat,
        count: Math.min(f.count, pool.length),
        action: f.action,
        reason: f.reason,
        choices: pool,
      };
    }
    case 'singeDore':
      return { kind: 'singeDore', remaining: f.remaining, asked: f.asked };
    case 'contreAbordage':
      return { kind: 'contreAbordage', value: f.value };
    case 'longueVue':
      return { kind: 'longueVue' };
    case 'pairSteal':
      return { kind: 'pairSteal', winners: f.winners, losers: f.losers };
    default:
      return { kind: 'wait', seat: actor };
  }
}

function boardingView(state: GameState): BoardingView | null {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const f = state.stack[i]!;
    if (f.kind === 'boardingResolve') {
      return {
        attackers: f.attackers,
        defenders: f.defenders,
        profile: f.profile,
        escaped: f.escaped,
        card: f.card,
        bonusIcon: f.bonusIcon,
      };
    }
  }
  return null;
}

export function project(state: GameState, userId: string): PlayerProjection {
  const seat = state.seatOrder.indexOf(userId);
  if (seat < 0) throw new Error('unknown user');
  const self = playerAt(state, seat);
  return {
    matchId: state.matchId,
    status: state.status,
    winner: state.winner,
    round: state.round,
    masterSeat: state.masterSeat,
    laggardSeat: laggardSeat(state),
    self: {
      seatId: seat,
      userId,
      displayName: self.displayName,
      crew: self.crew,
      values: valueCounts(state, seat),
      treasures: self.treasures,
    },
    opponents: state.seatOrder
      .map((uid, s) => ({ uid, s }))
      .filter(({ s }) => s !== seat)
      .map(({ uid, s }) => {
        const p = state.players[uid]!;
        return {
          seatId: s,
          userId: uid,
          displayName: p.displayName,
          connected: p.connected,
          crew: p.crew,
          values: valueCounts(state, s),
          treasureCount: p.treasures.length,
        };
      }),
    revealed: state.revealed,
    eventDeckCount: state.eventDeck.length,
    treasureDeckCount: state.treasureDeck.length,
    treasureDiscard: state.treasureDiscard,
    boarding: boardingView(state),
    combat: state.lastCombat,
    pending: pendingFor(state, seat),
    log: state.log.slice(-40),
  };
}
