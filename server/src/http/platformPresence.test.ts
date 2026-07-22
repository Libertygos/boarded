import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PlatformPresence } from './platformPresence.js';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.GOSGAMES_INTERNAL_URL;
  delete process.env.INTERNAL_SERVICE_TOKEN;
});

interface Call {
  url: string;
  init: RequestInit;
}

function captureFetch(status = 200, bodyText = '{}') {
  const calls: Call[] = [];
  globalThis.fetch = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(bodyText, { status }));
  }) as typeof fetch;
  return calls;
}

function configure() {
  process.env.GOSGAMES_INTERNAL_URL = 'http://gosgames.gosgames.svc.cluster.local';
  process.env.INTERNAL_SERVICE_TOKEN = 'secret';
}

test('start: POSTs the ratified start contract with the internal token (X-Internal-Token, not Bearer)', async () => {
  configure();
  const calls = captureFetch(200, '{"status":"leased"}');
  const p = new PlatformPresence({ userId: 'u1', sessionRef: 'room7:u1' });

  await p.start(new Date('2026-07-22T10:00:00Z'));

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, 'http://gosgames.gosgames.svc.cluster.local/api/internal/presence/start');
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers['X-Internal-Token'], 'secret');
  assert.equal(headers['Authorization'], undefined);
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), {
    userId: 'u1',
    gameSlug: 'boarded',
    sessionRef: 'room7:u1',
    startedAt: '2026-07-22T10:00:00.000Z',
  });
});

test('heartbeat: POSTs the heartbeat contract (no startedAt, no reason)', async () => {
  configure();
  const calls = captureFetch(200, '{"status":"alive"}');
  const p = new PlatformPresence({ userId: 'u1', sessionRef: 'room7:u1' });

  await p.heartbeat();

  assert.equal(calls[0]!.url, 'http://gosgames.gosgames.svc.cluster.local/api/internal/presence/heartbeat');
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), {
    userId: 'u1',
    gameSlug: 'boarded',
    sessionRef: 'room7:u1',
  });
});

test('end: POSTs the end contract carrying the reason', async () => {
  configure();
  const calls = captureFetch(200, '{"status":"ended"}');
  const p = new PlatformPresence({ userId: 'u1', sessionRef: 'room7:u1' });

  await p.end('left');

  assert.equal(calls[0]!.url, 'http://gosgames.gosgames.svc.cluster.local/api/internal/presence/end');
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), {
    userId: 'u1',
    gameSlug: 'boarded',
    sessionRef: 'room7:u1',
    reason: 'left',
  });
});

test('best-effort: silent no-op when base URL / token are absent', async () => {
  const calls = captureFetch();
  const p = new PlatformPresence({ userId: 'u1', sessionRef: 'room7:u1' });
  await p.start();
  await p.heartbeat();
  await p.end('left');
  assert.equal(calls.length, 0);
});

test('best-effort: a rejected or failing POST never throws', async () => {
  configure();
  captureFetch(500, 'boom');
  const p = new PlatformPresence({ userId: 'u1', sessionRef: 'room7:u1' });
  await p.start();

  globalThis.fetch = (() => Promise.reject(new Error('ECONNREFUSED'))) as typeof fetch;
  await p.heartbeat();
  await p.end('timeout'); // must all resolve, never reject
});

test('409 superseded on start: latches, fires onSuperseded once, and halts heartbeating', async () => {
  configure();
  const calls = captureFetch(409, '{"status":"superseded"}');
  let supersededCount = 0;
  const p = new PlatformPresence({
    userId: 'u1',
    sessionRef: 'room7:u1',
    onSuperseded: () => {
      supersededCount++;
    },
  });

  await p.start();
  assert.equal(p.isSuperseded, true);
  assert.equal(supersededCount, 1);

  // Once superseded, heartbeat is a no-op (no further network call, no re-fire).
  await p.heartbeat();
  assert.equal(calls.length, 1, 'heartbeat after supersede must not hit the network');
  assert.equal(supersededCount, 1);
});

test('409 superseded on heartbeat: fires onSuperseded and stops', async () => {
  configure();
  captureFetch(409, '{"status":"superseded"}');
  let fired = false;
  const p = new PlatformPresence({
    userId: 'u1',
    sessionRef: 'room7:u1',
    onSuperseded: () => {
      fired = true;
    },
  });

  await p.heartbeat();
  assert.equal(fired, true);
  assert.equal(p.isSuperseded, true);
});

test('404 no_lease on heartbeat/end: ignored, never errors, never fires onSuperseded', async () => {
  configure();
  captureFetch(404, '{"status":"no_lease"}');
  let fired = false;
  const p = new PlatformPresence({
    userId: 'u1',
    sessionRef: 'room7:u1',
    onSuperseded: () => {
      fired = true;
    },
  });

  await p.heartbeat();
  await p.end('left');
  assert.equal(fired, false);
  assert.equal(p.isSuperseded, false);
});
