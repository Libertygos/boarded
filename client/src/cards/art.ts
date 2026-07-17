/**
 * Art resolver — pure card → image mapping, keyed off granted VALUES, never off role
 * names (progress_theme.md: art filenames use role names that differ from engine roles;
 * the images show the correct objects in the correct suit colors).
 *
 * Suit → filename word translation: sailors=pistolets, officers=sabres, sails=voiles.
 * Masters live in /cards/<name>.png (880×1232, immutable); in-game variants in
 * /cards/w440/<name>.webp.
 */
import type { Corner, EventCard, TreasureCard, Value } from '@boarded/engine';
import { CORNER_LABEL, CURSE_LABEL, RECRUIT_LABEL, TALISMAN_LABEL, VALUE_LABEL } from '@boarded/engine';

export interface CardArt {
  /** Immutable 880×1232 master. */
  png: string;
  /** 440×616 webp for in-game rendering. */
  webp: string;
  name: string;
}

function art(name: string): CardArt {
  return { name, png: `/cards/${name}.png`, webp: `/cards/w440/${name}.webp` };
}

export const BACK_EVENTS = art('back_events');
export const BACK_TREASURES = art('back_treasures');
export const MASTER_OF_WINDS = art('master_of_winds');
export const MAP_TREASURE = art('map_treasure');

/** Cropped suit emblems from back_events.png (Jules's ruling: these are the value logos). */
export function valueIcon(v: Value): string {
  return `/cards/icons/value_${v}.png`;
}

// ---- recruits: resolved from grants (value + count), captain = all four ------------

const RECRUIT_ONE: Record<Value, string> = {
  sabres: 'recruitment_officer', // shows 1 jade saber
  voiles: 'recruitment_navigator',
  pistolets: 'recruitment_deckhand', // shows 1 plum pistol
  canons: 'recruitment_gunner',
};

const RECRUIT_TWO: Record<Value, string> = {
  sabres: 'recruitment_quartermaster', // shows 2 jade sabers
  voiles: 'recruitment_sailmaster',
  pistolets: 'recruitment_deckhands', // shows 2 plum pistols
  canons: 'recruitment_master_gunner',
};

// ---- boardings: one shared scene per value profile; filename suits sorted a→z -------

const SUIT_WORD: Record<Value, string> = {
  canons: 'canons',
  sabres: 'officers',
  voiles: 'sails',
  pistolets: 'sailors',
};

/** Counter-boarding talismans use the singular suit word. */
const SUIT_WORD_SINGULAR: Record<Value, string> = {
  canons: 'canon',
  sabres: 'officer',
  voiles: 'sail',
  pistolets: 'sailor',
};

/** Fixed suit order in boarding filenames: canons, officers, sails, sailors. */
const SUIT_FILE_ORDER: Value[] = ['canons', 'sabres', 'voiles', 'pistolets'];

function boardingName(profile: Value[]): string {
  const words = SUIT_FILE_ORDER.filter((v) => profile.includes(v)).map((v) => SUIT_WORD[v]);
  return `boarding_${words.join('_')}`;
}

// ---- curses / talismans --------------------------------------------------------------

const CURSE_ART: Record<string, string> = {
  kraken: 'curse_release_the_kraken',
  tourbillon: 'curse_whirlpool',
  'ile-brumeuse': 'curse_foggy_island',
  tempete: 'curse_tempest_in_a_jar',
  'bateau-fantome': 'curse_ghost_ship',
};

const TALISMAN_ART: Record<string, string> = {
  'singe-dore': 'talisman_golden_monkey',
  'longue-vue': 'talisman_spyglass',
  'coffre-piege': 'talisman_trapped_chest',
  'bijou-maudit': 'talisman_cursed_jewel',
};

// ---- public resolvers ------------------------------------------------------------------

export function eventArt(card: EventCard): CardArt {
  if (card.type === 'recruit') {
    const granted = (Object.entries(card.grants) as Array<[Value, number]>).filter(([, n]) => n > 0);
    if (granted.length >= 4) return art('recruitment_captain');
    const [value, count] = granted[0]!;
    return art((count >= 2 ? RECRUIT_TWO : RECRUIT_ONE)[value]);
  }
  if (card.type === 'raid') return art(`raid_${SUIT_WORD[card.bonusIcon]}`);
  return art(boardingName(card.profile));
}

