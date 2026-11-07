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
 *     "players": { "Bruno": { "crew": ["recruit-canonnier-0"], "treasures": ["corner-BD-0"] } }
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
    for (const [name, hand] of Object.entries(sc.players ?? {})) {
      const p = state.players[state.seatOrder[seatOf(name)]!]!;
      for (const id of hand.crew ?? []) p.crew.push(take(state.eventDeck, id) as RecruitCard);
      for (const id of hand.treasures ?? []) p.treasures.push(take(state.treasureDeck, id));
    }
    // pop() draws from the end: the first listed card goes last.
    const events: EventCard[] = (sc.eventsTop ?? []).map((id) => take(state.eventDeck, id));
    state.eventDeck.push(...events.reverse());
    const treasures: TreasureCard[] = (sc.treasuresTop ?? []).map((id) => take(state.treasureDeck, id));
    state.treasureDeck.push(...treasures.reverse());
  };
}
