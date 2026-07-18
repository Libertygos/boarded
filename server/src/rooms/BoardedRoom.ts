/**
 * BoardedRoom — thin Colyseus transport adapter over the @boarded/engine, carrying the WoG
 * room model (wog-room.md): room codes, a host/ready lobby with configurable seat slots
 * (min 2 / max 4), reconnection grace windows, duplicate-account rejection, and the
 * ≥2-concurrent-drops abort that rebuilds a fresh lobby from the survivors.
 *
 * CRITICAL: no Colyseus automatic schema state sync (one shared state broadcast) — hidden-
 * information games must never do that. The server holds the authoritative GameState and
 * pushes a PER-CLIENT projection (project(state, userId)) as messages. On reconnect the
 * client is seeded from a fresh projection ONLY (never-send guarantee, wog-room.md §5.3).
 *
 * The acting player is always derived from the connection (client.userData.userId set in
 * onJoin from the verified session), never from a field in a client message.
 */
import { Room, ServerError, type Client } from '@colyseus/core';
import {
  advance,
  applyMove,
  createGame,
  makeRng,
  project,
  MAX_PLAYERS,
  MIN_PLAYERS,
  DEFAULT_SEATS,
  type GameState,
  type Move,
  type SeatInput,
} from '@boarded/engine';
import { generateRoomCode, normalizeRoomCode } from './room-code.js';
import { isCodeTaken, registerRoom, unregisterRoom, type RoomPhase } from './room-registry.js';
import { verifySession } from '../auth/session.js';
import { reportMatch } from '../http/matchReport.js';
import {
  recordPlayerConnected,
  recordPlayerDisconnected,
  recordRoomClosed,
  recordRoomOpened,
} from '../http/metrics.js';

interface JoinOptions {
  sessionToken: string;
  /** Present on join-by-code; absent on create. Checked against this room's code. */
  roomCode?: string;
}

type ConnStatus = 'CONNECTED' | 'DISCONNECTED';

interface SeatSlot {
  userId: string | null;
  displayName: string;
  ready: boolean;
  conn: ConnStatus;
}

export interface SeatInfo {
  seatId: number;
  occupied: boolean;
  displayName: string;
  ready: boolean;
  conn: ConnStatus;
}

// WoG grace windows (wog-room.md §5.1 / §5.2): 60 s in lobby and in match.
export const LOBBY_RECONNECT_GRACE_S = 60;
export const MATCH_RECONNECT_GRACE_S = 60;

function emptySlot(): SeatSlot {
  return { userId: null, displayName: '', ready: false, conn: 'CONNECTED' };
}

export class BoardedRoom extends Room {
  override maxClients = MAX_PLAYERS;

  private roomCode = '';
  private slots: SeatSlot[] = Array.from({ length: DEFAULT_SEATS }, emptySlot);
  private hostSeat = -1;
  private accountToSeat = new Map<string, number>();
  private clientByUser = new Map<string, Client>();
  /** Pending reconnection grace windows, cancellable on abort (userId -> rejecter). */
  private graceByUser = new Map<string, { reject: () => void }>();

  private state_: GameState | null = null;
  /** Match-time randomness (steals, reshuffles) — server-owned, seeded per match. */
  private rng: (() => number) | null = null;
  private started = false;
  private sessionSecret = process.env.SESSION_JWT_SECRET ?? '';
  /** Facts for the platform match report, frozen at startMatch (the room locks). */
  private matchStartedAt: Date | null = null;
  private matchPlayerIds: string[] = [];
  private matchReported = false;

  // ---- lifecycle ------------------------------------------------------------

