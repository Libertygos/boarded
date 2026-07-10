/**
 * App-load entry resolution (wog-room.md §1), adapted to the sessionStorage S-JWT model.
 *
 * Outcomes: `authenticated`, `bounce` (to the platform launcher), or `dev-login` when the
 * build runs with VITE_DEV_AUTH=1 (local play without the platform).
 *  1. Handoff token in the URL fragment → exchange. A present token is a fresh identity
 *     assertion: on 401 we bounce — we do NOT fall back to a stored session.
 *  2. No fragment → stored session (refresh-survival path), if not expired.
 *  3. Neither → bounce (or the dev-login form).
 */
import { consumeHandoffFragment, exchangeHandoff, loadSession, type Session } from '../auth/handoff.js';

export const PLATFORM_LAUNCH_URL = 'https://www.gosgames.com/api/launch/boarded';

export type EntryResult =
  | { outcome: 'authenticated'; session: Session }
  | { outcome: 'bounce' }
  | { outcome: 'dev-login' };

function sessionLooksValid(session: Session): boolean {
  // The S-JWT carries exp; reject an obviously expired token without a server round-trip
  // (the socket handshake re-verifies authoritatively on every join).
  try {
    const payload = JSON.parse(atob(session.sessionToken.split('.')[1] ?? '')) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === '1' || import.meta.env.DEV;

export async function resolveEntry(serverHttpUrl: string): Promise<EntryResult> {
  const token = consumeHandoffFragment();
  if (token) {
    try {
      const session = await exchangeHandoff(serverHttpUrl, token);
      return { outcome: 'authenticated', session };
    } catch {
      return { outcome: 'bounce' };
    }
  }
  const stored = loadSession();
  if (stored && sessionLooksValid(stored)) {
    return { outcome: 'authenticated', session: stored };
  }
  return DEV_AUTH ? { outcome: 'dev-login' } : { outcome: 'bounce' };
}

/** Top-level redirect to the platform launcher. */
export function bounceToPlatform(): void {
  window.location.replace(PLATFORM_LAUNCH_URL);
}
