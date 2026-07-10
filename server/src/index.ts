/**
 * À l'abordage server bootstrap: Express (handoff exchange + probes) + Colyseus (rooms).
 * Server-authoritative; mirrors the WoG/Pantheons server shape.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { BoardedRoom } from './rooms/BoardedRoom.js';
import { lookupRoom } from './rooms/room-registry.js';
import { normalizeRoomCode } from './rooms/room-code.js';
import { verifyHandoffToken } from './auth/handoff.js';
import { issueSession } from './auth/session.js';
import { metricsText } from './http/metrics.js';

const PORT = Number(process.env.PORT ?? 2567);
const HANDOFF_SECRET = process.env.HANDOFF_JWT_SECRET ?? '';
const SESSION_SECRET = process.env.SESSION_JWT_SECRET ?? '';
const DEV_AUTH = process.env.DEV_AUTH === '1';

const app = express();
app.use(express.json());

// Liveness probe: process is up and responding. Never fails on external state.
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/healthz/ready', (_req, res) => res.status(200).json({ status: 'ok' }));

// Prometheus metrics (mirrors WoG O-METRICS). Counts only — no hidden state.
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsText());
});

/**
 * Handoff exchange: client POSTs the handoff token (read from the URL fragment client-side,
 * then cleared). We verify it (aud === "boarded") and return the game's OWN session S-JWT.
 * The handoff token is never reused as a session token.
 */
app.post('/auth/exchange', (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!token) return res.status(400).json({ error: 'missing token' });
  try {
    const claims = verifyHandoffToken(token, HANDOFF_SECRET);
    const session = issueSession(claims.sub, SESSION_SECRET, claims.displayName);
    return res.json({
      sessionToken: session,
      userId: claims.sub,
      displayName: claims.displayName ?? claims.sub,
    });
  } catch {
    return res.status(401).json({ error: 'handoff_rejected' });
  }
});

/**
 * Local development ONLY (DEV_AUTH=1): mint a guest session without the platform.
 * Lets you open 2–4 browser tabs and play. Disabled (404) unless explicitly enabled.
 */
if (DEV_AUTH) {
  app.post('/auth/dev', (req, res) => {
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim().slice(0, 24) : '';
    if (!name) return res.status(400).json({ error: 'missing name' });
    const userId = `dev-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return res.json({ sessionToken: issueSession(userId, SESSION_SECRET, name), userId, displayName: name });
  });
}

/**
 * Room-existence probe (wog-room.md §3.1): lets a reloaded client decide between
 * reconnect / fresh join / "room not found" without opening a socket to a dead room.
 */
app.get('/api/rooms/:code/exists', (req, res) => {
  const found = lookupRoom(normalizeRoomCode(req.params.code));
  if (!found) return res.json({ exists: false });
  return res.json({ exists: true, phase: found.phase, roomId: found.roomId });
});

// Same-origin SPA (wog-room.md §0): the game server serves the built client so the
// WebSocket and all /api/* calls share the page host. `/room/:code` deep links fall back
// to index.html (client-side routing).
const clientDist =
  process.env.CLIENT_DIST ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(['/', '/room/:code'], (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const httpServer = http.createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('boarded', BoardedRoom);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[boarded] listening on :${PORT}${DEV_AUTH ? ' (DEV_AUTH enabled)' : ''}`);
});
