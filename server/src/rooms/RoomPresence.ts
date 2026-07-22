/**
 * Presence-lease bookkeeping for a room (login_all_games.md O2/O5), factored out of the
 * Colyseus room so it is unit-testable without the transport. Owns one PlatformPresence
 * per live player-session (keyed by userId) plus its 30 s heartbeat timer, and enforces the
 * "one live lease per account" invariant: start() is idempotent per userId, so an in-grace
 * reconnect never mints a second lease.
 *
 * The room injects sessionRef derivation and the supersede teardown so this class stays
 * free of room state. Boarded holds NO durable store — this map is the whole lease state,
 * and it empties naturally on dispose (a pod restart just stops heartbeating; the platform
 * expires stale leases at 90 s).
 */
import { PlatformPresence, type PresenceEndReason } from '../http/platformPresence.js';

// Presence heartbeat cadence (login_all_games.md §C). The platform expires a stale lease
// at 90 s, so 30 s gives two safety margins before expiry.
export const PRESENCE_HEARTBEAT_MS = 30_000;

export interface RoomPresenceHooks {
  /** Stable per-session ref, e.g. `${roomId}:${userId}` — [A-Za-z0-9._:-]{1,128}. */
  sessionRefFor(userId: string): string;
  /** Invoked on a 409 supersede: force this local session out with the standard exit. */
  onSuperseded(userId: string): void;
}

interface Entry {
  presence: PlatformPresence;
  timer: ReturnType<typeof setInterval>;
}

export class RoomPresence {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly hooks: RoomPresenceHooks) {}

  has(userId: string): boolean {
    return this.entries.has(userId);
  }

  users(): string[] {
    return [...this.entries.keys()];
  }

  /**
   * Establish the lease for a freshly-established session. Idempotent per userId: an
   * in-grace reconnect must NOT start a second lease (O5), so an existing entry is left
   * untouched and no new start() is emitted.
   */
  start(userId: string): void {
    if (this.entries.has(userId)) return;
    const presence = new PlatformPresence({
      userId,
      sessionRef: this.hooks.sessionRefFor(userId),
      onSuperseded: () => this.hooks.onSuperseded(userId),
    });
    const timer = setInterval(() => void presence.heartbeat(), PRESENCE_HEARTBEAT_MS);
    // The lease must never hold the event loop / process open.
    if (typeof timer.unref === 'function') timer.unref();
    this.entries.set(userId, { presence, timer });
    void presence.start();
  }

  /** End + tear down the lease for userId (best-effort). No-op if none is live. */
  end(userId: string, reason: PresenceEndReason): void {
    const entry = this.entries.get(userId);
    if (!entry) return;
    this.entries.delete(userId);
    clearInterval(entry.timer);
    // Skip the network end() when the platform already superseded the lease (avoids a
    // guaranteed 404 no_lease — it's already gone platform-side).
    if (!entry.presence.isSuperseded) void entry.presence.end(reason);
  }

  /** Release every remaining lease (room dispose / shutdown). */
  endAll(reason: PresenceEndReason): void {
    for (const userId of this.users()) this.end(userId, reason);
  }
}
