/**
 * App shell: entry resolution (handoff → stored session → bounce/dev-login, wog-room.md §1)
 * then two routes — the landing page and /room/:code. The live socket crosses the navigate
 * via the active-room baton (net/active-room.ts), never via React state.
 */
import { useEffect, useState } from 'react';
import { devLogin, type Session } from './auth/handoff.js';
import { bounceToPlatform, resolveEntry } from './net/entry.js';
import { roomCodeFromPath, usePath } from './router.js';
import { LandingScreen } from './screens/LandingScreen.js';
import { RoomScreen } from './screens/RoomScreen.js';
import { fr } from './i18n/fr.js';

const HTTP_URL = import.meta.env.VITE_SERVER_HTTP ?? window.location.origin;
const WS_URL = import.meta.env.VITE_SERVER_WS ?? window.location.origin.replace(/^http/, 'ws');

const TOAST_KEY = 'boarded.toast';

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'auth' | 'ready' | 'bounce' | 'dev-login'>('auth');
  const path = usePath();

  useEffect(() => {
    void resolveEntry(HTTP_URL).then((entry) => {
      if (entry.outcome === 'authenticated') {
        setSession(entry.session);
        setStatus('ready');
      } else if (entry.outcome === 'dev-login') {
        setStatus('dev-login');
      } else {
        setStatus('bounce');
        bounceToPlatform();
      }
    });
  }, []);

  if (status === 'auth') return <Centered>{fr.connecting}</Centered>;
  if (status === 'dev-login') {
    return (
      <DevLogin
        onDone={(s) => {
          setSession(s);
          setStatus('ready');
        }}
      />
    );
  }
  if (status === 'bounce' || !session) return <Centered>{fr.handoffFailed}</Centered>;

  const roomCode = roomCodeFromPath(path);
  if (roomCode) {
    return (
      <RoomScreen key={roomCode} code={roomCode} session={session} httpUrl={HTTP_URL} wsUrl={WS_URL} />
    );
  }
  return (
    <>
      <Toast />
      <LandingScreen session={session} httpUrl={HTTP_URL} wsUrl={WS_URL} />
    </>
  );
}

/** Local play without the platform (server must run with DEV_AUTH=1). */
function DevLogin({ onDone }: { onDone: (s: Session) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!name.trim()) return;
    try {
      onDone(await devLogin(HTTP_URL, name.trim()));
    } catch {
      setError(fr.devLogin.failed);
    }
  };
  return (
    <div className="centre-plein">
      <form
        className="panneau"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1>{fr.appName}</h1>
        <p className="texte-faible">{fr.devLogin.title}</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={fr.devLogin.namePlaceholder}
          maxLength={24}
        />
        <button className="btn btn-primaire" type="submit" disabled={!name.trim()}>
          {fr.devLogin.submit}
        </button>
        {error && <p className="erreur">{error}</p>}
      </form>
    </div>
  );
}

/** One-shot notice carried across a navigate (room not found, session expired, …). */
function Toast() {
  const [message] = useState(() => {
    const m = sessionStorage.getItem(TOAST_KEY);
    sessionStorage.removeItem(TOAST_KEY);
    return m;
  });
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="centre-plein">{children}</div>;
}
