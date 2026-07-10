/**
 * State helpers: value counts, bonus checks, deck draws with reshuffle, treasure gain with
 * the state-based win check (gameplay.md §8.1/§9), seat arithmetic.
 */
import type { GameState, PlayerState, TreasureCard, Value } from './types.js';
import { BONUS_THRESHOLD_SOLO, BONUS_THRESHOLD_TEAM, CORNERS } from './types.js';
import { shuffle } from './rng.js';

export function playerAt(state: GameState, seat: number): PlayerState {
  const uid = state.seatOrder[seat];
  const p = uid !== undefined ? state.players[uid] : undefined;
  if (!p) throw new Error(`no player at seat ${seat}`);
  return p;
}

export function seatCount(state: GameState): number {
  return state.seatOrder.length;
}

/** Clockwise = ascending seat index (wraps). */
export function nextSeat(state: GameState, seat: number): number {
  return (seat + 1) % seatCount(state);
}

/** The Laggard sits immediately to the Master's RIGHT (gameplay.md §4). */
export function laggardSeat(state: GameState): number {
  return (state.masterSeat + seatCount(state) - 1) % seatCount(state);
}

/** Seats in clockwise order starting from `from` (inclusive). */
export function seatsFrom(state: GameState, from: number): number[] {
  const n = seatCount(state);
  return Array.from({ length: n }, (_, i) => (from + i) % n);
}

export function countValue(p: PlayerState, value: Value): number {
  let total = 0;
  for (const card of p.crew) total += card.grants[value] ?? 0;
  return total;
}

/** Sum of a combat profile across one or two ships. */
export function profileTotal(state: GameState, seats: number[], profile: Value[]): number {
  let total = 0;
  for (const s of seats) {
    const p = playerAt(state, s);
    for (const v of profile) total += countValue(p, v);
  }
  return total;
}

/** Bonus check at resolution (gameplay.md §6): ≥4 solo, ≥8 combined for a 2v2 team. */
export function bonusActive(state: GameState, seats: number[], icon: Value | null): boolean {
  if (icon === null) return false;
  const total = seats.reduce((acc, s) => acc + countValue(playerAt(state, s), icon), 0);
  return total >= (seats.length >= 2 ? BONUS_THRESHOLD_TEAM : BONUS_THRESHOLD_SOLO);
}

/** Draw one treasure; reshuffles the discard if needed; null when both are empty (fizzle). */
export function drawTreasure(state: GameState, rng: () => number): TreasureCard | null {
  if (state.treasureDeck.length === 0 && state.treasureDiscard.length > 0) {
    state.treasureDeck = shuffle(state.treasureDiscard, rng);
    state.treasureDiscard = [];
  }
  return state.treasureDeck.pop() ?? null;
}

/** Win condition: at least 1 of each of the 4 distinct corners (gameplay.md §8.1). */
export function hasAllCorners(p: PlayerState): boolean {
  return CORNERS.every((c) => p.treasures.some((t) => t.type === 'corner' && t.corner === c));
}

/**
 * Give a treasure card to a seat and run the state-based win check immediately
 * (gameplay.md §8.1: checked after ANY treasure gain, mid-effect included).
 * Returns true when the match just ended — callers must stop resolving.
 */
export function gainTreasure(state: GameState, seat: number, card: TreasureCard): boolean {
  const p = playerAt(state, seat);
  p.treasures.push(card);
  if (state.status === 'playing' && hasAllCorners(p)) {
    state.status = 'ended';
    state.winner = p.userId;
    state.stack = [];
    state.log.push({ text: `${p.displayName} détient les 4 coins de carte et remporte la partie !` });
    return true;
  }
  return false;
}

/** Random face-down steal target selection (server-side rng; gameplay.md §7.3). */
export function takeRandomTreasure(state: GameState, fromSeat: number, rng: () => number): TreasureCard | null {
  const victim = playerAt(state, fromSeat);
  if (victim.treasures.length === 0) return null;
  const i = Math.floor(rng() * victim.treasures.length);
  return victim.treasures.splice(i, 1)[0] ?? null;
}

export function log(state: GameState, text: string): void {
  state.log.push({ text });
  if (state.log.length > 100) state.log.splice(0, state.log.length - 100);
}
