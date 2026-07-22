import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { mountInternalRoutes, internalBearerOk } from './internalRoutes.js';
import {
  registerSessionHandle,
  unregisterSessionHandle,
  type SessionEndHandle,
} from '../rooms/session-directory.js';

afterEach(() => {
  delete process.env.INTERNAL_SERVICE_TOKEN;
});

describe('internalBearerOk (fail-closed constant-time bearer)', () => {
  afterEach(() => delete process.env.INTERNAL_SERVICE_TOKEN);

  test('unset token fails closed even for a "Bearer " header', () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    assert.equal(internalBearerOk('Bearer anything'), false);
    assert.equal(internalBearerOk('Bearer '), false);
  });

  test('accepts the exact bearer token, rejects wrong / malformed / missing', () => {
    process.env.INTERNAL_SERVICE_TOKEN = 's3cr3t';
    assert.equal(internalBearerOk('Bearer s3cr3t'), true);
    assert.equal(internalBearerOk('Bearer wrong'), false);
    assert.equal(internalBearerOk('s3cr3t'), false); // no scheme
    assert.equal(internalBearerOk('Basic s3cr3t'), false);
    assert.equal(internalBearerOk(undefined), false);
    assert.equal(internalBearerOk('Bearer s3cr3t-longer'), false); // length differs
  });
});

// ---- HTTP integration over a real express app on an ephemeral port ----------

function startApp(): Promise<{ url: string; close: () => Promise<void> }> {
  const app = express();
  app.use(express.json());
  mountInternalRoutes(app);
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/** A fake live room registered in the session directory; records teardown calls. */
class FakeHandle implements SessionEndHandle {
  calls: { userId: string; sessionRef?: string }[] = [];
  constructor(
    private liveUsers: Map<string, string>, // userId -> sessionRef
  ) {}
  endSessionsForUser(userId: string, sessionRef?: string): boolean {
    this.calls.push({ userId, sessionRef });
    if (!this.liveUsers.has(userId)) return false;
    if (sessionRef && this.liveUsers.get(userId) !== sessionRef) {
      // Exact ref given but not matching this room's session.
      return false;
    }
    this.liveUsers.delete(userId);
    return true;
  }
}

describe('POST /internal/sessions/end', () => {
  let app: { url: string; close: () => Promise<void> };
  let handle: FakeHandle;
  let live: Map<string, string>;

  beforeEach(async () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'tok';
    live = new Map([['u1', 'room7:u1']]);
    handle = new FakeHandle(live);
    registerSessionHandle(handle);
    app = await startApp();
  });

  afterEach(async () => {
    unregisterSessionHandle(handle);
    await app.close();
  });

  const post = (body: unknown, auth?: string) =>
    fetch(`${app.url}/internal/sessions/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });

  test('valid token ends the identified session (exact sessionRef)', async () => {
    const res = await post({ userId: 'u1', sessionRef: 'room7:u1' }, 'Bearer tok');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ended' });
    assert.deepEqual(handle.calls, [{ userId: 'u1', sessionRef: 'room7:u1' }]);
    assert.equal(live.has('u1'), false);
  });

  test('missing token → 401, no teardown', async () => {
    const res = await post({ userId: 'u1' });
    assert.equal(res.status, 401);
    assert.equal(handle.calls.length, 0);
    assert.equal(live.has('u1'), true);
  });

  test('bad token → 401, no teardown', async () => {
    const res = await post({ userId: 'u1' }, 'Bearer nope');
    assert.equal(res.status, 401);
    assert.equal(handle.calls.length, 0);
    assert.equal(live.has('u1'), true);
  });

  test('unset INTERNAL_SERVICE_TOKEN fails closed → 401 even with a bearer', async () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    const res = await post({ userId: 'u1' }, 'Bearer tok');
    assert.equal(res.status, 401);
    assert.equal(handle.calls.length, 0);
  });

  test('unknown / already-gone sessionRef is idempotent → still 200', async () => {
    const res = await post({ userId: 'ghost', sessionRef: 'nope:ghost' }, 'Bearer tok');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ended' });
    assert.deepEqual(handle.calls, [{ userId: 'ghost', sessionRef: 'nope:ghost' }]);
  });

  test('omitted sessionRef ends the sole live session for the user (end-all semantics)', async () => {
    const res = await post({ userId: 'u1' }, 'Bearer tok');
    assert.equal(res.status, 200);
    assert.deepEqual(handle.calls, [{ userId: 'u1', sessionRef: undefined }]);
    assert.equal(live.has('u1'), false);
  });

  test('missing userId → 400', async () => {
    const res = await post({}, 'Bearer tok');
    assert.equal(res.status, 400);
    assert.equal(handle.calls.length, 0);
  });
});
