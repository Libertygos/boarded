# progress_gradi.md — À l'abordage implementation progress

> **Resume protocol**: read this file top to bottom, then continue at the first unchecked item
> in the "Status checklist" section. Commit + push to branch `claude/inspiring-keller-9bfuu0`
> regularly, and update this file in the same commits.

## Mission

Implement `gameplay.md` (À l'abordage, 2–4p pirate card game) as a web game, mirroring the
architecture of the **Pantheons** and **war-of-guilds** repos: **room + landing page + gameroom**,
same technologies. No images / no theme for now (placeholders); art comes later.

## Reference repos (re-clone next session if needed)

- `Libertygos/Pantheons` → was cloned at `/workspace/pantheons` (use `add_repo` tool then
  `git clone --depth 1 https://github.com/libertygos/pantheons /workspace/pantheons`)
- `Libertygos/war-of-guilds` → `/workspace/war-of-guilds` (same procedure)
- **`/workspace/pantheons/wog-room.md` is the master reference doc**: a complete extraction of the
  landing/room/refresh architecture (auth entry, resume, reconnect grace, lobby protocol,
  per-seat projection). Pantheons is the newer/cleaner tenant — copy its layout.

## Technology stack (same as Pantheons)

- **pnpm monorepo** (`pnpm@11.8.0`, workspace: `packages/*`, `server`, `client`), TypeScript ~5.6, ESM, Node >= 22.
- **Engine**: `packages/engine` — pure rules/state, no I/O, no clock, no Math.random (injected rng),
  tests via `tsc -p tsconfig.test.json && node --test`.
- **Server**: `server/` — Colyseus `@colyseus/core` 0.15 + `@colyseus/ws-transport` + express 4.
  Authoritative; per-seat projections; rooms in-process/ephemeral. drizzle-orm + pg for accounts DB
  (Pantheons uses it for auth sessions + deletion route).
- **Client**: `client/` — React 18 + Vite 5 SPA, `colyseus.js` 0.15, no router lib (tiny hash/history
  router in `src/router.ts`), screens: LandingScreen / RoomScreen / RoomLobby / GameView.
- **Auth**: platform handoff JWT in URL fragment → POST `/api/auth/handoff` → httpOnly session
  cookie; session probe `GET /api/auth/session`; bounce to gosgames platform otherwise.
  (see wog-room.md §1)

## Architecture summary (from wog-room.md — the contract to reproduce)

1. **Landing** (`client/src/screens/LandingScreen.tsx`): resume auto-redirect via
   `localStorage` record; Create room (`client.create('game')`) / Join by code
   (`client.join('game', { roomCode })`); one-shot `ROOM_CREATED` / `JOIN_OK` handlers →
   `saveResume` + `setActiveRoom` (module-level live-socket baton) + navigate `/room/<code>`.
2. **RoomScreen** (`/room/:code`): acquisition state machine — adopt baton → probe
   `GET /api/rooms/:code/exists` → reconnect with stored token OR fresh join; views
   `connecting | lobby | game | end | duplicate`; unmount = `room.leave(false)` (unconsented →
   server opens grace window).
3. **RoomLobby**: `LOBBY_STATE` broadcast (+`REQUEST_LOBBY_STATE` re-ask), `SET_READY`,
   host-only `ADD_SEAT`/`REMOVE_SEAT`/`START_MATCH`, `LEAVE_ROOM` (consented). First
   `STATE_UPDATE` = game start signal.
4. **Server room**: `onAuth` (JWT cookie verify + BAD_CODE/ROOM_FULL/ROOM_IN_PROGRESS/
   ALREADY_IN_ROOM), seat maps `sessionToSeat`/`accountToSeat`, host = lowest bound seat,
   60s reconnect grace lobby + in-match, ≥2 concurrent drops mid-match → abort back to lobby,
   `advance()` driver runs engine to next input-wait, every `STATE_UPDATE` is per-seat
   `projectFor(state, seat)`.
5. **Hidden info top rule**: treasure hand contents NEVER serialized to other seats
   (gameplay.md §11). Projection filters at source; reconnect seeds from `RECONNECT_OK.state` only.

## Game-specific design (from gameplay.md — boarded)

- Seats: MIN 2, MAX 4, DEFAULT 4. Win: hold 4 distinct map corners (state-based check after ANY
  treasure gain, mid-effect included).
- Engine needs: event deck (97: 76 recruit / 13 boarding / 8 raid), treasure deck (41: 20 corners /
  10 curses / 11 talismans), roles Master of Wind + Laggard (rotation left), round = laggard draw →
  reveal 4 → draft clockwise with immediate resolution, bonus system (≥4 individual / ≥8 team at
  resolution), boardings 1v1 & 2v2 (2v2→1v1 at 2–3p), random steal, curses (optional, triggered,
  Master-order for simultaneous), talismans (mandatory on-steal triggers), deck reshuffle rules.
- Interactive sub-flows the engine must model as "awaiting input" states: event pick, boarding
  target/partner designation, tie decision by Master, curse play windows (optional → needs
  pass/decline), Tourbillon discard choice, Kraken recruit choice, talisman choices
  (Singe Doré naming, Contre-Abordage target, Longue-vue target, Coffre Piégé discard).
- Card data: `cards.csv` mentioned as authoritative in gameplay.md but **not present in repo** —
  the tables in gameplay.md §2/§3/§7.3/§8 carry full counts; use them as source of truth.

## Key decisions taken

- Mirror **Pantheons** repo layout 1:1 (it's the ratified port of wog-room.md): `packages/engine`,
  `server`, `client` at repo root; same package.json scripts, same tsconfig.base.json pattern.
- Package scope: `@boarded/engine`, `@boarded/server`, `@boarded/client`. Game name string: `boarded`,
  room type `'game'` (same as refs). Cookie name `boarded_session`, localStorage keys `boarded_resume`.
- No theme/images: plain placeholder UI (text + neutral CSS), keep component structure so art drops
  in later (CardImage-style component with text fallback).
- DB (drizzle/pg): copy the Pantheons approach but make it OPTIONAL at boot (server runs without
  DATABASE_URL for local dev) — mirrors Pantheons' auth/session needs without blocking local play.
  DEV fallback: like Pantheons `.env.example` (check theirs for HANDOFF secret + dev-login path).
- Curse windows: to keep the draft flowing, model optional-curse windows as explicit engine
  interrupts only for seats holding an eligible curse; server auto-passes disconnected seats.

## Status checklist

- [x] Clone + analyze Pantheons & war-of-guilds (wog-room.md read in full)
- [x] Write this progress file, commit
- [x] Read remaining Pantheons impl files (server index/PantheonsRoom/auth, client net/screens)
- [x] Scaffold monorepo (package.json, pnpm-workspace, tsconfig.base, .gitignore, .env.example)
- [x] Engine: types.ts (state model, cards, seats 2–4, Frame interrupt stack, Move union)
- [x] Engine: data.ts (event + treasure decks per gameplay.md tables — counts test-verified)
- [x] Engine: setup.ts (createGame; lobby state lives in the server room, like Pantheons)
- [x] Engine: flow.ts — full interpreter: round flow (laggard draw, reveal, draft, rotation),
      raids+bonus, boardings 1v1/2v2/2v1 + ties + steals, all 5 curses, all 5 talismans,
      win check mid-effect, deck reshuffles, auto-resolution for disconnected seats
- [x] Engine: projection.ts (per-seat filter; curse windows non-attributed to avoid leaks)
- [x] Engine: tests green — 13 tests incl. seeded full-match bots at 2/3/4 players
- [ ] Server: auth (jwt/handoff/session), db, metrics, index.ts
- [ ] Server: room-code, room-registry, BoardedRoom (lobby protocol per wog-room.md)
- [ ] Server: match driver (advance loop, per-seat STATE_UPDATE, reconnect, abort)
- [ ] Server: tests green
- [ ] Client: scaffolding (vite, router, entry/auth, net/room, active-room, resume)
- [ ] Client: LandingScreen (create/join/resume)
- [ ] Client: RoomScreen (acquisition state machine) + RoomLobby
- [ ] Client: GameView (crew display, event draft, boarding flow, treasure hand, curse/talisman
      prompts, end screen) — placeholder styling only
- [ ] Typecheck + build green at root (`pnpm build`, `pnpm typecheck`)
- [ ] Dockerfile + CI (copy Pantheons pattern)
- [ ] Final: update gameplay.md if any observable-behavior deviation (per its own header rule)

## Engine design notes (for whoever continues)

- `state.stack: Frame[]` is an interrupt stack; top frame = active input wait. `advance()`
  (flow.ts) is the interpreter loop: processes automatic frames (`stealExec`, combat math,
  empty windows), auto-resolves disconnected seats, returns on a real input wait.
  `applyMove(state, userId, move, rng)` validates vs top frame + acting seat, mutates, re-advances.
- `actingSeat(state)` (flow.ts) = seat the top frame waits on; used by projection + server.
- Steals go through a `stealExec` frame (one steal per interpreter step) so a stolen talisman
  can interrupt between two steals. `performSteal` → `gainTreasure` (win check) → `fireTalisman`.
- Curse windows: `curseWindow` frame ('reveal' = Tempête/Tourbillon, 'raid' = Bateau Fantôme)
  + kraken/brumeuse steps INSIDE the `boardingResolve` frame. Playing keeps the seat at the
  head of the queue (second copy playable); PASS_CURSE shifts. Brumeuse escape shifts.
- Design decisions taken (beyond gameplay.md, flagged for review):
  - Contre-Abordage counter-boarding skips Kraken/Brumeuse windows (curse-level effect).
  - 2v1 boarding (one defender escaped): 2 winners may both steal from the single loser.
  - Disconnected auto-resolution: pick = first recruit > raid > boarding(auto-target next
    clockwise); Master tie auto = attackers win; optional curse windows auto-pass;
    Singe Doré / Longue-vue skipped when victim disconnected.
  - Pending-frame privacy: non-actors see `{kind:'wait', seat}`; for curse windows seat=null
    (attributing the wait would leak curse ownership).
- `state.reveals` = Longue-vue unicast queue; server drains it; NEVER projected.

## Work log

- **2026-07-10 (session 1)**: Explored refs. Pantheons layout chosen as template. Wrote plan.
- **2026-07-10 (session 1)**: Engine complete + 13 tests green (incl. full-match smoke 2/3/4p).
