/** @boarded/engine — pure rules/state for À l'abordage. No I/O. Public barrel. */
export * from './types.js';
export * from './rng.js';
export {
  VALUE_LABEL,
  CORNER_LABEL,
  RECRUIT_LABEL,
  CURSE_LABEL,
  TALISMAN_LABEL,
  buildEventDeck,
  buildTreasureDeck,
} from './data.js';
export {
  playerAt,
  seatCount,
  nextSeat,
  laggardSeat,
  seatsFrom,
  countValue,
  profileTotal,
  bonusActive,
  hasAllCorners,
  hasCaptain,
  stealableCrew,
} from './state.js';
export { advance, applyMove, actingSeat } from './flow.js';
export { createGame, type SeatInput } from './setup.js';
export {
  project,
  type PlayerProjection,
  type SelfView,
  type OpponentView,
  type PendingView,
  type BoardingView,
} from './projection.js';
