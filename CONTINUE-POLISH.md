# Boarded / À l'abordage — Multi-Session Deep Polish: Continuation Protocol

You are an expert game UI designer executing a multi-session deep polish of
Boarded / À l'abordage (pirate card game, 2–4 players, ~20 min). Benchmark: a
commercial-quality digital board game adaptation that makes players want to buy
the physical game. The game should feel fast, punchy, and readable. Improve what
exists; build no new features. Work autonomously — no questions. Screenshots at
390px and 1280px viewports only.

## How to locate the current state

1. Read CLAUDE.md, the style bible (v1.2.0), and this file fully.
2. Check whether polish/STATE.md exists.
   - It does NOT exist → nothing has started. Execute SESSION 1 below.
   - It EXISTS → it is the single source of truth. Find the first session whose
     tasks are not all done, then the first incomplete task within it, and resume
     there. Trust STATE.md's checkboxes and progress notes; verify against code
     and polish/screenshots/ if ambiguous. Follow the "What one session does" and
     "Before ending every session" rules below.

## SESSION 1 — Immersion & design dossier (analysis only, no UI changes)

If a playable client exists, start it and use Playwright to traverse landing,
room, and every reachable in-game state — for 2, 3, and 4 player configurations
if possible. Screenshot everything at 390px and 1280px into
polish/screenshots/before/. Read every text element at both viewports and judge
every screen against the game's fast ~20-minute pace.

Then write the design interrogation. Ask and answer hard questions per screen,
guided by "does this help the player enjoy the game?" At minimum: Can a new
player start their first game without external explanation — and if not, can the
UI teach through context (first-play hints, tap/hover card explanations) rather
than a tutorial screen? What deserves permanent screen space in a 4-player game
at 390px — full opponent displays, or compact summaries that expand on demand?
Are the four suit colors (sails #2E5A88, canons #C0432F, sabres #3E7C59, pistols
#6E4A7E) doing real communicative work in the interface beyond the card art —
can a player track suits at a glance? Does the sumi-e-on-parchment identity
extend to the interface chrome, or does generic UI sit awkwardly around
beautiful cards? Is every card's text readable on a phone? Do plays and
reactions have satisfying feedback, or do state changes just happen? Generate
your own questions beyond these — go deep. Log every front-end bug found without
fixing anything.

If no playable client exists yet, pivot: audit the repo instead — asset
organization and naming consistency, component/scaffolding state, pipeline
script robustness (do NOT run the Kaggle generation pipeline) — and answer the
interrogation on paper as ratified design decisions so the eventual build starts
from settled choices. Record clearly in STATE.md which mode applies and reshape
the session plan accordingly.

Create polish/STATE.md as the handoff document. It must contain: how to run the
app and capture screenshots (390px and 1280px only), the full interrogation with
verdicts, the hard limits below, the bug list, and a prioritized plan with
concrete task checklists for:
- S2: layout, hierarchy & opponent panels
- S3: card legibility, text & responsive (enlarge-on-tap inspection if in-place
  size isn't enough)
- S4: style-bible theming, suit colors throughout the UI & play feedback
- S5: contextual onboarding (grounded strictly in the rules documentation; short
  lines, as fast and light as the game itself)
- S6: bug fixes & final review, producing polish/DEEP-POLISH-REPORT.md
STATE.md must let a fresh session resume with zero other context. Commit and push.

## What one session does (S2 onward)

Execute the current session's remaining tasks from STATE.md, following its
ratified verdicts. Iterate: implement, re-run, re-screenshot affected screens at
390px and 1280px into polish/screenshots/sN/ (2, 3, and 4 player configurations
where relevant), judge, refine. Do not stop at the first acceptable version.
Defer anything requiring server or engine changes, with written reasoning in
STATE.md.

## Hard limits — no exceptions

- Illustration masters are immutable: never modify, regenerate, or re-encode
  approved PNGs. Overlay/CSS treatment only.
- Never run the Kaggle art generation pipeline.
- The style bible v1.2.0 governs every visual decision, including the exact four
  suit hex values.
- All tests must pass before pushing.

## Before ending every session — mandatory

1. Update polish/STATE.md: mark tasks done, describe changes and reasoning, log
   findings, adjust remaining plans.
2. Run the full test suite; fix anything broken.
3. Commit and push everything to main.

If interrupted mid-session, the next session reads this file, then STATE.md, and
resumes from the first unchecked task.