  override onCreate(): void {
    recordRoomOpened();
    do {
      this.roomCode = generateRoomCode();
    } while (isCodeTaken(this.roomCode));
    registerRoom(this.roomCode, this.roomId, () => this.registryPhase());
    void this.setMetadata({ roomCode: this.roomCode });

    // Lobby surface (wog-room.md §4.2)
    this.onMessage('SET_READY', (client, msg: { ready?: boolean }) =>
      this.guard(client, (uid) => this.setReady(uid, msg?.ready === true)),
    );
    this.onMessage('ADD_SEAT', (client) => this.guard(client, (uid) => this.addSeat(uid)));
    this.onMessage('REMOVE_SEAT', (client) => this.guard(client, (uid) => this.removeSeat(uid)));
    this.onMessage('START_MATCH', (client) => this.guard(client, (uid) => this.startMatch(uid)));
    this.onMessage('LEAVE_ROOM', (client) => this.guard(client, (uid) => this.consentedLeave(uid)));
    this.onMessage('REQUEST_LOBBY_STATE', (client) => client.send('LOBBY_STATE', this.lobbyState()));
    // Re-ask pattern (wog-room.md §4.1): join/reconnect-time unicasts race handler
    // registration client-side, so a resuming client explicitly requests its state.
    this.onMessage('REQUEST_STATE', (client) => this.guard(client, (uid) => this.sendResumeState(client, uid)));

    // Match surface: a single MOVE channel; the engine validates against the top frame.
    this.onMessage('MOVE', (client, msg: Move) =>
      this.guard(client, (uid) => {
        if (!this.state_ || !this.rng) throw new Error('La partie n’est pas lancée.');
        applyMove(this.state_, uid, msg, this.rng);
        this.afterEngineStep();
      }),
    );
  }

  override onDispose(): void {
    recordRoomClosed();
    for (const grace of this.graceByUser.values()) grace.reject();
    this.graceByUser.clear();
    unregisterRoom(this.roomCode);
  }

  private registryPhase(): RoomPhase {
    if (!this.started) return 'LOBBY';
    return this.state_?.status === 'ended' ? 'ENDED' : 'IN_PROGRESS';
  }

  // ---- auth & join (wog-room.md §6.1) ----------------------------------------

  override async onAuth(_client: Client, options: JoinOptions): Promise<{ userId: string; displayName: string }> {
    // Session S-JWT (NOT the handoff token) authorises the socket.
    let claims;
    try {
      claims = verifySession(options.sessionToken, this.sessionSecret);
    } catch {
      throw new ServerError(401, 'UNAUTHORIZED');
    }
    const userId = claims.sub;

    // Code match — a join addressed to another room's code must not land here.
    if (options.roomCode !== undefined && normalizeRoomCode(options.roomCode) !== this.roomCode) {
      throw new ServerError(400, 'BAD_CODE');
    }
    // Duplicate-account guard: the seat is genuinely live in another tab (§5.4).
    const existingSeat = this.accountToSeat.get(userId);
    if (existingSeat !== undefined && this.slots[existingSeat]?.conn === 'CONNECTED') {
      throw new ServerError(409, 'ALREADY_IN_ROOM');
    }
    // Joiners only in LOBBY (mid-match re-entry is reconnect-only).
    if (this.started) {
      throw new ServerError(409, 'ROOM_IN_PROGRESS');
    }
    // Capacity: full only when every CONFIGURED slot is bound (not at MAX_PLAYERS).
    if (existingSeat === undefined && this.slots.every((s) => s.userId !== null)) {
      throw new ServerError(409, 'ROOM_FULL');
    }
    return { userId, displayName: claims.displayName ?? userId };
  }

