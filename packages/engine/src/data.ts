/**
 * Card inventory — authoritative counts from gameplay.md §2/§3/§7.3/§8.
 * Event deck: 97 (76 recruitments, 13 boardings, 8 raids). Treasure deck: 41
 * (20 corners, 10 curses, 11 talismans).
 */
import type {
  BoardingCard,
  Corner,
  CurseKey,
  EventCard,
  RecruitCard,
  RecruitKind,
  TreasureCard,
  Value,
  ValueCounts,
} from './types.js';

// ---- Display labels (French, per gameplay.md) ---------------------------------

export const VALUE_LABEL: Record<Value, string> = {
  sabres: 'Sabres',
  voiles: 'Voiles',
  canons: 'Canons',
  pistolets: 'Pistolets',
};

export const CORNER_LABEL: Record<Corner, string> = {
  HG: 'Coin Haut-Gauche',
  BG: 'Coin Bas-Gauche',
  HD: 'Coin Haut-Droit',
  BD: 'Coin Bas-Droit',
};

export const RECRUIT_LABEL: Record<RecruitKind, string> = {
  capitaine: 'Capitaine',
  'maitre-voilier': 'Maître Voilier',
  'maitre-canonnier': 'Maître Canonnier',
  'quartier-maitre': 'Quartier-maître',
  matelots: 'Matelots',
  matelot: 'Matelot',
  navigateur: 'Navigateur',
  officier: 'Officier',
  canonnier: 'Canonnier',
};

export const CURSE_LABEL: Record<CurseKey, string> = {
  kraken: 'Libérez le Kraken',
  tourbillon: 'Tourbillon',
  'ile-brumeuse': 'Île Brumeuse',
  tempete: 'Tempête en Bouteille',
  'bateau-fantome': 'Bateau Fantôme',
};

export const TALISMAN_LABEL = {
  'singe-dore': 'Singe Doré',
  'contre-abordage': 'Contre-Abordage',
  'longue-vue': 'Longue-vue',
  'coffre-piege': 'Coffre Piégé',
  'bijou-maudit': 'Bijou Maudit',
} as const;

// ---- Recruitment inventory (gameplay.md §3, 76 cards) ---------------------------

const RECRUITS: Array<{ kind: RecruitKind; count: number; grants: Partial<ValueCounts> }> = [
  { kind: 'capitaine', count: 4, grants: { sabres: 1, voiles: 1, canons: 1, pistolets: 1 } },
  { kind: 'maitre-voilier', count: 7, grants: { voiles: 2 } },
  { kind: 'maitre-canonnier', count: 7, grants: { canons: 2 } },
  { kind: 'quartier-maitre', count: 7, grants: { pistolets: 2 } },
  { kind: 'matelots', count: 7, grants: { sabres: 2 } },
  { kind: 'matelot', count: 11, grants: { sabres: 1 } },
  { kind: 'navigateur', count: 11, grants: { voiles: 1 } },
  { kind: 'officier', count: 11, grants: { pistolets: 1 } },
  { kind: 'canonnier', count: 11, grants: { canons: 1 } },
];

// ---- Boarding inventory (gameplay.md §7.3, 13 cards) -----------------------------

const BOARDINGS: Array<{ mode: '1v1' | '2v2'; profile: Value[]; bonusIcon: Value }> = [
  { mode: '1v1', profile: ['canons', 'pistolets'], bonusIcon: 'voiles' },
  { mode: '1v1', profile: ['canons', 'sabres'], bonusIcon: 'pistolets' },
  { mode: '1v1', profile: ['pistolets', 'voiles'], bonusIcon: 'canons' },
  { mode: '1v1', profile: ['pistolets', 'sabres'], bonusIcon: 'canons' },
  { mode: '1v1', profile: ['voiles', 'sabres'], bonusIcon: 'canons' },
  { mode: '1v1', profile: ['canons', 'pistolets', 'voiles'], bonusIcon: 'sabres' },
  { mode: '1v1', profile: ['canons', 'pistolets', 'sabres'], bonusIcon: 'voiles' },
  { mode: '1v1', profile: ['canons', 'voiles', 'sabres'], bonusIcon: 'pistolets' },
  { mode: '1v1', profile: ['pistolets', 'voiles', 'sabres'], bonusIcon: 'canons' },
  { mode: '2v2', profile: ['canons', 'voiles'], bonusIcon: 'pistolets' },
  { mode: '2v2', profile: ['canons', 'pistolets', 'voiles'], bonusIcon: 'sabres' },
  { mode: '2v2', profile: ['canons', 'pistolets', 'sabres'], bonusIcon: 'voiles' },
  { mode: '2v2', profile: ['voiles', 'sabres'], bonusIcon: 'canons' },
];

// ---- Curse inventory (gameplay.md §8.2, 2 of each) --------------------------------

const CURSE_ICONS: Record<CurseKey, Value> = {
  kraken: 'canons',
  tourbillon: 'pistolets',
  'ile-brumeuse': 'voiles',
  tempete: 'sabres',
  'bateau-fantome': 'pistolets',
};

// ---- Deck builders -----------------------------------------------------------------

/** 97 event cards, unshuffled (the caller shuffles with the match rng). */
export function buildEventDeck(): EventCard[] {
  const deck: EventCard[] = [];
  for (const r of RECRUITS) {
    for (let i = 0; i < r.count; i++) {
      const card: RecruitCard = { id: `recruit-${r.kind}-${i}`, type: 'recruit', kind: r.kind, grants: r.grants };
      deck.push(card);
    }
  }
  BOARDINGS.forEach((b, i) => {
    const card: BoardingCard = {
      id: `boarding-${i}`,
      type: 'boarding',
      mode: b.mode,
      profile: b.profile,
      bonusIcon: b.bonusIcon,
    };
    deck.push(card);
  });
  (['sabres', 'voiles', 'canons', 'pistolets'] as Value[]).forEach((v) => {
    for (let i = 0; i < 2; i++) deck.push({ id: `raid-${v}-${i}`, type: 'raid', bonusIcon: v });
  });
  return deck;
}

/** 41 treasure cards, unshuffled. */
export function buildTreasureDeck(): TreasureCard[] {
  const deck: TreasureCard[] = [];
  (['HG', 'BG', 'HD', 'BD'] as Corner[]).forEach((c) => {
    for (let i = 0; i < 5; i++) deck.push({ id: `corner-${c}-${i}`, type: 'corner', corner: c });
  });
  (Object.keys(CURSE_ICONS) as CurseKey[]).forEach((k) => {
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `curse-${k}-${i}`, type: 'curse', curse: k, bonusIcon: CURSE_ICONS[k] });
    }
  });
  deck.push({ id: 'talisman-singe-dore-0', type: 'talisman', talisman: 'singe-dore' });
  (['canons', 'sabres', 'voiles', 'pistolets'] as Value[]).forEach((v) => {
    deck.push({ id: `talisman-contre-abordage-${v}`, type: 'talisman', talisman: 'contre-abordage', value: v });
  });
  for (let i = 0; i < 2; i++) deck.push({ id: `talisman-longue-vue-${i}`, type: 'talisman', talisman: 'longue-vue' });
  for (let i = 0; i < 2; i++) deck.push({ id: `talisman-coffre-piege-${i}`, type: 'talisman', talisman: 'coffre-piege' });
  for (let i = 0; i < 2; i++) deck.push({ id: `talisman-bijou-maudit-${i}`, type: 'talisman', talisman: 'bijou-maudit' });
  return deck;
}
