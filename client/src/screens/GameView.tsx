/**
 * GameView — the gameroom. Renders ONLY the per-seat projection the server sends and
 * emits Move messages. Placeholder styling (no art/theme yet): cards are labelled tiles.
 */
import { useEffect, useMemo, useState } from 'react';
import type {
  BoardingCard,
  Corner,
  EventCard,
  Move,
  PlayerProjection,
  PrivateReveal,
  TreasureCard,
  Value,
} from '@boarded/engine';
import { CORNERS, CORNER_LABEL, CURSE_LABEL, RECRUIT_LABEL, TALISMAN_LABEL, VALUE_LABEL, VALUES } from '@boarded/engine';
import { fr } from '../i18n/fr.js';

export function GameView({
  proj,
  send,
  banner,
  rejectNonce,
  reveal,
  onRevealDismiss,
  onExit,
}: {
  proj: PlayerProjection;
  send: (move: Move) => void;
  banner: string | null;
  rejectNonce: number;
  reveal: PrivateReveal | null;
  onRevealDismiss: () => void;
  onExit: () => void;
}) {
  /** Debounce: one move in flight until the next projection (or a rejection) arrives. */
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [proj, rejectNonce]);
  const act = (move: Move) => {
    if (busy) return;
    setBusy(true);
    send(move);
  };

  const nameOf = useMemo(() => {
    const names = new Map<number, string>();
    names.set(proj.self.seatId, `${proj.self.displayName} (${fr.jeu.vous})`);
    for (const o of proj.opponents) names.set(o.seatId, o.displayName);
    return (seat: number) => names.get(seat) ?? `Siège ${seat + 1}`;
  }, [proj]);

  const over = proj.status === 'ended';

  return (
    <div className="jeu">
      <header className="jeu-entete">
        <h2 className="titre">{fr.appName}</h2>
        <span>{fr.jeu.manche(proj.round)}</span>
        <span className="texte-faible">
          {fr.jeu.maitre} : {nameOf(proj.masterSeat)} · {fr.jeu.retardataire} : {nameOf(proj.laggardSeat)}
        </span>
        <span className="texte-faible">
          Événements : {proj.eventDeckCount} · Trésors : {proj.treasureDeckCount}
        </span>
      </header>

      {banner && (
        <p className="erreur" role="alert">
          {banner}
        </p>
      )}

      <section className="rang-navires">
        <ShipPanel
          title={nameOf(proj.self.seatId)}
          values={proj.self.values}
          crew={proj.self.crew.map((c) => RECRUIT_LABEL[c.kind])}
          treasureInfo={fr.jeu.cartesEnMain(proj.self.treasures.length)}
          me
          connected
          badges={shipBadges(proj, proj.self.seatId)}
        />
        {proj.opponents.map((o) => (
          <ShipPanel
            key={o.seatId}
            title={o.displayName}
            values={o.values}
            crew={o.crew.map((c) => RECRUIT_LABEL[c.kind])}
            treasureInfo={fr.jeu.cartesEnMain(o.treasureCount)}
            connected={o.connected}
            badges={shipBadges(proj, o.seatId)}
          />
        ))}
      </section>

      <section>
        <h3>{fr.jeu.evenements}</h3>
        <div className="cartes">
          {proj.revealed.length === 0 && <span className="texte-faible">—</span>}
          {proj.revealed.map((card) => (
            <button
              key={card.id}
              className={`carte ${proj.pending.kind === 'pickEvent' ? 'cliquable' : ''}`}
              disabled={proj.pending.kind !== 'pickEvent' || busy}
              onClick={() => act({ type: 'PICK_EVENT', cardId: card.id })}
            >
              {eventLabel(card)}
            </button>
          ))}
        </div>
      </section>

      <PendingPrompt proj={proj} busy={busy} act={act} nameOf={nameOf} />

      <section>
        <h3>{fr.jeu.tresors}</h3>
        <div className="cartes">
          {proj.self.treasures.length === 0 && <span className="texte-faible">{fr.jeu.mainVide}</span>}
          {proj.self.treasures.map((t) => (
            <span key={t.id} className={`carte ${treasureClass(t)}`}>
              {treasureLabel(t)}
            </span>
          ))}
        </div>
      </section>

      <section className="journal" aria-label={fr.jeu.journal}>
        {proj.log.map((entry, i) => (
          <p key={i}>{entry.text}</p>
        ))}
      </section>

      {reveal && (
        <div className="voile" onClick={onRevealDismiss}>
          <div className="panneau" onClick={(e) => e.stopPropagation()}>
            <h3>{fr.jeu.revelation(nameOf(reveal.aboutSeat))}</h3>
            <div className="cartes">
              {reveal.treasures.length === 0 && <span className="texte-faible">{fr.jeu.mainVide}</span>}
              {reveal.treasures.map((t) => (
                <span key={t.id} className={`carte ${treasureClass(t)}`}>
                  {treasureLabel(t)}
                </span>
              ))}
            </div>
            <button className="btn" onClick={onRevealDismiss}>
              {fr.jeu.fermer}
            </button>
          </div>
        </div>
      )}

      {over && (
        <div className="voile">
          <div className="panneau" style={{ textAlign: 'center' }}>
            <h2>
              {fr.jeu.gagnant(
                proj.winner === proj.self.userId
                  ? proj.self.displayName
                  : (proj.opponents.find((o) => o.userId === proj.winner)?.displayName ?? '???'),
              )}
            </h2>
            <button className="btn btn-primaire" onClick={onExit}>
              {fr.jeu.retourAccueil}
            </button>
          </div>
        </div>
      )}

      {!over && (
        <button className="btn btn-nu" onClick={onExit}>
          {fr.jeu.quitter}
        </button>
      )}
    </div>
  );
}

