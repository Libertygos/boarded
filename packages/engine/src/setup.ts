/**
 * Match setup: shuffled decks, empty ships, random first Master (server-side random seat
 * replaces the physical "oldest player" rule — gameplay.md §4), then advance() to the
 * first input wait.
 */
import type { GameState } from './types.js';
import { MAX_PLAYERS, MIN_PLAYERS } from './types.js';
import { buildEventDeck, buildTreasureDeck } from './data.js';
import { makeRng, shuffle } from './rng.js';
import { advance } from './flow.js';

export interface SeatInput {
  userId: string;
  displayName: string;
}

export function createGame(matchId: string, seats: SeatInput[], seed: number): GameState {
  if (seats.length < MIN_PLAYERS || seats.length > MAX_PLAYERS) {
    throw new Error(`player count must be in [${MIN_PLAYERS}, ${MAX_PLAYERS}]`);
  }
  const rng = makeRng(seed);
  const state: GameState = {
    matchId,
    status: 'playing',
    winner: null,
    round: 0,
    seatOrder: seats.map((s) => s.userId),
    players: Object.fromEntries(
      seats.map((s) => [
        s.userId,
        { userId: s.userId, displayName: s.displayName, connected: true, crew: [], treasures: [] },
      ]),
    ),
    masterSeat: Math.floor(rng() * seats.length),
    eventDeck: shuffle(buildEventDeck(), rng),
    eventDiscard: [],
    treasureDeck: shuffle(buildTreasureDeck(), rng),
    treasureDiscard: [],
    revealed: [],
    pickQueue: [],
    stack: [],
    reveals: [],
    lastCombat: null,
    combatSeq: 0,
    log: [],
    logSeq: 0,
  };
  advance(state, rng);
  return state;
}
