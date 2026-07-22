/**
 * Platform → game internal HTTP channel (login_all_games.md O3, remote-end).
 *
 * Boarded has NO deletion endpoint and NO durable per-user store (EPHEMERAL; O6 exempt),
 * so this adds ONLY the remote-end route the standard requires:
 *
 *   POST /internal/sessions/end
 *     auth: Authorization: Bearer <INTERNAL_SERVICE_TOKEN> (the scheme the platform uses
 *           elsewhere), constant-time compared via node:crypto timingSafeEqual.
 *     body: { userId, sessionRef? }
 *     → 200 { status:"ended" } always on an authenticated, well-formed request (idempotent:
 *       already-gone / unknown session still 200).
 *     → 401 on bad/missing token AND when INTERNAL_SERVICE_TOKEN is unset (FAIL CLOSED —
 *       never accept unconfigured); no teardown occurs.
 *     → 400 on missing userId.
 *
 * Teardown runs over the in-memory live-room directory only. A missing/unknown sessionRef
 * ends the sole live session for the user; otherwise the exact match / all sessions.
 */
import type { Express, Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { endSessionsForUser } from '../rooms/session-directory.js';

/**
 * Constant-time bearer check. Reads INTERNAL_SERVICE_TOKEN at call time (not import) so
 * env swaps and tests are honored. FAIL CLOSED: unset token → never accept.
 */
export function internalBearerOk(header: string | undefined): boolean {
  const expected = process.env.INTERNAL_SERVICE_TOKEN ?? '';
  if (!expected) return false; // fail closed
  const prefix = 'Bearer ';
  if (!header || !header.startsWith(prefix)) return false;
  const presented = Buffer.from(header.slice(prefix.length));
  const want = Buffer.from(expected);
  // timingSafeEqual demands equal lengths; the length guard leaks nothing secret.
  return presented.length === want.length && timingSafeEqual(presented, want);
}

/** Extract a non-empty string field from a JSON body, else undefined. */
function strField(body: Request['body'], key: string): string | undefined {
  const v = body?.[key];
  return typeof v === 'string' && v ? v : undefined;
}

export function mountInternalRoutes(app: Express): void {
  app.post('/internal/sessions/end', (req, res) => {
    if (!internalBearerOk(req.headers.authorization)) {
      return res.status(401).json({ error: 'unauthorized' }); // bad/missing/unset token — no teardown
    }
    const userId = strField(req.body, 'userId');
    if (!userId) return res.status(400).json({ error: 'missing userId' });
    const sessionRef = strField(req.body, 'sessionRef');
    endSessionsForUser(userId, sessionRef); // idempotent; teardown result intentionally not leaked
    return res.status(200).json({ status: 'ended' });
  });
}
