/**
 * CardImage — one game card: immutable art master + the overlay layer (style bible §5:
 * suit pips top-left, bonus badge top-right, title band, effect text band — game info
 * NEVER lives in the PNG). Purely presentational; interactivity is the parent's job
 * (wrap in a <button className="carte-btn">).
 *
 * Corner cards: full treasure map + a vermillion corner ring on the named corner
 * (ruling logged in progress_home.md — quadrant crops would strand the red X on 3 cards).
 */
import type { CardArt } from './art.js';
import {
  BACK_EVENTS,
  BACK_TREASURES,
  CORNER_POS,
  MASTER_OF_WINDS,
  eventArt,
  eventEffect,
  eventTitle,
  treasureArt,
  treasureEffect,
  treasureTitle,
  valueIcon,
} from './art.js';
import type { EventCard, TreasureCard, Value } from '@boarded/engine';
import { VALUE_LABEL } from '@boarded/engine';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

function Art({ art, alt, size }: { art: CardArt; alt: string; size: CardSize }) {
  // xs/sm/md render at ≤300px wide → the 440px webp is enough; lg (zoom) gets the master.
  const src = size === 'lg' ? art.png : art.webp;
  return <img className="carte-art" src={src} alt={alt} loading="lazy" draggable={false} />;
}

function Pip({ value }: { value: Value }) {
  return <img className="pip" src={valueIcon(value)} alt={VALUE_LABEL[value]} title={VALUE_LABEL[value]} />;
}

/** Suit pips, repeated per granted/profile value (captain: one per suit). */
function PipBand({ values }: { values: Value[] }) {
  if (values.length === 0) return null;
  return (
    <span className="carte-pips">
      {values.map((v, i) => (
        <Pip key={`${v}-${i}`} value={v} />
      ))}
    </span>
  );
}

/** Bonus-suit glyph in a small ensō ring with "+" (style bible §5). */
function BonusBadge({ value }: { value: Value }) {
  return (
    <span className="carte-bonus" title={`Bonus : ${VALUE_LABEL[value]}`}>
      <Pip value={value} />
      <span className="carte-bonus-plus">+</span>
    </span>
  );
}

function Frame({
  size,
  className,
  children,
}: {
  size: CardSize;
  className?: string;
  children: React.ReactNode;
}) {
  return <figure className={`carte-visuel carte-${size} ${className ?? ''}`}>{children}</figure>;
}

export function EventCardImage({ card, size = 'md' }: { card: EventCard; size?: CardSize }) {
  const art = eventArt(card);
  const title = eventTitle(card);
  const pips: Value[] =
    card.type === 'recruit'
      ? (Object.entries(card.grants) as Array<[Value, number]>).flatMap(([v, n]) => Array<Value>(n).fill(v))
      : card.type === 'boarding'
        ? card.profile
        : [];
  return (
    <Frame size={size}>
      <Art art={art} alt={title} size={size} />
      <PipBand values={pips} />
      {card.type !== 'recruit' && <BonusBadge value={card.bonusIcon} />}
      {card.type === 'boarding' && <span className="carte-mode">{card.mode}</span>}
      <figcaption className="carte-textes">
        <span className="carte-titre">{title}</span>
        <span className="carte-effet">{eventEffect(card)}</span>
      </figcaption>
    </Frame>
  );
}

export function TreasureCardImage({ card, size = 'md' }: { card: TreasureCard; size?: CardSize }) {
  const art = treasureArt(card);
  const title = treasureTitle(card);
  return (
    <Frame size={size} className={card.type === 'corner' ? 'carte-coin' : ''}>
      <Art art={art} alt={title} size={size} />
      {card.type === 'curse' && <BonusBadge value={card.bonusIcon} />}
      {card.type === 'talisman' && card.talisman === 'contre-abordage' && card.value && (
        <PipBand values={[card.value]} />
      )}
      {card.type === 'corner' && <span className="coin-marque" style={CORNER_POS[card.corner]} aria-hidden />}
      <figcaption className="carte-textes">
        <span className="carte-titre">{title}</span>
        <span className="carte-effet">{treasureEffect(card)}</span>
      </figcaption>
    </Frame>
  );
}

/** Face-down piles and the Master of Winds role marker. */
export function CardBack({
  kind,
  size = 'sm',
  count,
  label,
}: {
  kind: 'events' | 'treasures' | 'master';
  size?: CardSize;
  count?: number;
  label?: string;
}) {
  const art = kind === 'events' ? BACK_EVENTS : kind === 'treasures' ? BACK_TREASURES : MASTER_OF_WINDS;
  return (
    <div className="pile">
      <Frame size={size} className="carte-dos">
        <Art art={art} alt={label ?? ''} size={size} />
        {count !== undefined && <span className="carte-compte">{count}</span>}
      </Frame>
      {label && <span className="carte-legende">{label}</span>}
    </div>
  );
}
