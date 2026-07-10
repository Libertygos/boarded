import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signJwt } from './jwt.js';
import { verifyHandoffToken, HandoffError } from './handoff.js';
import { issueSession, verifySession } from './session.js';

const SECRET = 'test-secret';
const NOW = 1_700_000_000;

function mint(overrides: Record<string, unknown> = {}, secret = SECRET): string {
  return signJwt(
    {
      iss: 'gosgames',
      aud: 'boarded',
      sub: 'user-1',
      access: true,
      iat: NOW,
      exp: NOW + 60,
      username: 'Jules',
      ...overrides,
    },
    secret,
  );
}

describe('handoff verification', () => {
  it('accepts a valid token and maps username to displayName', () => {
    const claims = verifyHandoffToken(mint(), SECRET, NOW);
    assert.equal(claims.sub, 'user-1');
    assert.equal(claims.displayName, 'Jules');
  });
  it('rejects a bad signature', () => {
    assert.throws(() => verifyHandoffToken(mint({}, 'other'), SECRET, NOW), HandoffError);
  });
  it('rejects a wrong audience (another tenant)', () => {
    assert.throws(() => verifyHandoffToken(mint({ aud: 'pantheons' }), SECRET, NOW), HandoffError);
  });
  it('rejects a wrong issuer', () => {
    assert.throws(() => verifyHandoffToken(mint({ iss: 'evil' }), SECRET, NOW), HandoffError);
  });
  it('rejects access !== true', () => {
    assert.throws(() => verifyHandoffToken(mint({ access: 'yes' }), SECRET, NOW), HandoffError);
  });
  it('rejects an expired token beyond skew', () => {
    assert.throws(() => verifyHandoffToken(mint({ exp: NOW - 10 }), SECRET, NOW), HandoffError);
  });
  it('accepts within the ±5s skew', () => {
    assert.ok(verifyHandoffToken(mint({ exp: NOW - 3 }), SECRET, NOW));
  });
});

describe('session S-JWT', () => {
  it('round-trips and carries displayName', () => {
    const token = issueSession('user-1', SECRET, 'Jules', NOW);
    const claims = verifySession(token, SECRET, NOW + 100);
    assert.equal(claims.sub, 'user-1');
    assert.equal(claims.displayName, 'Jules');
  });
  it('rejects after expiry', () => {
    const token = issueSession('user-1', SECRET, 'Jules', NOW);
    assert.throws(() => verifySession(token, SECRET, NOW + 9 * 3600));
  });
  it('rejects a handoff token used as a session token (iss mismatch)', () => {
    assert.throws(() => verifySession(mint(), SECRET, NOW));
  });
});
