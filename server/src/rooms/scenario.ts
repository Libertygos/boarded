/**
 * DEV-ONLY scenario harness (homelab #1764, rulebook captures).
 *
 * When BOARDED_SCENARIO=<path to a .json file> is set, START_MATCH builds the match from
 * that file instead of a random deal. Unset (production): this module is inert.
 *
 * Scenario file (all keys but `seats` optional):
 *   {
 *     "seed": 1764,                         // fixed seed (match rng + move-time rng)
 *     "seats": ["Anne", "Bruno", "Chloé", "David"], // seat order, clockwise; matched to
 *                                           //   the lobby players by display name
 *     "master": "Anne",                     // Maître du Vent of round 1 (Retardataire =
 *                                           //   the seat to the Master's right)
 *     "eventsTop": ["boarding-0", "recruit-matelot-0", ...],   // drawn first → last
 *     "treasuresTop": ["corner-HG-0", ...],                    // drawn first → last
 *     "players": { "Bruno": { "crew": ["recruit-canonnier-0"], "treasures": ["corner-BD-0"] } },
 *     "round": 5,                           // the first round played is this one (the
 *                                           //   Master named above is that round's Master)
 *     "eventDiscard": ["raid-sabres-0"],    // moved from the deck to the discard
 *     "treasureDiscard": ["curse-kraken-0"],
 *     "eventDeckOnly": true,                // the deck is exactly eventsTop: every other
 *     "treasureDeckOnly": true              //   card not dealt or discarded is out of play
 *   }
 * Card ids are the engine's own (data.ts buildEventDeck / buildTreasureDeck), e.g.
 * recruit-<kind>-<n>, boarding-<0..12>, raid-<value>-<n>, corner-<HG|HD|BG|BD>-<n>,
 * curse-<key>-<n>, talisman-<key>-<n>, talisman-contre-abordage-<value>.
 * Every listed card is taken out of its deck; the round-1 Retardataire draw is the first
 * of `treasuresTop`, the 4 round-1 events are the first 4 of `eventsTop`.
 */
import fs from 'node:fs';
import type { EventCard, GameState, RecruitCard, SeatInput, TreasureCard } from '@boarded/engine';

export interface Scenario {
  seed?: number;
  seats: string[];
  master?: string;
  eventsTop?: string[];
  treasuresTop?: string[];
  players?: Record<string, { crew?: string[]; treasures?: string[] }>;
  round?: number;
  eventDiscard?: string[];
  treasureDiscard?: string[];
  eventDeckOnly?: boolean;
  treasureDeckOnly?: boolean;
}

export function loadScenario(): Scenario | null {
  const file = process.env.BOARDED_SCENARIO;
  if (!file) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Scenario;
}

/** Reorder the lobby seats to the scenario's clockwise order (by display name). */
export function orderSeats(sc: Scenario, seats: SeatInput[]): SeatInput[] {
  const byName = new Map(seats.map((s) => [s.displayName, s]));
  const ordered = sc.seats.map((n) => byName.get(n));
  if (ordered.some((s) => !s) || ordered.length !== seats.length) {
    throw new Error(`scenario seats ${sc.seats.join(',')} do not match the lobby (${[...byName.keys()].join(',')})`);
  }
  return ordered as SeatInput[];
}

function take<T extends { id: string }>(deck: T[], id: string): T {
  const i = deck.findIndex((c) => c.id === id);
  if (i < 0) throw new Error(`scenario: card ${id} not in deck (unknown or used twice)`);
  return deck.splice(i, 1)[0]!;
}

/** createGame's `prepare` hook: stack the decks, seat the Master, deal crews and hands. */
export function prepareScenario(sc: Scenario): (state: GameState) => void {
  return (state) => {
    const seatOf = (name: string) => {
      const i = state.seatOrder.findIndex((uid) => state.players[uid]!.displayName === name);
      if (i < 0) throw new Error(`scenario: no seat named ${name}`);
      return i;
    };
    if (sc.master) state.masterSeat = seatOf(sc.master);
    if (sc.round && sc.round > 1) {
      // startRound() increments the round and, past round 0, passes the Master left.
      state.round = sc.round - 1;
      state.masterSeat = (state.masterSeat + state.seatOrder.length - 1) % state.seatOrder.length;
    }
    for (const [name, hand] of Object.entries(sc.players ?? {})) {
      const p = state.players[state.seatOrder[seatOf(name)]!]!;
      for (const id of hand.crew ?? []) p.crew.push(take(state.eventDeck, id) as RecruitCard);
      for (const id of hand.treasures ?? []) p.treasures.push(take(state.treasureDeck, id));
    }
    for (const id of sc.eventDiscard ?? []) state.eventDiscard.push(take(state.eventDeck, id));
    for (const id of sc.treasureDiscard ?? []) state.treasureDiscard.push(take(state.treasureDeck, id));
    const events: EventCard[] = (sc.eventsTop ?? []).map((id) => take(state.eventDeck, id));
    const treasures: TreasureCard[] = (sc.treasuresTop ?? []).map((id) => take(state.treasureDeck, id));
    if (sc.eventDeckOnly) state.eventDeck = [];
    if (sc.treasureDeckOnly) state.treasureDeck = [];
    // pop() draws from the end: the first listed card goes last.
    state.eventDeck.push(...events.reverse());
    state.treasureDeck.push(...treasures.reverse());
  };
}
