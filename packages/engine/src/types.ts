/**
 * À l'abordage engine — core types. gameplay.md is the source of truth for all rules;
 * the deck tables in gameplay.md §2/§3/§7.3/§8 are authoritative for counts.
 */

export type UserId = string;
export type CardId = string;

// ---- Ship values (gameplay.md §3) -------------------------------------------

export const VALUES = ['sabres', 'voiles', 'canons', 'pistolets'] as const;
export type Value = (typeof VALUES)[number];

export type ValueCounts = Record<Value, number>;

// ---- Map corners (gameplay.md §8.1) -----------------------------------------

export const CORNERS = ['HG', 'BG', 'HD', 'BD'] as const;
export type Corner = (typeof CORNERS)[number];

// ---- Curses & talismans (gameplay.md §8.2 / §8.3) ----------------------------

export const CURSES = ['kraken', 'tourbillon', 'ile-brumeuse', 'tempete', 'bateau-fantome'] as const;
export type CurseKey = (typeof CURSES)[number];

export const TALISMANS = ['singe-dore', 'contre-abordage', 'longue-vue', 'coffre-piege', 'bijou-maudit'] as const;
export type TalismanKey = (typeof TALISMANS)[number];

// ---- Event cards (gameplay.md §7) --------------------------------------------

export type RecruitKind =
  | 'capitaine'
  | 'maitre-voilier'
  | 'maitre-canonnier'
  | 'quartier-maitre'
  | 'matelots'
  | 'matelot'
  | 'navigateur'
  | 'officier'
  | 'canonnier';

export interface RecruitCard {
  id: CardId;
  type: 'recruit';
  kind: RecruitKind;
  grants: Partial<ValueCounts>;
}

export interface RaidCard {
  id: CardId;
  type: 'raid';
  bonusIcon: Value;
}

export interface BoardingCard {
  id: CardId;
  type: 'boarding';
  mode: '1v1' | '2v2';
  /** Combat profile: the 2–3 values summed on each side. */
  profile: Value[];
  bonusIcon: Value;
}

export type EventCard = RecruitCard | RaidCard | BoardingCard;

// ---- Treasure cards (gameplay.md §8) ------------------------------------------

export interface CornerCard {
  id: CardId;
  type: 'corner';
  corner: Corner;
}

export interface CurseCard {
  id: CardId;
  type: 'curse';
  curse: CurseKey;
  bonusIcon: Value;
}

export interface TalismanCard {
  id: CardId;
  type: 'talisman';
  talisman: TalismanKey;
  /** Contre-Abordage only: the single combat value the counter-boarding uses. */
  value?: Value;
}

export type TreasureCard = CornerCard | CurseCard | TalismanCard;

// ---- Players & match state -----------------------------------------------------

export interface PlayerState {
  userId: UserId;
  displayName: string;
  connected: boolean;
  /** Public crew (recruit cards). Values derive exclusively from these. */
  crew: RecruitCard[];
  /** PRIVATE face-down treasure hand — NEVER serialized to other seats (gameplay.md §11). */
  treasures: TreasureCard[];
}

export type MatchStatus = 'playing' | 'ended';

/**
 * A pending interrupt frame — the top of `state.stack` names the seat whose input the
 * match is waiting on. Frames nest (boarding → curse window → talisman trigger → …).
 */
