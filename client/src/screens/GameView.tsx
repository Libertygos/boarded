/**
 * GameView — the gameroom. Renders ONLY the per-seat projection the server sends and
 * emits Move messages. Visuals: art masters + overlay via CardImage (style bible §5);
 * layout = ink table, parchment ship panels, event draft row, private treasure hand.
 *
 * Table feel: events are dealt with a staggered flip at each round, drawn treasures flip
 * into the hand, and every new public log entry surfaces as a transient announcement so
 * affected players see what just happened (log entries carry monotonic ids for the diff).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  BoardingCard,
  BoardingView,
  CombatReport,
  Corner,
  LogEntry,
  Move,
  PlayerProjection,
  PrivateReveal,
  TreasureCard,
  Value,
} from '@boarded/engine';
import {
  BONUS_THRESHOLD_SOLO,
  CORNERS,
  CORNER_LABEL,
  RECRUIT_LABEL,
  VALUE_LABEL,
  VALUES,
} from '@boarded/engine';
import { fr } from '../i18n/fr.js';
import { CardBack, EventCardImage, TreasureCardImage } from '../cards/CardImage.js';
import { MAP_TREASURE, treasureTitle, valueIcon } from '../cards/art.js';

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

  /** Treasure zoom — a click opens the card full size. If the zoomed card is a curse
   * playable in the current window, the zoom carries the Jouer/Ignorer decision. */
  const [zoom, setZoom] = useState<TreasureCard | null>(null);
  const zoomJouable =
    zoom !== null && proj.pending.kind === 'curseWindow' && proj.pending.playable.includes(zoom.id);

  const annonces = useAnnonces(proj.log);
  const [combatReveal, dismissCombat] = useCombatReveal(proj);

  // Deal animation: fix each revealed card's stagger delay at reveal time (per round) so
  // later re-renders — cards leaving as they get picked — never restart the animation.
  const dealDelays = useRef<Map<string, number>>(new Map());
  const dealRound = useRef(-1);
  if (dealRound.current !== proj.round) {
    dealRound.current = proj.round;
    dealDelays.current = new Map(proj.revealed.map((c, i) => [c.id, 0.1 + i * 0.16]));
  }

  // Draw animation: treasures that were not in the hand at the previous projection.
  const prevTreasureIds = useRef<Set<string> | null>(null);
  const freshTreasures = useMemo(() => {
    const prev = prevTreasureIds.current;
    if (!prev) return new Set<string>(); // first projection (incl. reconnect): no replay
    return new Set(proj.self.treasures.filter((t) => !prev.has(t.id)).map((t) => t.id));
  }, [proj]);
  useEffect(() => {
    prevTreasureIds.current = new Set(proj.self.treasures.map((t) => t.id));
  }, [proj]);

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

      <div className="rubrique-rang">
        <h3 className="rubrique">{fr.jeu.navires}</h3>
        <AideZone sujet="navires" />
      </div>
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
          combat={combatRole(proj.boarding, proj.self.seatId)}
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
            combat={combatRole(proj.boarding, o.seatId)}
          />
        ))}
      </section>

      {proj.boarding && <AbordageBandeau b={proj.boarding} nameOf={nameOf} />}

      <section className="table-evenements">
        <div className="rubrique-rang">
          <h3 className="rubrique">{fr.jeu.evenements}</h3>
          <AideZone sujet="evenements" />
        </div>
        <div className="cartes cartes-evenements">
          {proj.revealed.length === 0 && <span className="texte-faible">—</span>}
          {proj.revealed.map((card) => (
            <button
              key={card.id}
              className="carte-btn carte-revelee"
              style={{ animationDelay: `${dealDelays.current.get(card.id) ?? 0}s` }}
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
        <div className="rubrique-rang">
          <h3 className="rubrique">{fr.jeu.tresors}</h3>
          <AideZone sujet="tresors" />
        </div>
        <div className="cartes">
          {proj.self.treasures.length === 0 && <span className="texte-faible">{fr.jeu.mainVide}</span>}
          {proj.self.treasures.map((t) => (
            <button
              key={t.id}
              className={`carte-btn ${freshTreasures.has(t.id) ? 'carte-nouvelle' : ''}`}
              onClick={() => setZoom(t)}
              aria-label={fr.jeu.agrandir(treasureTitle(t))}
            >
              <TreasureCardImage card={t} size="sm" />
            </button>
          ))}
        </div>
      </section>

      <div className="annonces" role="log" aria-label={fr.jeu.annonces}>
        {annonces.map((a) => (
          <p key={a.id} className="annonce">
            {a.text}
          </p>
        ))}
      </div>

      {zoom && (
        <div className="voile" onClick={() => setZoom(null)}>
          <div className="zoom-carte" onClick={(e) => e.stopPropagation()}>
            <TreasureCardImage card={zoom} size="lg" />
            {zoomJouable ? (
              <div className="choix">
                <button
                  className="btn btn-primaire"
                  disabled={busy}
                  onClick={() => {
                    act({ type: 'PLAY_CURSE', cardId: zoom.id });
                    setZoom(null);
                  }}
                >
                  {fr.jeu.jouer}
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => {
                    act({ type: 'PASS_CURSE' });
                    setZoom(null);
                  }}
                >
                  {fr.jeu.ignorer}
                </button>
              </div>
            ) : (
              <button className="btn" onClick={() => setZoom(null)}>
                {fr.jeu.fermer}
              </button>
            )}
          </div>
        </div>
      )}

      {combatReveal && (
        <CombatReveal key={combatReveal.seq} report={combatReveal} nameOf={nameOf} onClose={dismissCombat} />
      )}

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
            {/* The four map corners fly back together into the complete treasure map. */}
            <div className="fin-carte" aria-hidden>
              {CORNERS.map((c) => (
                <span key={c} className={`fin-quart fin-quart-${c}`}>
                  <img src={MAP_TREASURE.webp} alt="" draggable={false} />
                </span>
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

// ---- announcements ---------------------------------------------------------------

/** Surfaces log entries added since the previous projection as transient toasts.
 * The first projection only records the high-water mark, so a reconnect never replays
 * the whole journal. */
function useAnnonces(log: LogEntry[]): LogEntry[] {
  const [items, setItems] = useState<LogEntry[]>([]);
  const lastSeen = useRef<number | null>(null);
  useEffect(() => {
    const maxId = log.length > 0 ? log[log.length - 1]!.id : 0;
    if (lastSeen.current === null) {
      lastSeen.current = maxId;
      return;
    }
    const seen = lastSeen.current;
    lastSeen.current = Math.max(seen, maxId);
    const fresh = log.filter((e) => e.id > seen);
    if (fresh.length === 0) return;
    setItems((cur) => [...cur, ...fresh].slice(-5));
    setTimeout(() => {
      setItems((cur) => cur.filter((e) => !fresh.some((f) => f.id === e.id)));
    }, 8000);
  }, [log]);
  return items;
}

// ---- boarding resolution reveal ---------------------------------------------------

/** Surfaces a newly-resolved combat (projection diff on `combat.seq`). The first
 * projection only records the high-water mark, so a reconnect never replays it. */
function useCombatReveal(proj: PlayerProjection): [CombatReport | null, () => void] {
  const [report, setReport] = useState<CombatReport | null>(null);
  const lastSeen = useRef<number | null>(null);
  useEffect(() => {
    const seq = proj.combat?.seq ?? 0;
    if (lastSeen.current === null) {
      lastSeen.current = seq;
      return;
    }
    if (proj.combat && seq > lastSeen.current) {
      lastSeen.current = seq;
      setReport(proj.combat);
    }
  }, [proj]);
  return [report, () => setReport(null)];
}

/**
 * The boarding resolution box, played as a staged animation: the two sides face off,
 * then each profile value is added to both columns, then the totals, then the verdict
 * (winner + who got robbed). A click anywhere skips to the end; a second click closes.
 */
function CombatReveal({
  report,
  nameOf,
  onClose,
}: {
  report: CombatReport;
  nameOf: (seat: number) => string;
  onClose: () => void;
}) {
  // Steps: 1 = sides, 2..1+n = one profile value each, 2+n = totals, 3+n = verdict.
  const lastStep = report.profile.length + 3;
  const [step, setStep] = useState(1);
  useEffect(() => {
    if (step >= lastStep) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 1 ? 1000 : 900);
    return () => clearTimeout(t);
  }, [step, lastStep]);

  const sideCount = (seats: number[], v: Value) =>
    seats.reduce((acc, s) => acc + (report.contributions[s]?.[v] ?? 0), 0);
  const rowsShown = Math.min(step - 1, report.profile.length);
  const totalsShown = step >= report.profile.length + 2;
  const done = step >= lastStep;
  const atkWon = report.winners.some((s) => report.attackers.includes(s));

  return (
    <div className="voile" onClick={() => (done ? onClose() : setStep(lastStep))}>
      <div className="panneau panneau-combat" onClick={(e) => e.stopPropagation()}>
        <h3 className="combat-titre">{report.counter ? fr.combat.titreContre : fr.combat.titre}</h3>
        <div className="combat-tableau">
          <div className="combat-ligne combat-camps">
            <span className="camp camp-attaque">⚔ {report.attackers.map(nameOf).join(' + ')}</span>
            <span className="combat-vs">{fr.jeu.contre}</span>
            <span className="camp camp-defense">🛡 {report.defenders.map(nameOf).join(' + ')}</span>
          </div>
          {report.profile.slice(0, rowsShown).map((v, i) => (
            <div key={`${v}-${i}`} className="combat-ligne combat-valeur">
              <span className="combat-nombre">{sideCount(report.attackers, v)}</span>
              <img src={valueIcon(v)} alt={VALUE_LABEL[v]} title={VALUE_LABEL[v]} />
              <span className="combat-nombre">{sideCount(report.defenders, v)}</span>
            </div>
          ))}
          {totalsShown && (
            <div className="combat-ligne combat-totaux">
              <span className={`combat-nombre ${atkWon ? 'combat-gagnant' : ''}`}>{report.atkTotal}</span>
              <span className="combat-vs">{fr.combat.total}</span>
              <span className={`combat-nombre ${atkWon ? '' : 'combat-gagnant'}`}>{report.defTotal}</span>
            </div>
          )}
        </div>
        {done && (
          <div className="combat-verdict">
            {report.tie && <p className="texte-faible">{fr.combat.egalite}</p>}
            <p className="combat-vainqueur">{fr.combat.remporte(report.winners.map(nameOf).join(' + '))}</p>
            {report.bonus && <p className="texte-faible">{fr.combat.bonus}</p>}
            {report.steals.map((s, i) => (
              <p key={i} className="combat-vol">
                {fr.combat.vole(nameOf(s.thief), nameOf(s.victim), s.count)}
              </p>
            ))}
            <button className="btn btn-primaire" onClick={onClose}>
              {fr.combat.continuer}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- boarding banner ---------------------------------------------------------------

function AbordageBandeau({ b, nameOf }: { b: BoardingView; nameOf: (seat: number) => string }) {
  const activeDefenders = b.defenders.filter((s) => !b.escaped.includes(s));
  return (
    <section className="abordage" role="status">
      {b.card && (
        <div className="abordage-carte">
          <EventCardImage card={b.card} size="sm" />
        </div>
      )}
      <div className="abordage-corps">
        <h3 className="abordage-titre">{b.card ? fr.jeu.abordageEnCours : fr.jeu.contreAbordageEnCours}</h3>
        <div className="abordage-camps">
          <span className="camp camp-attaque">⚔ {b.attackers.map(nameOf).join(' + ')}</span>
          <span className="abordage-contre">{fr.jeu.contre}</span>
          <span className="camp camp-defense">🛡 {activeDefenders.map(nameOf).join(' + ') || '—'}</span>
        </div>
        <div className="abordage-profil">
          <span className="texte-faible">{fr.jeu.profilCombat}</span>
          {b.profile.map((v, i) => (
            <img key={`${v}-${i}`} src={valueIcon(v)} alt={VALUE_LABEL[v]} title={VALUE_LABEL[v]} />
          ))}
        </div>
        {b.escaped.length > 0 && (
          <p className="abordage-echappes texte-faible">
            {b.escaped.map(nameOf).join(', ')} — {fr.jeu.echappe}
          </p>
        )}
      </div>
    </section>
  );
}

// ---- zone help -----------------------------------------------------------------------

function AideZone({ sujet }: { sujet: 'evenements' | 'tresors' | 'navires' }) {
  const [open, setOpen] = useState(false);
  const aide = fr.aide[sujet];
  return (
    <>
      <button
        className="btn-aide"
        onClick={() => setOpen(true)}
        aria-label={`${fr.aide.bouton} — ${aide.titre}`}
        title={`${fr.aide.bouton} — ${aide.titre}`}
      >
        ?
      </button>
      {open && (
        <div className="voile" onClick={() => setOpen(false)}>
          <div className="panneau panneau-aide" onClick={(e) => e.stopPropagation()}>
            <h3>{aide.titre}</h3>
            {aide.corps.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <button className="btn" onClick={() => setOpen(false)}>
              {fr.jeu.fermer}
            </button>
          </div>
        </div>
      )}
    </>
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

function combatRole(b: BoardingView | null, seat: number): 'attaque' | 'defense' | null {
  if (!b) return null;
  if (b.attackers.includes(seat)) return 'attaque';
  if (b.defenders.includes(seat) && !b.escaped.includes(seat)) return 'defense';
  return null;
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
  combat,
}: {
  title: string;
  values: Record<Value, number>;
  crew: string[];
  treasureInfo: string;
  me?: boolean;
  connected: boolean;
  master: boolean;
  badges: string[];
  combat: 'attaque' | 'defense' | null;
}) {
  const crewCounts = new Map<string, number>();
  for (const label of crew) crewCounts.set(label, (crewCounts.get(label) ?? 0) + 1);
  return (
    <article className={`navire ${me ? 'moi' : ''} ${combat ? `navire-${combat}` : ''}`}>
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
        {VALUES.map((v) => {
          const bonus = values[v] >= BONUS_THRESHOLD_SOLO;
          return (
            <span
              key={v}
              className={`valeur ${bonus ? 'valeur-bonus' : values[v] > 0 ? '' : 'valeur-zero'}`}
              title={bonus ? fr.jeu.bonusActif(VALUE_LABEL[v]) : VALUE_LABEL[v]}
            >
              <img src={valueIcon(v)} alt={VALUE_LABEL[v]} />
              <b>{values[v]}</b>
            </span>
          );
        })}
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
  /** Curse window: the card being inspected full-size before the Jouer/Ignorer decision. */
  const [curseZoom, setCurseZoom] = useState<TreasureCard | null>(null);
  useEffect(() => {
    setSelected([]);
    setCorner(null);
    setCurseZoom(null);
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
      // Clicking a curse zooms it; the decision lives in the zoom — Jouer plays it,
      // Ignorer declines the window (former Passer). No inline play/pass buttons.
      // The overlay sits OUTSIDE the animated .prompt panel so nothing can occlude it.
      return (
        <>
          <div className="prompt">
            <strong>{fr.jeu.fenetreMaledictionTitre}</strong>
            <span className="texte-faible">{fr.jeu.fenetreMaledictionAstuce}</span>
            <div className="choix choix-cartes">
              {p.playable.map((id) => {
                const card = cardById.get(id);
                return (
                  <button
                    key={id}
                    className="carte-btn"
                    disabled={busy}
                    aria-label={card ? fr.jeu.agrandir(treasureTitle(card)) : undefined}
                    onClick={() => card && setCurseZoom(card)}
                  >
                    {card ? <TreasureCardImage card={card} size="sm" /> : <span className="btn">?</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {curseZoom && (
            <div className="voile" onClick={() => setCurseZoom(null)}>
              <div className="zoom-carte" onClick={(e) => e.stopPropagation()}>
                <TreasureCardImage card={curseZoom} size="lg" />
                <div className="choix">
                  <button
                    className="btn btn-primaire"
                    disabled={busy}
                    onClick={() => act({ type: 'PLAY_CURSE', cardId: curseZoom.id })}
                  >
                    {fr.jeu.jouer}
                  </button>
                  <button className="btn" disabled={busy} onClick={() => act({ type: 'PASS_CURSE' })}>
                    {fr.jeu.ignorer}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
          <div className="choix choix-cartes">
            {p.choices.map((c) => (
              <button
                key={c.id}
                className={`carte-btn ${selected.includes(c.id) ? 'carte-btn-choisi' : ''}`}
                disabled={busy}
                onClick={() => toggle(c.id)}
              >
                <EventCardImage card={c} size="sm" />
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