// ---- ships -----------------------------------------------------------------------

function shipBadges(proj: PlayerProjection, seat: number): string[] {
  const badges: string[] = [];
  if (seat === proj.masterSeat) badges.push(fr.jeu.maitre);
  if (seat === proj.laggardSeat) badges.push(fr.jeu.retardataire);
  if (proj.boarding) {
    if (proj.boarding.attackers.includes(seat)) badges.push('⚔ attaque');
    else if (proj.boarding.defenders.includes(seat) && !proj.boarding.escaped.includes(seat)) badges.push('🛡 défend');
  }
  return badges;
}

function ShipPanel({
  title,
  values,
  crew,
  treasureInfo,
  me,
  connected,
  badges,
}: {
  title: string;
  values: Record<Value, number>;
  crew: string[];
  treasureInfo: string;
  me?: boolean;
  connected: boolean;
  badges: string[];
}) {
  const crewCounts = new Map<string, number>();
  for (const label of crew) crewCounts.set(label, (crewCounts.get(label) ?? 0) + 1);
  return (
    <article className={`navire ${me ? 'moi' : ''}`}>
      <div className="entete-navire">
        <strong>{title}</strong>
        <span className="texte-faible">
          {badges.map((b) => (
            <span key={b} className="badge">
              {b}{' '}
            </span>
          ))}
          {!connected && <span className="etat-deco">⚠ déco</span>}
        </span>
      </div>
      <div className="valeurs">
        {VALUES.map((v) => (
          <span key={v}>
            {VALUE_LABEL[v]} <b>{values[v]}</b>
          </span>
        ))}
      </div>
      <div className="texte-faible" style={{ fontSize: '0.85em' }}>
        {[...crewCounts.entries()].map(([label, n]) => `${label}${n > 1 ? ` ×${n}` : ''}`).join(', ') || '(aucune recrue)'}
        {' · '}
        {treasureInfo}
      </div>
    </article>
  );
}

// ---- pending prompt ----------------------------------------------------------------

