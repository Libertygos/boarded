/**
 * GameView — the gameroom. Renders ONLY the per-seat projection the server sends and
 * emits Move messages. Visuals: art masters + overlay via CardImage (style bible §5);
 * layout = ink table, parchment ship panels, event draft row, private treasure hand.
 */
import { useEffect, useMemo, useState } from 'react';
import type { BoardingCard, Corner, Move, PlayerProjection, PrivateReveal, Value } from '@boarded/engine';
import { CORNERS, CORNER_LABEL, RECRUIT_LABEL, VALUE_LABEL, VALUES } from '@boarded/engine';
import { fr } from '../i18n/fr.js';
import { CardBack, EventCardImage, TreasureCardImage } from '../cards/CardImage.js';
import { valueIcon } from '../cards/art.js';

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
  const discardTop = proj.treasureDiscard[proj.treasureDiscard.length - 1];

  return (
    <div className="jeu">
      <header className="jeu-entete">
        <div className="jeu-identite">
          <h2 className="titre">{fr.appName}</h2>
          <span className="jeu-manche">{fr.jeu.manche(proj.round)}</span>
        </div>
        <div className="jeu-roles">
          <span className="role-jeton" title={fr.jeu.maitre}>
            <img src="/cards/w440/master_of_winds.webp" alt="" aria-hidden />
            {fr.jeu.maitre} : <b>{nameOf(proj.masterSeat)}</b>
          </span>
          <span className="texte-faible">
            {fr.jeu.retardataire} : {nameOf(proj.laggardSeat)}
          </span>
        </div>
        <div className="jeu-pioches">
          <CardBack kind="events" size="xs" count={proj.eventDeckCount} label={fr.jeu.piocheEvenements} />
          <CardBack kind="treasures" size="xs" count={proj.treasureDeckCount} label={fr.jeu.piocheTresors} />
          {discardTop && (
            <div className="defausse">
              <TreasureCardImage card={discardTop} size="xs" />
              <span className="carte-legende">{fr.jeu.defausse}</span>
            </div>
          )}
        </div>
      </header>

      {banner && (
        <p className="erreur bandeau" role="alert">
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
          master={proj.self.seatId === proj.masterSeat}
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
            master={o.seatId === proj.masterSeat}
            badges={shipBadges(proj, o.seatId)}
          />
        ))}
      </section>

      <section className="table-evenements">
        <h3 className="rubrique">{fr.jeu.evenements}</h3>
        <div className="cartes cartes-evenements">
          {proj.revealed.length === 0 && <span className="texte-faible">—</span>}
          {proj.revealed.map((card) => (
            <button
              key={card.id}
              className="carte-btn"
              disabled={proj.pending.kind !== 'pickEvent' || busy}
              onClick={() => act({ type: 'PICK_EVENT', cardId: card.id })}
            >
              <EventCardImage card={card} size="md" />
            </button>
          ))}
        </div>
      </section>

      <PendingPrompt proj={proj} busy={busy} act={act} nameOf={nameOf} />

      <section className="main-tresors">
        <h3 className="rubrique">{fr.jeu.tresors}</h3>
        <div className="cartes">
          {proj.self.treasures.length === 0 && <span className="texte-faible">{fr.jeu.mainVide}</span>}
          {proj.self.treasures.map((t) => (
            <TreasureCardImage key={t.id} card={t} size="sm" />
          ))}
        </div>
      </section>

      <section className="journal" aria-label={fr.jeu.journal}>
        <h3 className="rubrique">{fr.jeu.journal}</h3>
        <div className="journal-lignes">
          {proj.log.map((entry, i) => (
            <p key={i}>{entry.text}</p>
          ))}
        </div>
      </section>

      {reveal && (
        <div className="voile" onClick={onRevealDismiss}>
          <div className="panneau panneau-revelation" onClick={(e) => e.stopPropagation()}>
            <h3>{fr.jeu.revelation(nameOf(reveal.aboutSeat))}</h3>
            <div className="cartes">
              {reveal.treasures.length === 0 && <span className="texte-faible">{fr.jeu.mainVide}</span>}
              {reveal.treasures.map((t) => (
                <TreasureCardImage key={t.id} card={t} size="sm" />
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
          <div className="panneau panneau-fin">
            <div className="fin-embleme">
              {VALUES.map((v) => (
                <img key={v} src={valueIcon(v)} alt="" aria-hidden />
              ))}
            </div>
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
        <button className="btn btn-nu jeu-quitter" onClick={onExit}>
          {fr.jeu.quitter}
        </button>
      )}
    </div>
  );
}

// ---- ships -----------------------------------------------------------------------

function shipBadges(proj: PlayerProjection, seat: number): string[] {
  const badges: string[] = [];
  if (seat === proj.laggardSeat) badges.push(fr.jeu.retardataire);
  if (proj.boarding) {
    if (proj.boarding.attackers.includes(seat)) badges.push(`⚔ ${fr.jeu.attaque}`);
    else if (proj.boarding.defenders.includes(seat) && !proj.boarding.escaped.includes(seat))
      badges.push(`🛡 ${fr.jeu.defend}`);
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
  master,
  badges,
}: {
  title: string;
  values: Record<Value, number>;
  crew: string[];
  treasureInfo: string;
  me?: boolean;
  connected: boolean;
  master: boolean;
  badges: string[];
}) {
  const crewCounts = new Map<string, number>();
  for (const label of crew) crewCounts.set(label, (crewCounts.get(label) ?? 0) + 1);
  return (
    <article className={`navire ${me ? 'moi' : ''}`}>
      <div className="entete-navire">
        <strong className="navire-nom">
          {master && (
            <img className="navire-maitre" src="/cards/w440/master_of_winds.webp" alt={fr.jeu.maitre} title={fr.jeu.maitre} />
          )}
          {title}
        </strong>
        <span className="navire-badges">
          {badges.map((b) => (
            <span key={b} className="badge">
              {b}
            </span>
          ))}
          {!connected && <span className="etat-deco">⚠ {fr.jeu.deconnecte}</span>}
        </span>
      </div>
      <div className="valeurs">
        {VALUES.map((v) => (
          <span key={v} className={`valeur ${values[v] > 0 ? '' : 'valeur-zero'}`} title={VALUE_LABEL[v]}>
            <img src={valueIcon(v)} alt={VALUE_LABEL[v]} />
            <b>{values[v]}</b>
          </span>
        ))}
      </div>
      <div className="navire-cale texte-faible">
        {[...crewCounts.entries()].map(([label, n]) => `${label}${n > 1 ? ` ×${n}` : ''}`).join(', ') ||
          fr.jeu.aucuneRecrue}
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
        <div className="prompt prompt-attente">
          <span className="texte-faible">
            {p.seat === null ? fr.jeu.enAttenteGenerique : fr.jeu.enAttente(nameOf(p.seat))}
          </span>
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
        <div className="prompt prompt-avec-carte">
          <EventCardImage card={card} size="sm" />
          <div className="prompt-corps">
            <strong>{is2v2 ? fr.jeu.choisirPartenaire : fr.jeu.choisirCible}</strong>
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
        </div>
      );
    }
    case 'curseWindow': {
      const cardById = new Map(proj.self.treasures.map((t) => [t.id, t]));
      return (
        <div className="prompt">
          <strong>{fr.jeu.fenetreMaledictionTitre}</strong>
          <div className="choix choix-cartes">
            {p.playable.map((id) => {
              const card = cardById.get(id);
              return (
                <button key={id} className="carte-btn" disabled={busy} onClick={() => act({ type: 'PLAY_CURSE', cardId: id })}>
                  {card ? <TreasureCardImage card={card} size="sm" /> : <span className="btn">?</span>}
                </button>
              );
            })}
          </div>
          <div className="choix">
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
                className={`btn ${selected.includes(c.id) ? 'btn-choisi' : ''}`}
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
                className={`btn ${corner === c ? 'btn-choisi' : ''}`}
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