  override onJoin(client: Client, _options: JoinOptions, auth?: { userId: string; displayName: string }): void {
    if (!auth) return;
    recordPlayerConnected();
    const { userId, displayName } = auth;
    client.userData = { userId };
    this.clientByUser.set(userId, client);

    // Re-bind the account's own seat if it is held in a lobby grace window, else next free.
    let seatId = this.accountToSeat.get(userId) ?? -1;
    if (seatId >= 0) {
      this.graceByUser.get(userId)?.reject();
    } else {
      seatId = this.slots.findIndex((s) => s.userId === null);
      if (seatId < 0) throw new ServerError(409, 'ROOM_FULL'); // defense-in-depth
    }
    this.slots[seatId] = { userId, displayName, ready: false, conn: 'CONNECTED' };
    this.accountToSeat.set(userId, seatId);

    // The first connection becomes host (§6.1).
    const isFirst = this.hostSeat < 0;
    if (isFirst) this.hostSeat = seatId;
    client.send(isFirst ? 'ROOM_CREATED' : 'JOIN_OK', {
      roomCode: this.roomCode,
      seatId,
      hostSeat: this.hostSeat,
    });
    this.broadcastLobby();
  }

  // ---- leave / refresh / drop (wog-room.md §5) --------------------------------

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const userId = client.userData?.userId as string | undefined;
    if (!userId) return;
    recordPlayerDisconnected();
    this.clientByUser.delete(userId);

    if (this.started && this.state_) {
      await this.handleInMatchDisconnect(client, userId, consented);
      return;
    }

