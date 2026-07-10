/**
 * Landing (wog-room.md §2): resume auto-redirect, Create-a-room CTA, Join-by-code form.
 * `bindAndNavigate` persists the resume record, stashes the live room in the baton, and
 * routes to /room/<code> — the socket survives the client-side navigation.
 * Placeholder visuals only; the theme/art pass comes later.
 */
import { useEffect, useState } from 'react';
import type { Room } from 'colyseus.js';
import { fr } from '../i18n/fr.js';
import { APP_VERSION } from '../version.js';
import { navigate } from '../router.js';
import { clearActiveRoom, setActiveRoom } from '../net/active-room.js';
import { createGameRoom, joinGameRoom, onceMessage, type RoomWelcome } from '../net/room.js';
import { loadResume, saveResume } from '../state/resume.js';
import type { Session } from '../auth/handoff.js';

const ROOM_CODE_LENGTH = 5;

export function LandingScreen({
  session,
  httpUrl,
  wsUrl,
}: {
  session: Session;
  httpUrl: string;
  wsUrl: string;
}) {
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);

  // §2.1: an existing resume record redirects straight back into the room.
  useEffect(() => {
    const resume = loadResume();
    if (resume) {
      setResumed(true);
      navigate(`/room/${resume.roomCode}`, { replace: true });
    }
  }, []);
  if (resumed) return null;

  const bindAndNavigate = (room: Room, welcome: RoomWelcome) => {
    saveResume({
      roomCode: welcome.roomCode,
      reconnectionToken: room.reconnectionToken,
      seatId: welcome.seatId,
      phase: 'LOBBY',
    });
    setActiveRoom({ room, roomCode: welcome.roomCode, seatId: welcome.seatId, hostSeat: welcome.hostSeat });
    navigate(`/room/${welcome.roomCode}`);
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    clearActiveRoom();
    try {
      const room = await createGameRoom(wsUrl, session.sessionToken);
      const welcome = onceMessage<RoomWelcome>(room, 'ROOM_CREATED');
      bindAndNavigate(room, await welcome);
    } catch (err) {
      setError(mapError(err));
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < ROOM_CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    clearActiveRoom();
    try {
      const room = await joinGameRoom(wsUrl, httpUrl, session.sessionToken, code);
      const welcome = onceMessage<RoomWelcome>(room, 'JOIN_OK');
      bindAndNavigate(room, await welcome);
    } catch (err) {
      setError(mapError(err));
      setBusy(false);
    }
  };

  return (
    <div className="landing">
      <header>
        <h1>{fr.appName}</h1>
        <p className="texte-faible">{fr.tagline}</p>
      </header>

      <button className="btn btn-primaire" onClick={() => void handleCreate()} disabled={busy}>
        {fr.landing.create}
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleJoin();
        }}
      >
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder={fr.landing.codePlaceholder}
          maxLength={ROOM_CODE_LENGTH}
          disabled={busy}
        />
        <button type="submit" className="btn" disabled={busy || joinCode.length < ROOM_CODE_LENGTH}>
          {fr.landing.join}
        </button>
      </form>

      {error && (
        <p className="erreur" role="alert">
          {error}
        </p>
      )}

      <footer className="texte-faible">
        {session.displayName ?? session.userId} · {fr.landing.version(APP_VERSION)} · 2 à 4 joueurs
      </footer>
    </div>
  );
}

function mapError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return fr.room.errors[message] ?? message;
}
