/**
 * Active-game presence lease to the gosgames platform (login_all_games.md, ratified
 * cross-repo standard GAME-LOGIN-01…05). The platform holds ONE authoritative
 * "active-game lease" per account; the game reports presence and honors a platform
 * instruction to end a session. This is a SEPARATE internal channel from the handoff
 * JWT and from the match report — no change to any token.
 *
 * Wire contract (mirrors matchReport's env/auth/best-effort shape exactly):
 *   POST {GOSGAMES_INTERNAL_URL}/api/internal/presence/start
 *        body { userId, gameSlug, sessionRef, startedAt } → 200 { status:"leased" }
 *   POST {GOSGAMES_INTERNAL_URL}/api/internal/presence/heartbeat
 *        body { userId, gameSlug, sessionRef }            → 200 { status:"alive" }
 *   POST {GOSGAMES_INTERNAL_URL}/api/internal/presence/end
 *        body { userId, gameSlug, sessionRef, reason }    → 200 { status:"ended" }
 * Auth: X-Internal-Token: <INTERNAL_SERVICE_TOKEN> (NOT Bearer).
 *
 * Tolerated platform responses (never surfaced as errors to the player):
 *   409 { status:"superseded" } on start/heartbeat — the account took over elsewhere.
 *        We invoke onSuperseded() so the room terminates THIS local session and stops
 *        heartbeating (the player sees the "playing on another device" exit, UX D).
 *   404 { status:"no_lease" } on heartbeat/end — already gone; ignore, never error.
 *
 * Best-effort by design: presence must never break the game flow. Missing base URL or
 * token → silent no-op (local dev). Network errors are logged, never thrown — a throw
 * must never crash a Colyseus room. Boarded's lease is naturally in-memory: if the pod
 * restarts, its leases stop heartbeating and the platform expires them at 90 s.
 *
 * Boarded is EPHEMERAL — no durable per-user store, no deletion endpoint (O6 exempt).
 */

export const GAME_SLUG = 'boarded';

export type PresenceEndReason = 'left' | 'logout' | 'timeout' | 'remote_end' | 'server_shutdown';

function config(): { base: string; token: string } | null {
  const base = (process.env.GOSGAMES_INTERNAL_URL ?? '').replace(/\/$/, '');
  const token = process.env.INTERNAL_SERVICE_TOKEN ?? '';
  if (!base || !token) return null;
  return { base, token };
}

export interface PresenceOptions {
  userId: string;
  sessionRef: string;
  /** Invoked on a 409 superseded from start/heartbeat: tear down this local session. */
  onSuperseded?: () => void;
}

/**
 * A per-session presence handle. One instance per live (userId, sessionRef); start()
 * once when the session is established, heartbeat() every 30 s while live, end() on
 * leave/close. superseded() latches after the first 409 so we stop heartbeating.
 */
export class PlatformPresence {
  private readonly userId: string;
  private readonly sessionRef: string;
  private readonly onSuperseded?: () => void;
  private superseded_ = false;

  constructor(opts: PresenceOptions) {
    this.userId = opts.userId;
    this.sessionRef = opts.sessionRef;
    this.onSuperseded = opts.onSuperseded;
  }

  get isSuperseded(): boolean {
    return this.superseded_;
  }

  async start(startedAt: Date = new Date()): Promise<void> {
    await this.post('start', {
      userId: this.userId,
      gameSlug: GAME_SLUG,
      sessionRef: this.sessionRef,
      startedAt: startedAt.toISOString(),
    });
  }

  async heartbeat(): Promise<void> {
    if (this.superseded_) return; // stop heartbeating once taken over
    await this.post('heartbeat', {
      userId: this.userId,
      gameSlug: GAME_SLUG,
      sessionRef: this.sessionRef,
    });
  }

  async end(reason: PresenceEndReason): Promise<void> {
    await this.post('end', {
      userId: this.userId,
      gameSlug: GAME_SLUG,
      sessionRef: this.sessionRef,
      reason,
    });
  }

  private async post(path: 'start' | 'heartbeat' | 'end', body: Record<string, unknown>): Promise<void> {
    const cfg = config();
    if (!cfg) return; // best-effort: unconfigured → silent no-op
    try {
      const res = await fetch(`${cfg.base}/api/internal/presence/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Token': cfg.token },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        // The account took over elsewhere (start/heartbeat). Latch + tear down locally.
        if (!this.superseded_) {
          this.superseded_ = true;
          this.onSuperseded?.();
        }
        return;
      }
      if (res.status === 404) {
        // no_lease on heartbeat/end — already gone. Never error the player.
        return;
      }
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error(`[boarded] presence ${path} rejected: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[boarded] presence ${path} failed`, err);
    }
  }
}
