/**
 * Live-session directory (login_all_games.md O3, platform → game remote-end). Colyseus
 * rooms are in-process and ephemeral; this module-level registry lets the HTTP layer
 * (`POST /internal/sessions/end`) reach the live room instances that can tear down a
 * given account's session(s) WITHOUT the room holding any durable per-user store —
 * Boarded stays EPHEMERAL (no store, no deletion endpoint; O6 exempt).
 *
 * Each room registers a handle exposing exactly the remote-end capability. The registry
 * naturally empties on room dispose, so a pod restart loses it harmlessly — the platform
 * expires stale leases at 90 s regardless.
 */

export interface SessionEndHandle {
  /**
   * End the identified session(s) for userId, honoring an exact sessionRef match; when
   * sessionRef is omitted/unknown, end the sole live session for the user, else all of
   * them. Returns whether anything was torn down (for idempotent HTTP semantics).
   */
  endSessionsForUser(userId: string, sessionRef?: string): boolean;
}

const handles = new Set<SessionEndHandle>();

export function registerSessionHandle(handle: SessionEndHandle): void {
  handles.add(handle);
}

export function unregisterSessionHandle(handle: SessionEndHandle): void {
  handles.delete(handle);
}

/**
 * Remote-end across all live rooms. Idempotent by design: an already-gone userId /
 * sessionRef simply tears nothing down and returns false. Ends everywhere it matches
 * (a given account is at most one live session per room, but never assume a single room).
 */
export function endSessionsForUser(userId: string, sessionRef?: string): boolean {
  let ended = false;
  for (const handle of handles) {
    if (handle.endSessionsForUser(userId, sessionRef)) ended = true;
  }
  return ended;
}
