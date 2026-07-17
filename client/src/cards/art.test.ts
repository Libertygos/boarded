/**
 * Art resolver tests — every card in both full decks must resolve to an image that
 * actually exists on disk, and the value-based mapping must match the authoritative
 * table in progress_theme.md (filenames use role names that differ from engine roles).
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildEventDeck, buildTreasureDeck } from '@boarded/engine';
import type { BoardingCard, RecruitCard, TalismanCard, Value } from '@boarded/engine';
import {
  BACK_EVENTS,
  BACK_TREASURES,
  MAP_TREASURE,
  MASTER_OF_WINDS,
  eventArt,
  treasureArt,
  valueIcon,
} from './art.js';

const CARDS_DIR = path.resolve(process.cwd(), 'public');

function assertOnDisk(publicPath: string) {
  assert.ok(existsSync(path.join(CARDS_DIR, publicPath)), `missing image: ${publicPath}`);
}

test('every event card resolves to an existing master and w440 variant', () => {
  for (const card of buildEventDeck()) {
    const a = eventArt(card);
    assertOnDisk(a.png);
    assertOnDisk(a.webp);
  }
});

test('every treasure card resolves to an existing master and w440 variant', () => {
  for (const card of buildTreasureDeck()) {
    const a = treasureArt(card);
    assertOnDisk(a.png);
    assertOnDisk(a.webp);
  }
});

test('backs, role card, map and value icons exist', () => {
  for (const a of [BACK_EVENTS, BACK_TREASURES, MASTER_OF_WINDS, MAP_TREASURE]) {
    assertOnDisk(a.png);
    assertOnDisk(a.webp);
  }
  for (const v of ['canons', 'voiles', 'sabres', 'pistolets'] as Value[]) {
    assertOnDisk(valueIcon(v));
  }
});

test('recruit mapping is keyed by granted value, not by role name', () => {
  const deck = buildEventDeck();
  const byKind = (kind: string) =>
    deck.find((c): c is RecruitCard => c.type === 'recruit' && c.kind === kind)!;

  // Authoritative table (progress_theme.md): quartier-maitre (2 pistolets) → "deckhands",
  // matelots (2 sabres) → "quartermaster", matelot (1 sabre) → "officer",
  // officier (1 pistolet) → "deckhand".
  assert.equal(eventArt(byKind('capitaine')).name, 'recruitment_captain');
  assert.equal(eventArt(byKind('maitre-voilier')).name, 'recruitment_sailmaster');
  assert.equal(eventArt(byKind('maitre-canonnier')).name, 'recruitment_master_gunner');
  assert.equal(eventArt(byKind('quartier-maitre')).name, 'recruitment_deckhands');
  assert.equal(eventArt(byKind('matelots')).name, 'recruitment_quartermaster');
  assert.equal(eventArt(byKind('matelot')).name, 'recruitment_officer');
  assert.equal(eventArt(byKind('navigateur')).name, 'recruitment_navigator');
  assert.equal(eventArt(byKind('officier')).name, 'recruitment_deckhand');
  assert.equal(eventArt(byKind('canonnier')).name, 'recruitment_gunner');
});

test('boarding profiles map to the 10 shared scenes (sailors=pistolets, officers=sabres, sails=voiles)', () => {
  const cases: Array<[Value[], string]> = [
    [['canons', 'pistolets'], 'boarding_canons_sailors'],
    [['canons', 'sabres'], 'boarding_canons_officers'],
    [['voiles', 'pistolets'], 'boarding_sails_sailors'],
    [['sabres', 'pistolets'], 'boarding_officers_sailors'],
    [['sabres', 'voiles'], 'boarding_officers_sails'],
    [['canons', 'voiles'], 'boarding_canons_sails'],
    [['canons', 'voiles', 'pistolets'], 'boarding_canons_sails_sailors'],
    [['canons', 'sabres', 'pistolets'], 'boarding_canons_officers_sailors'],
    [['canons', 'sabres', 'voiles'], 'boarding_canons_officers_sails'],
    [['sabres', 'voiles', 'pistolets'], 'boarding_officers_sails_sailors'],
  ];
  for (const [profile, expected] of cases) {
    const card: BoardingCard = { id: 't', type: 'boarding', mode: '1v1', profile, bonusIcon: 'canons' };
    assert.equal(eventArt(card).name, expected, profile.join('+'));
  }
  // Profile order must not matter.
  const swapped: BoardingCard = {
    id: 't',
    type: 'boarding',
    mode: '2v2',
    profile: ['pistolets', 'canons', 'sabres'],
    bonusIcon: 'voiles',
  };
  assert.equal(eventArt(swapped).name, 'boarding_canons_officers_sailors');
});

test('raids map per bonus suit', () => {
  const deck = buildEventDeck();
  const raid = (v: Value) => deck.find((c) => c.type === 'raid' && c.bonusIcon === v)!;
  assert.equal(eventArt(raid('canons')).name, 'raid_canons');
  assert.equal(eventArt(raid('voiles')).name, 'raid_sails');
  assert.equal(eventArt(raid('sabres')).name, 'raid_officers');
  assert.equal(eventArt(raid('pistolets')).name, 'raid_sailors');
});

test('curses, talismans and corners map per the handoff table', () => {
  const deck = buildTreasureDeck();
  const curse = (k: string) => deck.find((c) => c.type === 'curse' && c.curse === k)!;
  assert.equal(treasureArt(curse('kraken')).name, 'curse_release_the_kraken');
  assert.equal(treasureArt(curse('tourbillon')).name, 'curse_whirlpool');
  assert.equal(treasureArt(curse('ile-brumeuse')).name, 'curse_foggy_island');
  assert.equal(treasureArt(curse('tempete')).name, 'curse_tempest_in_a_jar');
  assert.equal(treasureArt(curse('bateau-fantome')).name, 'curse_ghost_ship');

  const talisman = (k: string, v?: Value) =>
    deck.find(
      (c): c is TalismanCard => c.type === 'talisman' && c.talisman === k && (v === undefined || c.value === v),
    )!;
  assert.equal(treasureArt(talisman('singe-dore')).name, 'talisman_golden_monkey');
  assert.equal(treasureArt(talisman('longue-vue')).name, 'talisman_spyglass');
  assert.equal(treasureArt(talisman('coffre-piege')).name, 'talisman_trapped_chest');
  assert.equal(treasureArt(talisman('bijou-maudit')).name, 'talisman_cursed_jewel');
  assert.equal(treasureArt(talisman('contre-abordage', 'canons')).name, 'talisman_canon_counter_boarding');
  assert.equal(treasureArt(talisman('contre-abordage', 'voiles')).name, 'talisman_sail_counter_boarding');
  assert.equal(treasureArt(talisman('contre-abordage', 'sabres')).name, 'talisman_officer_counter_boarding');
  assert.equal(treasureArt(talisman('contre-abordage', 'pistolets')).name, 'talisman_sailor_counter_boarding');

  for (const c of deck.filter((c) => c.type === 'corner')) {
    assert.equal(treasureArt(c).name, 'map_treasure');
  }
});