    // LOBBY branch. A consented leave frees the seat; an unconsented drop (refresh, tab
    // close) opens a 60 s grace window with the seat held (§5.1).
    if (consented) {
      this.freeSeat(userId);
      this.broadcastLobby();
      return;
    }
    const seatId = this.accountToSeat.get(userId);
    if (seatId === undefined) return; // already freed via LEAVE_ROOM
    this.slots[seatId]!.conn = 'DISCONNECTED';
    this.slots[seatId]!.ready = false;
    this.broadcastLobby();
    try {
      await this.openGrace(client, userId, LOBBY_RECONNECT_GRACE_S);
      // Reconnected: same client instance is live again. onJoin does not re-run.
      recordPlayerConnected();
      this.clientByUser.set(userId, client);
      const seat = this.accountToSeat.get(userId);
      if (seat !== undefined) this.slots[seat]!.conn = 'CONNECTED';
      client.send('JOIN_OK', { roomCode: this.roomCode, seatId: seat, hostSeat: this.hostSeat });
      this.broadcastLobby();
    } catch {
      // Grace expired (or cancelled): free the seat — lobby seats are re-bindable.
      this.freeSeat(userId);
      this.broadcastLobby();
    }
  }

  /** §5.2/§5.5: single drop → hold the seat + auto-resolve; two concurrent drops → abort. */
  private async handleInMatchDisconnect(client: Client, userId: string, consented: boolean): Promise<void> {
    const state = this.state_!;
    const p = state.players[userId];
    if (!p) return;
    p.connected = false;
    const seatId = this.accountToSeat.get(userId);
    if (seatId !== undefined) this.slots[seatId]!.conn = 'DISCONNECTED';
    this.broadcast('CONN_STATUS', { userId, conn: 'DISCONNECTED' });

    const dropped = state.seatOrder.filter((uid) => !state.players[uid]!.connected);
    if (dropped.length >= 2 && state.status !== 'ended') {
      this.abortMatch();
      return;
    }

    // The match continues: the engine auto-resolves the disconnected seat's pending input
    // so play never blocks.
    if (state.status === 'playing' && this.rng) {
      advance(state, this.rng);
      this.afterEngineStep();
    }

    if (consented || state.status === 'ended') return;
    try {
      await this.openGrace(client, userId, MATCH_RECONNECT_GRACE_S);
      recordPlayerConnected();
      this.clientByUser.set(userId, client);
      p.connected = true;
      if (seatId !== undefined) this.slots[seatId]!.conn = 'CONNECTED';
      // Never-send guarantee on resume: a fresh, fully-filtered projection for that seat
      // ONLY — the client must seed from this payload alone (§5.3).
      client.send('RECONNECT_OK', {
        roomCode: this.roomCode,
        seatId,
        hostSeat: this.hostSeat,
        state: project(this.state_!, userId),
      });
      this.broadcast('CONN_STATUS', { userId, conn: 'CONNECTED' });
      this.broadcastProjections();
    } catch {
      // Grace expired mid-match: the seat is gone for re-entry; the engine keeps
      // auto-resolving it so play never blocks.
    }
  }

  private async openGrace(client: Client, userId: string, seconds: number): Promise<void> {
    const deferred = this.allowReconnection(client, seconds);
    this.graceByUser.set(userId, { reject: () => deferred.reject() });
    try {
      await deferred;
    } finally {
      this.graceByUser.delete(userId);
    }
  }

  /** §5.5: cancel graces, rebuild a fresh lobby from the surviving connected seats. */
  private abortMatch(): void {
    const state = this.state_;
    for (const grace of this.graceByUser.values()) grace.reject();
    this.graceByUser.clear();

    // Preserve configured seat count and survivors' seat indices; free dropped seats.
    for (const slot of this.slots) {
      if (!slot.userId) continue;
      const pl = state?.players[slot.userId];
      if (pl && pl.connected) {
        slot.ready = false;
        slot.conn = 'CONNECTED';
      } else {
        this.accountToSeat.delete(slot.userId);
        Object.assign(slot, emptySlot());
      }
    }
    const lowestBound = this.slots.findIndex((s) => s.userId !== null);
    this.hostSeat = lowestBound; // may be -1 if everyone dropped; next join becomes host
    this.state_ = null;
    this.rng = null;
    this.started = false;
    this.unlock();
    // No treasure reveal on abort. Everyone lands back in this room's lobby.
    this.broadcast('MATCH_ABORTED', { message: 'Partie interrompue : plusieurs joueurs déconnectés.' });
    this.broadcastLobby();
  }

  private freeSeat(userId: string): void {
    const seatId = this.accountToSeat.get(userId);
    if (seatId === undefined) return;
    this.accountToSeat.delete(userId);
    this.slots[seatId] = emptySlot();
    if (this.hostSeat === seatId) {
      this.hostSeat = this.slots.findIndex((s) => s.userId !== null);
    }
  }

  // ---- lobby actions (wog-room.md §4.2) ---------------------------------------

  private setReady(userId: string, ready: boolean): void {
    this.assertLobby();
    const seatId = this.accountToSeat.get(userId);
    if (seatId === undefined) return;
    this.slots[seatId]!.ready = ready;
    this.broadcastLobby();
  }

  private addSeat(userId: string): void {
    this.assertLobby();
    this.assertHost(userId);
    if (this.slots.length >= MAX_PLAYERS) throw new Error(`Maximum ${MAX_PLAYERS} sièges.`);
    this.slots.push(emptySlot());
    this.broadcastLobby();
  }

  private removeSeat(userId: string): void {
    this.assertLobby();
    this.assertHost(userId);
    if (this.slots.length <= MIN_PLAYERS) throw new Error(`Minimum ${MIN_PLAYERS} sièges.`);
    if (this.slots[this.slots.length - 1]!.userId !== null) {
      throw new Error('Le dernier siège est occupé.'); // trailing-empty-only, indices stay stable
    }
    this.slots.pop();
    this.broadcastLobby();
  }

  private consentedLeave(userId: string): void {
    if (this.started) return; // in-match leave goes through onLeave(consented)
    this.freeSeat(userId);
    this.broadcastLobby();
  }

  private canStart(): boolean {
    return (
      this.slots.length >= MIN_PLAYERS &&
      this.slots.length <= MAX_PLAYERS &&
      this.slots.every((s) => s.userId !== null && s.ready && s.conn === 'CONNECTED')
    );
  }

  private startMatch(userId: string): void {
    this.assertLobby();
    this.assertHost(userId);
    if (!this.canStart()) {
      throw new Error(`Il faut ${MIN_PLAYERS}–${MAX_PLAYERS} joueurs, tous prêts et connectés.`);
    }
    const seatInputs: SeatInput[] = this.slots.map((s) => ({ userId: s.userId!, displayName: s.displayName }));
    const seed = Math.floor(Math.random() * 0xffffffff);
    this.state_ = createGame(this.roomId, seatInputs, seed);
    // Separate stream for move-time randomness (steals, reshuffles) — still injected.
    this.rng = makeRng((seed ^ 0x9e3779b9) >>> 0);
    this.started = true;
    this.matchStartedAt = new Date();
    this.matchPlayerIds = seatInputs.map((s) => s.userId);
    this.lock(); // no new joiners mid-match (reconnects still allowed)
    // The start signal is the first per-seat projection ('state'), wog-room.md §4.3.
    this.afterEngineStep();
  }

  private assertLobby(): void {
    if (this.started) throw new Error('La partie est déjà lancée.');
  }

  private assertHost(userId: string): void {
    if (this.accountToSeat.get(userId) !== this.hostSeat) {
      throw new Error("Réservé à l'hôte.");
    }
  }

  // ---- outbound ---------------------------------------------------------------

  private lobbyState(): {
    roomCode: string;
    hostSeat: number;
    seats: SeatInfo[];
    canStart: boolean;
    minSeats: number;
    maxSeats: number;
  } {
    return {
      roomCode: this.roomCode,
      hostSeat: this.hostSeat,
      seats: this.slots.map((s, i) => ({
        seatId: i,
        occupied: s.userId !== null,
        displayName: s.displayName,
        ready: s.ready,
        conn: s.conn,
      })),
      canStart: this.canStart(),
      minSeats: MIN_PLAYERS,
      maxSeats: MAX_PLAYERS,
    };
  }

  private broadcastLobby(): void {
    this.broadcast('LOBBY_STATE', this.lobbyState());
  }

  /** Unicast reply to REQUEST_STATE: a fresh filtered projection mid-match, else lobby. */
  private sendResumeState(client: Client, userId: string): void {
    if (this.started && this.state_ && this.state_.players[userId]) {
      client.send('RECONNECT_OK', {
        roomCode: this.roomCode,
        seatId: this.accountToSeat.get(userId),
        hostSeat: this.hostSeat,
        state: project(this.state_, userId),
      });
      return;
    }
    client.send('LOBBY_STATE', this.lobbyState());
  }

  /** After any engine mutation: drain private reveals (unicast) then re-project everyone. */
  private afterEngineStep(): void {
    const state = this.state_;
    if (!state) return;
    for (const reveal of state.reveals.splice(0)) {
      this.clientByUser.get(reveal.to)?.send('reveal', reveal);
    }
    this.broadcastProjections();
    if (state.status === 'ended') {
      this.broadcast('gameOver', { winner: state.winner });
      // Completed matches only — an abandoned room (dispose without an end)
      // is not a played game for the platform stats. Guarded: afterEngineStep
      // can run again on the ended state (reconnect re-projections).
      if (!this.matchReported && this.matchStartedAt) {
        this.matchReported = true;
        // state.winner is already a platform account id; the platform only
        // accepts a winner who is a participant, so guard with matchPlayerIds.
        const winner = state.winner;
        void reportMatch({
          playerAccountIds: this.matchPlayerIds,
          startedAt: this.matchStartedAt,
          endedAt: new Date(),
          ...(winner && this.matchPlayerIds.includes(winner)
            ? { winnerAccountIds: [winner] }
            : {}),
        });
      }
    }
  }

  private broadcastProjections(): void {
    const state = this.state_;
    if (!state) return;
    for (const uid of Object.keys(state.players)) {
      this.clientByUser.get(uid)?.send('state', project(state, uid));
    }
  }

  /** Derive the actor from the connection; surface rejections to the sender only. */
  private guard(client: Client, fn: (userId: string) => void): void {
    const userId = client.userData?.userId as string | undefined;
    if (!userId) return;
    try {
      fn(userId);
    } catch (err) {
      client.send('error', { message: err instanceof Error ? err.message : 'Erreur' });
    }
  }
}
