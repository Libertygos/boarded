import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEventDeck, buildTreasureDeck } from './data.js';
import { createGame } from './setup.js';
import { advance, actingSeat, applyMove } from './flow.js';
import { project } from './projection.js';
import { makeRng } from './rng.js';
import { hasAllCorners, playerAt } from './state.js';
import type { BoardingCard, CornerCard, GameState, Move, RecruitCard, TreasureCard } from './types.js';

describe('deck inventory (gameplay.md §2)', () => {
  it('event deck is 97: 76 recruits, 13 boardings, 8 raids', () => {
    const deck = buildEventDeck();
    assert.equal(deck.length, 97);
    assert.equal(deck.filter((c) => c.type === 'recruit').length, 76);
    assert.equal(deck.filter((c) => c.type === 'boarding').length, 13);
    assert.equal(deck.filter((c) => c.type === 'raid').length, 8);
    assert.equal(new Set(deck.map((c) => c.id)).size, 97);
  });
  it('treasure deck is 41: 20 corners, 10 curses, 11 talismans', () => {
    const deck = buildTreasureDeck();
    assert.equal(deck.length, 41);
    assert.equal(deck.filter((c) => c.type === 'corner').length, 20);
    assert.equal(deck.filter((c) => c.type === 'curse').length, 10);
    assert.equal(deck.filter((c) => c.type === 'talisman').length, 11);
  });
});

// ---- helpers -----------------------------------------------------------------------

const uids = ['u0', 'u1', 'u2', 'u3'];

function recruit(kind: 'matelot' | 'canonnier' | 'navigateur' | 'officier', n: number): RecruitCard[] {
  const grants = { matelot: { sabres: 1 }, canonnier: { canons: 1 }, navigateur: { voiles: 1 }, officier: { pistolets: 1 } }[
    kind
  ];
  return Array.from({ length: n }, (_, i) => ({
    id: `t-${kind}-${i}-${Math.floor(Math.random() * 1e9)}`,
    type: 'recruit' as const,
    kind,
    grants,
  }));
}

function corner(c: 'HG' | 'BG' | 'HD' | 'BD', tag = ''): CornerCard {
  return { id: `t-corner-${c}${tag}`, type: 'corner', corner: c };
}

/** Minimal controlled state: empty decks, no revealed events, master at seat 0. */
function makeState(n: number): GameState {
  return {
    matchId: 'test',
    status: 'playing',
    winner: null,
    round: 1,
    seatOrder: uids.slice(0, n),
    players: Object.fromEntries(
      uids.slice(0, n).map((u) => [u, { userId: u, displayName: u, connected: true, crew: [], treasures: [] }]),
    ),
    masterSeat: 0,
    eventDeck: [],
    eventDiscard: [],
    treasureDeck: [],
    treasureDiscard: [],
    revealed: [],
    pickQueue: [],
    stack: [],
    reveals: [],
    log: [],
  };
}

const boarding1v1CanonsPistolets: BoardingCard = {
  id: 'test-boarding',
  type: 'boarding',
  mode: '1v1',
  profile: ['canons', 'pistolets'],
  bonusIcon: 'voiles',
};

/**
 * Puts a boarding pick in front of seat 0 and drives it to the target designation.
 * A second dummy pick keeps the round open so assertions run before the next round's
 * reshuffles/draws kick in.
 */
function startBoarding(state: GameState, card: BoardingCard, rng: () => number): void {
  state.revealed = [card, ...recruit('matelot', 1)];
  state.pickQueue = [0, 1];
  advance(state, rng);
  applyMove(state, 'u0', { type: 'PICK_EVENT', cardId: card.id }, rng);
}