export function treasureArt(card: TreasureCard): CardArt {
  if (card.type === 'corner') return MAP_TREASURE;
  if (card.type === 'curse') return art(CURSE_ART[card.curse]!);
  if (card.talisman === 'contre-abordage' && card.value) {
    return art(`talisman_${SUIT_WORD_SINGULAR[card.value]}_counter_boarding`);
  }
  return art(TALISMAN_ART[card.talisman] ?? TALISMAN_ART['bijou-maudit']!);
}

// ---- titles & effect text (overlay layer — game info never lives in the PNG) ----------

export function eventTitle(card: EventCard): string {
  if (card.type === 'recruit') return RECRUIT_LABEL[card.kind];
  if (card.type === 'raid') return 'Pillage';
  return 'Abordage';
}

export function treasureTitle(card: TreasureCard): string {
  if (card.type === 'corner') return CORNER_LABEL[card.corner];
  if (card.type === 'curse') return CURSE_LABEL[card.curse];
  if (card.talisman === 'contre-abordage' && card.value) {
    return `${TALISMAN_LABEL[card.talisman]} — ${VALUE_LABEL[card.value]}`;
  }
  return TALISMAN_LABEL[card.talisman];
}

function grantsText(card: EventCard & { type: 'recruit' }): string {
  return (Object.entries(card.grants) as Array<[Value, number]>)
    .filter(([, n]) => n > 0)
    .map(([v, n]) => `+${n} ${VALUE_LABEL[v]}`)
    .join(' · ');
}

export function eventEffect(card: EventCard): string {
  if (card.type === 'recruit') return `${grantsText(card)} pour votre équipage.`;
  if (card.type === 'raid') return 'Piochez 1 trésor. Bonus (≥4) : piochez-en 2.';
  return card.mode === '2v2'
    ? 'Choisissez un partenaire : totaux d’équipe, le plus haut l’emporte. Chaque vainqueur vole 1 trésor — 2 avec le bonus d’équipe (≥8).'
    : 'Désignez un navire : le total le plus haut l’emporte. Le vainqueur vole 1 trésor — 2 avec le bonus (≥4).';
}

const CURSE_EFFECT: Record<string, string> = {
  kraken: 'Quand un navire est abordé : volez 1 recrue à l’initiateur — 2 avec le bonus.',
  tourbillon: 'À la révélation des 4 événements : chaque adversaire défausse 1 recrue. Bonus : vous choisissez lesquelles.',
  'ile-brumeuse': 'Quand vous êtes abordé : vous vous échappez. Bonus : volez aussi 1 recrue à l’initiateur.',
  tempete: 'À la révélation des événements : devenez immédiatement Maître du Vent. Bonus : piochez 1 trésor.',
  'bateau-fantome': 'Quand un adversaire pioche via un Pillage : volez-lui 1 trésor par carte piochée — 1 de plus avec le bonus.',
};

const TALISMAN_EFFECT: Record<string, string> = {
  'singe-dore': 'Si volé : nommez un coin et un joueur — s’il le détient, il vous le remet. Bonus (≥4 Sabres) : interrogez 2 joueurs.',
  'longue-vue': 'Si volé : regardez tous les trésors d’un joueur de votre choix.',
  'coffre-piege': 'Si volé : le voleur défausse 1 de ses recrues.',
  'bijou-maudit': 'Si volé : piochez 1 trésor.',
};

export function treasureEffect(card: TreasureCard): string {
  if (card.type === 'corner') return 'Réunissez les 4 coins distincts de la carte pour gagner.';
  if (card.type === 'curse') return CURSE_EFFECT[card.curse] ?? '';
  if (card.talisman === 'contre-abordage') {
    const v = card.value ? VALUE_LABEL[card.value] : 'la valeur indiquée';
    return `Si volé : lancez aussitôt un abordage en ${v} seuls contre le joueur de votre choix.`;
  }
  return TALISMAN_EFFECT[card.talisman] ?? '';
}

/** Corner-highlight placement for corner cards (full-map treatment, ruling in progress_home.md). */
export const CORNER_POS: Record<Corner, { top?: string; bottom?: string; left?: string; right?: string }> = {
  HG: { top: '4%', left: '5%' },
  HD: { top: '4%', right: '5%' },
  BG: { bottom: '4%', left: '5%' },
  BD: { bottom: '4%', right: '5%' },
};