export type Frame =
  | { kind: 'pickEvent'; seat: number }
  | {
      kind: 'boardingTarget';
      seat: number;
      card: BoardingCard;
      /** true when the 2v2 card is downgraded to 1v1 at 2–3 players (gameplay.md §10). */
      as1v1: boolean;
    }
  | {
      kind: 'boardingResolve';
      /** Attacking side / defending side, as seat indices (1 or 2 each). */
      attackers: number[];
      defenders: number[];
      card: BoardingCard | null;
      /** Contre-Abordage: single-value profile, no bonus (gameplay.md §8.3). */
      profile: Value[];
      bonusIcon: Value | null;
      stealsPerWinner: number;
      /** Sub-state: which step of the boarding we're in. */
      step: 'kraken' | 'brumeuse' | 'combat' | 'tie' | 'steal';
      /** Kraken/Brumeuse window queues (seats yet to be asked). */
      queue: number[];
      /** Defenders who escaped via Île Brumeuse. */
      escaped: number[];
      /** Tie winner side once decided. */
      winners?: number[];
      losers?: number[];
    }
  | {
      kind: 'curseWindow';
      /** Trigger window id. */
      window: 'reveal' | 'raid';
      /** Seats yet to be asked, in Master order. */
      queue: number[];
      /** raid window context: the raider and how many treasures they drew. */
      raider?: number;
      drawnCount?: number;
    }
  | {
      /**
       * Pending steal operations, executed one at a time by advance() so a talisman
       * trigger can interrupt between two steals (gameplay.md §8.3).
       */
      kind: 'stealExec';
      ops: Array<{ thief: number; victim: number; count: number }>;
    }
  | {
      /** Choose N recruits from a player's crew (Kraken steal, Tourbillon, Coffre Piégé, Brumeuse bonus). */
      kind: 'chooseRecruit';
      seat: number;
      fromSeat: number;
      count: number;
      /** What happens to the chosen recruits. */
      action: 'steal' | 'discard';
      reason: 'kraken' | 'tourbillon' | 'coffre-piege' | 'brumeuse-bonus';
    }
  | {
      /** Tourbillon: iterate over other players; each (or the owner, on bonus) picks a discard. */
      kind: 'tourbillon';
      owner: number;
      ownerChooses: boolean;
      queue: number[];
    }
  | { kind: 'singeDore'; seat: number; remaining: number; asked: number[] }
  | { kind: 'contreAbordage'; seat: number; value: Value }
  | { kind: 'longueVue'; seat: number }
  | {
      /** 2v2 winning side chooses the winner↔loser pairing (gameplay.md §7.3). */
      kind: 'pairSteal';
      seat: number;
      winners: number[];
      losers: number[];
      stealsPerWinner: number;
    };

/** Public log entry (everything in it is public information). `id` is monotonic across
 * the whole match so clients can diff projections and announce only the new entries. */
export interface LogEntry {
  id: number;
  text: string;
}

export interface GameState {
  matchId: string;
  status: MatchStatus;
  winner: UserId | null;
  round: number;
  /** Clockwise seating; index = seat id. */
  seatOrder: UserId[];
  players: Record<UserId, PlayerState>;
  /** Master of the Wind, as a seat index. Laggard = seat to the Master's right. */
  masterSeat: number;
  eventDeck: EventCard[];
  eventDiscard: EventCard[];
  treasureDeck: TreasureCard[];
  treasureDiscard: TreasureCard[];
  /** This round's face-up revealed events, not yet picked. */
  revealed: EventCard[];
  /** Seats yet to pick this round, clockwise from the Master. */
  pickQueue: number[];
  /** Interrupt stack; top (last) frame is the active input wait. */
  stack: Frame[];
  /** Private unicast reveals for the server to drain (Longue-vue). Never projected. */
  reveals: PrivateReveal[];
  log: LogEntry[];
  /** Monotonic log-entry counter (survives the log's own size cap). */
  logSeq: number;
}

export interface PrivateReveal {
  to: UserId;
  kind: 'longue-vue';
  aboutSeat: number;
  treasures: TreasureCard[];
}

// ---- Moves (client → engine, seat always derived from the connection) -----------

export type Move =
  | { type: 'PICK_EVENT'; cardId: CardId }
  | { type: 'CHOOSE_BOARDING'; targetSeat: number; partnerSeat?: number }
  | { type: 'PLAY_CURSE'; cardId: CardId }
  | { type: 'PASS_CURSE' }
  | { type: 'MASTER_DECIDE'; side: 'attackers' | 'defenders' }
  | { type: 'CHOOSE_RECRUIT'; cardIds: CardId[] }
  | { type: 'SINGE_DORE'; corner: Corner; targetSeat: number }
  | { type: 'CONTRE_ABORDAGE'; targetSeat: number }
  | { type: 'LONGUE_VUE'; targetSeat: number }
  | { type: 'PAIR_STEAL'; pairing: Array<{ winner: number; loser: number }> };

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}

// ---- Seat bounds (gameplay.md §1: 2–4 players, 4 is reference) -------------------

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const DEFAULT_SEATS = 4;

/** Events revealed per round (always 4, gameplay.md §5). */
export const EVENTS_PER_ROUND = 4;

/** Bonus thresholds (gameplay.md §6). */
export const BONUS_THRESHOLD_SOLO = 4;
export const BONUS_THRESHOLD_TEAM = 8;