describe('boarding (gameplay.md §7.3)', () => {
  it('1v1: higher profile total wins and steals 1 random treasure', () => {
    const rng = makeRng(7);
    const state = makeState(2);
    playerAt(state, 0).crew = recruit('canonnier', 3);
    playerAt(state, 1).treasures = [corner('HG')];
    startBoarding(state, boarding1v1CanonsPistolets, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    assert.equal(playerAt(state, 0).treasures.length, 1);
    assert.equal(playerAt(state, 1).treasures.length, 0);
  });

  it('winner bonus (≥4 of bonus icon) steals 2', () => {
    const rng = makeRng(7);
    const state = makeState(2);
    playerAt(state, 0).crew = [...recruit('canonnier', 3), ...recruit('navigateur', 4)]; // 4 voiles = bonus
    playerAt(state, 1).treasures = [corner('HG'), corner('BG'), corner('HD')];
    startBoarding(state, boarding1v1CanonsPistolets, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    assert.equal(playerAt(state, 0).treasures.length, 2);
  });

  it('tie (0 vs 0) goes to the Master, who may pick the defender', () => {
    const rng = makeRng(7);
    const state = makeState(3);
    state.masterSeat = 2;
    playerAt(state, 0).treasures = [corner('HG')];
    state.revealed = [boarding1v1CanonsPistolets];
    state.pickQueue = [0];
    advance(state, rng);
    applyMove(state, 'u0', { type: 'PICK_EVENT', cardId: boarding1v1CanonsPistolets.id }, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    // masters decides
    assert.equal(actingSeat(state), 2);
    applyMove(state, 'u2', { type: 'MASTER_DECIDE', side: 'defenders' }, rng);
    assert.equal(playerAt(state, 1).treasures.length, 1); // defender stole the attacker's corner
  });

  it('Île Brumeuse escape cancels a 1v1 boarding entirely', () => {
    const rng = makeRng(7);
    const state = makeState(2);
    playerAt(state, 0).crew = recruit('canonnier', 3);
    const brumeuse: TreasureCard = { id: 'c-brum', type: 'curse', curse: 'ile-brumeuse', bonusIcon: 'voiles' };
    playerAt(state, 1).treasures = [corner('HG'), brumeuse];
    startBoarding(state, boarding1v1CanonsPistolets, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    // defender's brumeuse window
    assert.equal(actingSeat(state), 1);
    applyMove(state, 'u1', { type: 'PLAY_CURSE', cardId: 'c-brum' }, rng);
    assert.equal(playerAt(state, 1).treasures.length, 1); // corner kept, curse discarded, no steal
    assert.equal(playerAt(state, 0).treasures.length, 0);
    assert.deepEqual(state.stack, [{ kind: 'pickEvent', seat: 1 }]); // boarding fully unwound
  });

  it('stolen Coffre Piégé forces the thief to discard a recruit (thief keeps the chest)', () => {
    const rng = makeRng(7);
    const state = makeState(2);
    playerAt(state, 0).crew = recruit('canonnier', 3);
    const chest: TreasureCard = { id: 't-chest', type: 'talisman', talisman: 'coffre-piege' };
    playerAt(state, 1).treasures = [chest];
    startBoarding(state, boarding1v1CanonsPistolets, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    // thief must choose a recruit to discard
    assert.equal(actingSeat(state), 0);
    const crewId = playerAt(state, 0).crew[0]!.id;
    applyMove(state, 'u0', { type: 'CHOOSE_RECRUIT', cardIds: [crewId] }, rng);
    assert.equal(playerAt(state, 0).crew.length, 2);
    assert.equal(playerAt(state, 0).treasures.length, 1); // kept the chest
    assert.ok(state.eventDiscard.some((c) => c.id === crewId)); // discarded recruit → event discard
  });

  it('win check fires mid-steal: stealing the 4th distinct corner ends the match', () => {
    const rng = makeRng(7);
    const state = makeState(2);
    playerAt(state, 0).crew = recruit('canonnier', 3);
    playerAt(state, 0).treasures = [corner('HG'), corner('BG'), corner('HD')];
    playerAt(state, 1).treasures = [corner('BD')];
    startBoarding(state, boarding1v1CanonsPistolets, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    assert.equal(state.status, 'ended');
    assert.equal(state.winner, 'u0');
    assert.ok(hasAllCorners(playerAt(state, 0)));
  });
});

describe('projection (gameplay.md §11)', () => {
  it('never serializes another seat\'s treasure hand; counts are public', () => {
    const state = makeState(3);
    playerAt(state, 1).treasures = [corner('HG'), corner('BG')];
    const proj = project(state, 'u0');
    const opp = proj.opponents.find((o) => o.seatId === 1)!;
    assert.equal(opp.treasureCount, 2);
    assert.ok(!('treasures' in opp));
    assert.ok(!JSON.stringify(proj).includes('t-corner-HG'));
  });

  it('does not attribute a curse-window wait to a seat', () => {
    const rng = makeRng(7);
    const state = makeState(3);
    playerAt(state, 0).crew = recruit('canonnier', 3);
    const kraken: TreasureCard = { id: 'c-krak', type: 'curse', curse: 'kraken', bonusIcon: 'canons' };
    playerAt(state, 2).treasures = [kraken];
    startBoarding(state, boarding1v1CanonsPistolets, rng);
    applyMove(state, 'u0', { type: 'CHOOSE_BOARDING', targetSeat: 1 }, rng);
    // seat 2's kraken window is open
    assert.equal(actingSeat(state), 2);
    const projOther = project(state, 'u1');
    assert.deepEqual(projOther.pending, { kind: 'wait', seat: null });
    const projOwner = project(state, 'u2');
    assert.equal(projOwner.pending.kind, 'curseWindow');
  });
});

describe('full match smoke (seeded bot)', () => {
  for (const players of [2, 3, 4]) {
    it(`plays a ${players}-player match to completion without violations`, () => {
      const rng = makeRng(42 + players);
      const state = createGame('smoke', uids.slice(0, players).map((u) => ({ userId: u, displayName: u })), 1000 + players);
      let moves = 0;
      while (state.status === 'playing' && moves < 20_000) {
        const seat = actingSeat(state);
        assert.notEqual(seat, null, 'engine must always wait on someone while playing');
        const uid = state.seatOrder[seat!]!;
        const proj = project(state, uid);
        const move = botMove(proj, state, seat!);
        applyMove(state, uid, move, rng);
        moves++;
      }
      assert.equal(state.status, 'ended', `match should end (made ${moves} moves)`);
      assert.ok(state.winner !== null);
      assert.ok(hasAllCorners(state.players[state.winner!]!));
    });
  }
});

/** A simple legal-move bot driven only by the projection (like a real client). */
function botMove(proj: ReturnType<typeof project>, state: GameState, seat: number): Move {
  const p = proj.pending;
  switch (p.kind) {
    case 'pickEvent':
      return { type: 'PICK_EVENT', cardId: proj.revealed[0]!.id };
    case 'boardingTarget': {
      const others = proj.opponents.map((o) => o.seatId);
      if ((p.card as BoardingCard).mode === '2v2' && !p.as1v1) {
        return { type: 'CHOOSE_BOARDING', targetSeat: others[0]!, partnerSeat: others[1]! };
      }
      return { type: 'CHOOSE_BOARDING', targetSeat: others[0]! };
    }
    case 'curseWindow':
      // play curses half the time to exercise the effects
      return p.playable.length > 0 && proj.round % 2 === 0
        ? { type: 'PLAY_CURSE', cardId: p.playable[0]! }
        : { type: 'PASS_CURSE' };
    case 'masterTie':
      return { type: 'MASTER_DECIDE', side: 'attackers' };
    case 'chooseRecruit':
      return { type: 'CHOOSE_RECRUIT', cardIds: p.choices.slice(0, p.count).map((c) => c.id) };
    case 'singeDore': {
      const target = proj.opponents.map((o) => o.seatId).find((s) => !p.asked.includes(s))!;
      return { type: 'SINGE_DORE', corner: 'HG', targetSeat: target };
    }
    case 'contreAbordage':
      return { type: 'CONTRE_ABORDAGE', targetSeat: proj.opponents[0]!.seatId };
    case 'longueVue':
      return { type: 'LONGUE_VUE', targetSeat: proj.opponents[0]!.seatId };
    case 'pairSteal': {
      const pairing = p.winners.map((w, i) => ({ winner: w, loser: p.losers[i % p.losers.length]! }));
      return { type: 'PAIR_STEAL', pairing };
    }
    default:
      throw new Error(`bot cannot act on pending ${p.kind} (seat ${seat}, stack ${JSON.stringify(state.stack)})`);
  }
}
