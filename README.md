# À l'abordage (boarded)

Card drafting / take-that treasure race for 2–4 pirates (~20 min), as a web game.
`gameplay.md` is the source of truth for all rules. gosgames tenant — same architecture
as War of Guilds / Pantheons (see `wog-room.md` in the Pantheons repo).

## Layout

| Package | Role |
| --- | --- |
| `packages/engine` | Pure rules/state. No I/O, no clock, injected rng. Interrupt-stack interpreter (`flow.ts`). |
| `server` | Authoritative Colyseus server. Validates, calls the engine, pushes per-seat projections. |
| `client` | React + Vite SPA. Untrusted; renders only what the server sends. Placeholder theme (art comes later). |

## Development

```bash
pnpm install
pnpm --filter @boarded/engine build   # server/client resolve engine types from dist
pnpm test                             # engine + server tests
pnpm typecheck

# Local play without the gosgames platform (2–4 tabs):
SESSION_JWT_SECRET=dev DEV_AUTH=1 pnpm dev:server   # :2567
pnpm dev:client                                     # :5173 (proxies /auth, /api, /matchmake)
```

`DEV_AUTH=1` enables `POST /auth/dev` (guest login). Never set it in production —
production identity comes from the gosgames handoff token (`aud: "boarded"`).

## Production

One container image (`Dockerfile`): Node server + built SPA served same-origin.
Required env: `SESSION_JWT_SECRET`, `HANDOFF_JWT_SECRET`, `PORT` (default 2567).
