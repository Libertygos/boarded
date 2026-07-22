/**
 * RoomPresence lease bookkeeping (login_all_games.md O2/O5): a session starts exactly one
 * lease, an in-grace reconnect never mints a second, end() emits one presence/end, endAll()
 * releases everything, and a 409 supersede latches + fires the room's teardown hook + skips
 * the redundant network end().
 */
import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RoomPresence, PRESENCE_HEARTBEAT_MS } from './RoomPresence.js';

const realFetch = globalThis.fetch;

interface PresenceCall {
  path: 'start' | 'heartbeat' | 'end';
  body: Record<string, unknown>;
}

let calls: PresenceCall[];

function capture(status = 200): void {
  calls = [];
  globalThis.fetch = ((url: string, init: RequestInit) => {
    const m = /\/api\/internal\/presence\/(start|heartbeat|end)$/.exec(url);
    if (m) calls.push({ path: m[1] as PresenceCall['path'], body: JSON.parse(init.body as string) });
    return Promise.resolve(new Response('{}', { status }));
  }) as typeof fetch;
}

/** Flush the microtask queue so a fire-and-forget presence POST resolves. */
const flush = () => new Promise((r) => setImmediate(r));

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.GOSGAMES_INTERNAL_URL;
  delete process.env.INTERNAL_SERVICE_TOKEN;
});

describe('RoomPresence', () => {
  let superseded: string[];
  let presence: RoomPresence;

  beforeEach(() => {
    process.env.GOSGAMES_INTERNAL_URL = 'http://gosgames';
    process.env.INTERNAL_SERVICE_TOKEN = 'secret';
    capture();
    superseded = [];
    presence = new RoomPresence({
      sessionRefFor: (userId) => `ROOMID:${userId}`,
      onSuperseded: (userId) => superseded.push(userId),
    });
  });

  test('the 30s cadence constant matches the ratified contract', () => {
    assert.equal(PRESENCE_HEARTBEAT_MS, 30_000);
  });

  test('start() emits exactly one presence/start with sessionRef `${roomId}:${userId}`', async () => {
    presence.start('u1');
    await flush();
    const starts = calls.filter((c) => c.path === 'start');
    assert.equal(starts.length, 1);
    assert.equal(starts[0]!.body.sessionRef, 'ROOMID:u1');
    assert.equal(starts[0]!.body.gameSlug, 'boarded');
    assert.equal(starts[0]!.body.userId, 'u1');
    assert.match(String(starts[0]!.body.startedAt), /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(presence.has('u1'), true);
  });

  test('start() is idempotent per userId — an in-grace reconnect never mints a second lease (O5)', async () => {
    presence.start('u1');
    presence.start('u1'); // simulate onJoin re-running for an in-grace reconnect
    await flush();
    assert.equal(calls.filter((c) => c.path === 'start').length, 1);
  });

  test('end() emits exactly one presence/end carrying the reason, and clears the entry', async () => {
    presence.start('u1');
    await flush();
    calls.length = 0;
    presence.end('u1', 'left');
    await flush();
    const ends = calls.filter((c) => c.path === 'end');
    assert.equal(ends.length, 1);
    assert.equal(ends[0]!.body.reason, 'left');
    assert.equal(ends[0]!.body.sessionRef, 'ROOMID:u1');
    assert.equal(presence.has('u1'), false);
  });

  test('end() on an unknown user is a harmless no-op', async () => {
    presence.end('ghost', 'left');
    await flush();
    assert.equal(calls.length, 0);
  });

  test('endAll() releases every live lease', async () => {
    presence.start('u1');
    presence.start('u2');
    await flush();
    calls.length = 0;
    presence.endAll('server_shutdown');
    await flush();
    const ends = calls.filter((c) => c.path === 'end');
    assert.equal(ends.length, 2);
    assert.deepEqual(new Set(ends.map((e) => e.body.userId)), new Set(['u1', 'u2']));
    assert.deepEqual(presence.users(), []);
  });

  test('409 supersede on start: fires onSuperseded, and a subsequent end() skips the network call', async () => {
    capture(409); // every presence POST returns superseded
    presence.start('u1');
    await flush();
    assert.deepEqual(superseded, ['u1']);
    // The lease latched superseded → end() must not POST (it would be a guaranteed 404).
    calls.length = 0;
    presence.end('u1', 'remote_end');
    await flush();
    assert.equal(calls.filter((c) => c.path === 'end').length, 0);
  });

  test('best-effort: start/end are silent no-ops when the platform is unconfigured', async () => {
    delete process.env.GOSGAMES_INTERNAL_URL;
    delete process.env.INTERNAL_SERVICE_TOKEN;
    presence.start('u1');
    presence.end('u1', 'left');
    await flush();
    assert.equal(calls.length, 0);
  });
});