function PendingPrompt({
  proj,
  busy,
  act,
  nameOf,
}: {
  proj: PlayerProjection;
  busy: boolean;
  act: (m: Move) => void;
  nameOf: (seat: number) => string;
}) {
  const p = proj.pending;
  const [selected, setSelected] = useState<string[]>([]);
  const [corner, setCorner] = useState<Corner | null>(null);
  useEffect(() => {
    setSelected([]);
    setCorner(null);
  }, [proj]);

  if (proj.status === 'ended' || p.kind === 'none') return null;

  const opponents = proj.opponents.map((o) => o.seatId);

  switch (p.kind) {
    case 'wait':
      return (
        <div className="prompt" style={{ borderColor: 'var(--filet)' }}>
          <span className="texte-faible">{p.seat === null ? fr.jeu.enAttenteGenerique : fr.jeu.enAttente(nameOf(p.seat))}</span>
        </div>
      );
    case 'pickEvent':
      return (
        <div className="prompt">
          <strong>{fr.jeu.choisirEvenement}</strong>
        </div>
      );
    case 'boardingTarget': {
      const card = p.card as BoardingCard;
      const is2v2 = card.mode === '2v2' && !p.as1v1;
      return (
        <div className="prompt">
          <strong>{is2v2 ? fr.jeu.choisirPartenaire : fr.jeu.choisirCible}</strong>
          <span className="texte-faible">{eventLabel(card)}</span>
          <div className="choix">
            {opponents.map((s) => (
              <button
                key={s}
                className="btn"
                disabled={busy}
                onClick={() => {
                  if (is2v2) {
                    const others = opponents.filter((o) => o !== s);
                    act({ type: 'CHOOSE_BOARDING', targetSeat: others[0]!, partnerSeat: s });
                  } else {
                    act({ type: 'CHOOSE_BOARDING', targetSeat: s });
                  }
                }}
              >
                {nameOf(s)}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'curseWindow': {
      const cardById = new Map(proj.self.treasures.map((t) => [t.id, t]));
      return (
        <div className="prompt">
          <strong>{fr.jeu.fenetreMaledictionTitre}</strong>
          <div className="choix">
            {p.playable.map((id) => (
              <button key={id} className="btn" disabled={busy} onClick={() => act({ type: 'PLAY_CURSE', cardId: id })}>
                {treasureLabel(cardById.get(id))}
              </button>
            ))}
            <button className="btn btn-nu" disabled={busy} onClick={() => act({ type: 'PASS_CURSE' })}>
              {fr.jeu.passer}
            </button>
          </div>
        </div>
      );
    }
    case 'masterTie':
      return (
        <div className="prompt">
          <strong>{fr.jeu.egalite}</strong>
          <div className="choix">
            <button className="btn" disabled={busy} onClick={() => act({ type: 'MASTER_DECIDE', side: 'attackers' })}>
              {fr.jeu.attaquants} : {p.attackers.map(nameOf).join(' + ')}
            </button>
            <button className="btn" disabled={busy} onClick={() => act({ type: 'MASTER_DECIDE', side: 'defenders' })}>
              {fr.jeu.defenseurs} : {p.defenders.map(nameOf).join(' + ')}
            </button>
          </div>
        </div>
      );
    case 'chooseRecruit': {
      const toggle = (id: string) =>
        setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length < p.count ? [...sel, id] : sel));
      return (
        <div className="prompt">
          <strong>
            {fr.jeu.choisirRecrues(p.count, p.action === 'steal' ? fr.jeu.voler : fr.jeu.defausser)}{' '}
            <span className="texte-faible">({nameOf(p.fromSeat)})</span>
          </strong>
          <div className="choix">
            {p.choices.map((c) => (
              <button
                key={c.id}
                className="btn"
                style={selected.includes(c.id) ? { borderColor: 'var(--accent)' } : undefined}
                disabled={busy}
                onClick={() => toggle(c.id)}
              >
                {RECRUIT_LABEL[c.kind]}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primaire"
            disabled={busy || selected.length !== p.count}
            onClick={() => act({ type: 'CHOOSE_RECRUIT', cardIds: selected })}
          >
            {fr.jeu.valider}
          </button>
        </div>
      );
    }
    case 'singeDore':
      return (
        <div className="prompt">
          <strong>{fr.jeu.singeDore}</strong>
          <div className="choix">
            {CORNERS.map((c) => (
              <button
                key={c}
                className="btn"
                style={corner === c ? { borderColor: 'var(--accent)' } : undefined}
                disabled={busy}
                onClick={() => setCorner(c)}
              >
                {CORNER_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="choix">
            {opponents
              .filter((s) => !p.asked.includes(s))
              .map((s) => (
                <button
                  key={s}
                  className="btn"
                  disabled={busy || corner === null}
                  onClick={() => corner && act({ type: 'SINGE_DORE', corner, targetSeat: s })}
                >
                  {nameOf(s)}
                </button>
              ))}
          </div>
        </div>
      );
    case 'contreAbordage':
      return (
        <div className="prompt">
          <strong>{fr.jeu.contreAbordage(VALUE_LABEL[p.value])}</strong>
          <div className="choix">
            {opponents.map((s) => (
              <button key={s} className="btn" disabled={busy} onClick={() => act({ type: 'CONTRE_ABORDAGE', targetSeat: s })}>
                {nameOf(s)}
              </button>
            ))}
          </div>
        </div>
      );
    case 'longueVue':
      return (
        <div className="prompt">
          <strong>{fr.jeu.longueVue}</strong>
          <div className="choix">
            {opponents.map((s) => (
              <button key={s} className="btn" disabled={busy} onClick={() => act({ type: 'LONGUE_VUE', targetSeat: s })}>
                {nameOf(s)}
              </button>
            ))}
          </div>
        </div>
      );
    case 'pairSteal': {
      // At most 2 winners (2v2): enumerate the valid distinct pairings as one-click options.
      const options: Array<Array<{ winner: number; loser: number }>> = [];
      if (p.winners.length === 2 && p.losers.length >= 2) {
        options.push(
          [
            { winner: p.winners[0]!, loser: p.losers[0]! },
            { winner: p.winners[1]!, loser: p.losers[1]! },
          ],
          [
            { winner: p.winners[0]!, loser: p.losers[1]! },
            { winner: p.winners[1]!, loser: p.losers[0]! },
          ],
        );
      } else {
        options.push(p.winners.map((w, i) => ({ winner: w, loser: p.losers[i % p.losers.length]! })));
      }
      return (
        <div className="prompt">
          <strong>{fr.jeu.pairSteal}</strong>
          <div className="choix">
            {options.map((pairing, i) => (
              <button key={i} className="btn" disabled={busy} onClick={() => act({ type: 'PAIR_STEAL', pairing })}>
                {pairing.map((pair) => `${nameOf(pair.winner)} → ${nameOf(pair.loser)}`).join(' · ')}
              </button>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

// ---- card labels ----------------------------------------------------------------------

function eventLabel(card: EventCard): string {
  if (card.type === 'recruit') {
    const grants = Object.entries(card.grants)
      .map(([v, n]) => `+${n} ${VALUE_LABEL[v as Value]}`)
      .join(', ');
    return `${RECRUIT_LABEL[card.kind]} (${grants})`;
  }
  if (card.type === 'raid') return `Pillage (bonus : ${VALUE_LABEL[card.bonusIcon]})`;
  return `Abordage ${card.mode} — ${card.profile.map((v) => VALUE_LABEL[v]).join(' + ')} (bonus : ${VALUE_LABEL[card.bonusIcon]})`;
}

function treasureLabel(t: TreasureCard | undefined): string {
  if (!t) return '?';
  if (t.type === 'corner') return CORNER_LABEL[t.corner];
  if (t.type === 'curse') return `☠ ${CURSE_LABEL[t.curse]}`;
  return `✦ ${TALISMAN_LABEL[t.talisman]}${t.talisman === 'contre-abordage' && t.value ? ` (${VALUE_LABEL[t.value]})` : ''}`;
}

function treasureClass(t: TreasureCard): string {
  return t.type === 'corner' ? 'carte-coin' : t.type === 'curse' ? 'carte-malediction' : 'carte-talisman';
}
