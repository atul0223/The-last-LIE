# THE LAST LIE: Infinite — Build Plan for Agents

> Read [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) first. This file breaks the build into **phases** and **work packages (WPs)** that agents can pick up on their own.
> **Parallel mode:** when `WORKBOARD.md` lists different **Owns** paths or splits a WP (e.g. WP-20a/b/c, WP-35a/b), WORKBOARD wins.
> Each WP lists what it depends on, the paths it owns, what it delivers, and how we know it's done.

---

## 0. Rules for every agent

1. **Claim one WP at a time.** Only touch files under that WP's **Owns** paths. If you need something changed outside them, write it under *Requests* at the bottom of your PR description. Don't make the edit yourself.
2. **Contracts first.** If two WPs share a type, it lives in `packages/case-engine/src/schema` or `packages/api-contract`. To change a shared contract you must also update `SYSTEM_DESIGN.md` and every consumer in the same PR, or get approval in a contract-change WP.
3. **Definition of done** applies to every WP:
   - `pnpm -r typecheck`, `pnpm -r lint`, and `pnpm -r test` all pass.
   - New logic has unit tests. Engine code has ≥90% coverage.
   - No `any` and no `@ts-ignore` unless a comment says why.
   - Every acceptance criterion in the WP is met and listed in the PR as a checklist.
   - If the design changed, `SYSTEM_DESIGN.md` is updated.
4. **Never put solutions on the client in remote mode.** Any PR that touches redaction, RLS, or Edge Function responses must include or update a test proving there's no leak.
5. **Keep it deterministic.** Engine code can't use `Math.random`, `Date.now`, network calls, or platform APIs. Pass time and RNG in.
6. **Small PRs.** If a WP grows past roughly 800 changed lines (not counting JSON content), split it.
7. **Branch and commit names:** branch `wp/<id>-<slug>`, commits start with `[WP-<id>]`.

---

## Phase overview

| Phase | Goal | Exit criteria |
|---|---|---|
| **P0 Foundation** | Repo, engine schema, logic core, first real case | `validateCase(case_0001)` returns no errors, and a human can solve it on paper |
| **P1 Playable prototype** | One case playable end-to-end on device, offline | Open → inspect → link → theory → submit → reveal → next case |
| **P2 Content & progression (local)** | 4+ authored cases, archive, rank, local persistence | 10 playtesters complete ≥2 cases. Feedback collected |
| **P3 Procedural engine** | Templates + generator + CLI, 5–10 validated generated cases per template | 1,000 seeds/template pass the validator. Repetition review done |
| **P4 Backend & social loop** | Server-authoritative play, accounts, challenge links, analytics | Private beta runs on `RemoteGameService`. Redaction/RLS tests green |
| **P5 Living city** | Daily case, conspiracy graph, weekly community case, notifications | Limited public launch |
| **P6+ Expansion** | Interviews, timeline puzzles, teams, UGC, monetization | Driven by metrics |

Dependency graph. Work packages in the same column can run in parallel.

```
P0:  WP-01 ─┬─ WP-02 ─┬─ WP-03 ─┬─ WP-05
            │         │         └─ WP-06
            │         └─ WP-04 (content, needs schema only)
            └─ WP-07 (mobile shell)
P1:  WP-10 (LocalGameService) ── WP-11 Briefing/Evidence ─┐
                                 WP-12 Board ─────────────┼─ WP-14 E2E
                                 WP-13 Theory/Reveal ─────┘
P2:  WP-20 content ×3 │ WP-21 persistence │ WP-22 progression engine → WP-23 progress UI │ WP-24 library UI │ WP-25 playtest kit
P3:  WP-30 rng+render → WP-31 template framework → WP-32..34 templates │ WP-35 CLI │ WP-36 dedupe/difficulty calibration
P4:  WP-40 schema/RLS → WP-41 functions core → WP-42 submit/scoring → WP-43 RemoteGameService → WP-44 auth
     WP-45 challenges+web │ WP-46 analytics/Sentry │ WP-47 CI/CD │ WP-48 security tests
P5:  WP-50 daily │ WP-51 conspiracy graph │ WP-52 conspiracy map UI │ WP-53 canonical chapter 1 │ WP-54 push │ WP-55 weekly case
```

---

## P0 — Foundation

### WP-01 Monorepo scaffold
- **Depends:** —
- **Owns:** root config, `packages/*/package.json`, `tsconfig*.json`, `.eslintrc*`, `.prettierrc`, `vitest.workspace.ts`, `.github/workflows/ci.yml`
- **Deliver:** A pnpm workspace with empty packages `case-engine`, `content`, `api-contract`, and `tools/cli`. Strict TS base config, Vitest, ESLint/Prettier, and a CI workflow that runs typecheck/lint/test. `.gitignore`, `.nvmrc` (Node 20), and a README with the commands.
- **Accept:** `pnpm i && pnpm -r typecheck && pnpm -r test` passes on a clean clone. CI goes green with a placeholder test in each package.
- **Note:** Run `git init` inside `The last LIE/` so the project gets its own repo. The parent home directory is currently a git root, and this project must not use it.

### WP-02 Engine schema & types
- **Depends:** WP-01
- **Owns:** `packages/case-engine/src/schema/**`
- **Deliver:** Zod schemas and inferred types for `Fact` (all kinds in §3.2), `Clue`, `Hypothesis`, `GroundTruth`, `RevealBeat`, `Character`, `Location`, `GameObject`, `CaseDefinition`, `CasePublic`, `PublicClue`, `Submission`, `ScoreResult`, `Reveal`, `SessionState`, `BoardState`, `ConspiracyHook`, plus a `Time` helper (`"23:47" ↔ 1427`).
- **Accept:** Round-trip tests (parse → serialize → parse). Invalid fixtures are rejected with readable paths. Every type is exported from the package index.

### WP-03 Logic core: contradictions & evaluation
- **Depends:** WP-02
- **Owns:** `packages/case-engine/src/logic/**`
- **Deliver:** `contradicts(a, b, ctx)` covering every rule in SYSTEM_DESIGN §4.1, including `presence.travel`. Also `buildContext(def)`, `evaluateHypothesis(h, clues, ctx) → {eliminated, by[]}`, and `survivingHypotheses(def, clueIds)`.
- **Accept:** Every rule has at least one positive and one negative test. Symmetry gets a property test. Boundary tests cover interval edges (touching intervals don't count as overlapping).

### WP-04 First authored case `case_0001`
- **Depends:** WP-02 (schema only, so this can run alongside WP-03)
- **Owns:** `packages/content/cases/authored/case_0001.json`, `docs/content-style-guide.md`
- **Deliver:** A complete false-alibi / forged-message case that expands the concept's "The Missing Message" example:
  - Characters: Maya (left at 23:40, she says), Arjun (says he got a message at 23:47), Rhea (disputes the timeline), plus one red-herring character.
  - Truth: Arjun used Maya's unlocked phone at 23:47 to send himself a message and build an alibi. The device log shows the phone unlocked at 23:47 while Maya's keycard exit was logged at 23:41.
  - 6–9 clues: ≥3 default, ≥2 unlockable, ≥1 red herring. 3 hypotheses. Each `keyEvidence` set has 2 clues. Reveal beats cite clues.
  - A style guide covering tone, clue-writing rules, and naming conventions for Vesper City.
- **Accept:** `validateCase` passes once WP-05 lands (it's fine to finish against WP-05). Two people who didn't write the case can each solve it on paper in under 6 minutes and explain why the answer is right.

### WP-05 Validator
- **Depends:** WP-03
- **Owns:** `packages/case-engine/src/validator/**`
- **Deliver:** `validateCase(def) → ValidationReport` with checks V1–V13 and the difficulty metric (weights in a config object), plus a pretty-printer for reports.
- **Accept:** Each check has a broken fixture that triggers it and a clean fixture that doesn't. `case_0001` validates clean.

### WP-06 Redaction & scoring
- **Depends:** WP-03
- **Owns:** `packages/case-engine/src/redact/**`, `packages/case-engine/src/scoring/**`
- **Deliver:** `toPublicCase(def, unlockedIds)`, `canUnlock(def, session, clueId, via)`, `buildReveal(def, result)`, and `scoreSubmission(def, session, submission)` following §7.2.
- **Accept:** Leak test: deep-scan the output for forbidden keys and locked clue text. Scoring table tests cover correct, wrong, partial evidence, bad links, and requested clues.

### WP-07 Mobile shell
- **Depends:** WP-01
- **Owns:** `apps/mobile/**` (shell only: navigation, theme, empty screens)
- **Deliver:** An Expo + Expo Router app with the 5 tabs (§9.3), a dark noir theme with tokens (colors, spacing, typography, monospace), placeholder screens, a working web target, and the `GameService` interface stub with a fake implementation.
- **Accept:** Runs on an iOS simulator or Android emulator and on `expo start --web`. Typecheck and lint pass.

---

## P1 — Playable prototype (offline)

### WP-10 LocalGameService
- **Depends:** WP-05, WP-06, WP-07
- **Owns:** `apps/mobile/src/services/local/**`, `apps/mobile/src/services/index.ts`
- **Deliver:** A `GameService` built on bundled `packages/content` cases and the engine. Session state lives in Zustand. Includes the dev badge (§9.2).
- **Accept:** Unit tests drive a full session (start → unlock → submit) against `case_0001`.

### WP-11 Case screen: Briefing & Evidence
- **Depends:** WP-10
- **Owns:** `apps/mobile/src/features/case/briefing/**`, `.../evidence/**`, `.../components/ClueCard*`
- **Deliver:** A briefing view, a clue list with type filters, unread markers, clue detail (logs rendered in monospace), and the unlock flow ("Request evidence" shows its cost).
- **Accept:** Works with large text sizes. Every clue type renders. Component tests pass.

### WP-12 Evidence board
- **Depends:** WP-10
- **Owns:** `apps/mobile/src/features/case/board/**`
- **Deliver:** A pannable/zoomable canvas with draggable clue cards and link creation by drag or by select A → select B → "Link". Links can be deleted. Board state persists in the session.
- **Accept:** 60fps on a mid-range Android with 12 cards. The accessible link flow works with a screen reader. State survives an app restart (once WP-21 lands).

### WP-13 Theory & Reveal
- **Depends:** WP-10
- **Owns:** `apps/mobile/src/features/case/theory/**`, `.../reveal/**`
- **Deliver:** Hypothesis picker, supporting-clue selector (max 3), a confirm dialog, the submit call, and a reveal timeline with clue citations. Shows the score breakdown, ✓/✗ (icon + color) on each link, and a "Next case" CTA.
- **Accept:** Nothing from the solution appears before submit. Reveal beats can be tapped to open the cited clue.

### WP-14 Prototype E2E
- **Depends:** WP-11, WP-12, WP-13
- **Owns:** `apps/mobile/e2e/**`
- **Deliver:** A Maestro flow for the full loop on `case_0001`.
- **Accept:** Green in CI (or a documented manual run if CI devices aren't available yet). **This WP closes P1.**

---

## P2 — Content & progression (still local)

| WP | Depends | Owns | Deliver | Accept |
|---|---|---|---|---|
| **WP-20** Authored cases 0002–0004 | WP-05 | `packages/content/cases/authored/*` | One each of missing_item, hidden_identity, and forged_message, with difficulty 1, 2, and 3 | Validator-clean. Each one solved on paper by a non-author |
| **WP-21** Local persistence | WP-10 | `apps/mobile/src/services/local/storage*` | MMKV-backed sessions, results, and progress. Migration versioning | Kill the app mid-case and it resumes. Corrupt storage resets gracefully |
| **WP-22** Progression engine | WP-06 | `packages/case-engine/src/progression/**` | `applyResult(progress, result, config)` → XP, rank, mastery gates (§7.3). Default config JSON | Grinding difficulty-1 cases can't pass Investigator. Table tests |
| **WP-23** Progress tab | WP-22, WP-21 | `apps/mobile/src/features/progress/**` | Rank card, mastery requirements, archive list with replay (×0.25 XP), character dossiers | Replay reuses the case and shows the previous theory next to the new one |
| **WP-24** Home & library | WP-21 | `apps/mobile/src/features/home/**`, `.../library/**` | Home with one primary CTA and a continue card. Library with difficulty/type filters | The CTA picks the next unplayed case at the player's level |
| **WP-25** Playtest kit | WP-14 | `docs/playtest/**` | Script, observation sheet, post-session survey, and an internal build guide (EAS preview) | Doc reviewed. Used with 10 testers. Findings written up in `docs/playtest/results-p2.md` |

**P2 exit gate (human):** Look at the results from WP-25. Fix the top three usability problems before starting P3 content work. Engine work for P3 can start in parallel.

---

## P3 — Procedural engine

| WP | Depends | Owns | Deliver | Accept |
|---|---|---|---|---|
| **WP-30** RNG + renderer | WP-02 | `case-engine/src/rng.ts`, `src/render/**` | Seeded PRNG with `pick`/`shuffle`/`int`. Fact → sentence renderers for every fact kind and clue type, with variants chosen by rng | Same seed gives the same output. Every fact kind renders. Snapshot tests |
| **WP-31** Template framework | WP-05, WP-30 | `src/generator/core/**`, `packages/content/pools/**` | `CaseTemplate` interface, slot filling, decoy-hypothesis builder (perturb one claim), lie injector, red-herring injector, `generateCase()` retry loop (§5.2) | Ships with a toy template that generates validator-clean cases |
| **WP-32** Template: false_alibi | WP-31 | `src/generator/templates/false_alibi*` | Template covering difficulty 1–4 | fast-check: 1,000 seeds, 0 validator errors. Ten samples reviewed by a human |
| **WP-33** Template: missing_item | WP-31 | `.../missing_item*` | Same as WP-32 | Same as WP-32 |
| **WP-34** Template: forged_message | WP-31 | `.../forged_message*` | Same as WP-32 | Same as WP-32 |
| **WP-35** Authoring CLI | WP-31 | `tools/cli/**` | `lastlie validate <glob>`, `generate --template --count --difficulty --seed`, `render <case>` (readable markdown for review), `playtest <case>` (terminal play), and a `publish` stub (real version in WP-42) | Each command has `--help` and an integration test. `validate` runs in CI on content |
| **WP-36** Fingerprint & difficulty calibration | WP-32..34, WP-25 data | `src/generator/fingerprint*`, `validator/difficulty*` | Fingerprint function, repetition report (`lastlie report --repetition`), and difficulty weights tuned against playtest times | Report shows <10% fingerprint collisions in a 50-case sample per template |
| **WP-37** (optional) LLM paraphrase pass | WP-35 | `tools/cli/src/paraphrase/**` | An offline `paraphrase` command (Claude API, model id from config) that rewrites rendered text only, followed by the V11 + proper-noun/time guard | Guard rejects an injected wrong time in tests. Never imported by app or functions |

**P3 exit:** 5–10 published-quality generated cases per template, mixed into the local library, plus a second round of 10 playtesters on the mixed set.

---

## P4 — Backend & social loop

| WP | Depends | Owns | Deliver | Accept |
|---|---|---|---|---|
| **WP-40** DB schema + RLS | WP-02 | `supabase/migrations/**`, `supabase/seed.sql`, `supabase/tests/**` | Core tables and RLS from §8.1 (non-† tables) | pgTAP: anon/auth can't read `case_private` or write sessions/results/progress. Own-row reads work |
| **WP-41** Functions core | WP-40, api-contract | `supabase/functions/_shared/**`, `packages/api-contract/**`, `start-session`, `unlock-clue`, `save-board`, `get-daily` | Shared auth/validation/error/rate-limit middleware. Engine imported into Deno (via npm specifier or build step; document which) | Integration tests against local Supabase. Responses pass the leak scan |
| **WP-42** Submit + publish | WP-41, WP-22 | `supabase/functions/submit/**`, `tools/cli/src/publish/**` | `submit` (idempotent, scoring + progression transactionally) and the real `lastlie publish` (service-role upsert of `cases` + `case_private`) | Double submit returns the same result. A publish with validation errors is refused |
| **WP-43** RemoteGameService | WP-41, WP-42 | `apps/mobile/src/services/remote/**` | `GameService` over the functions with TanStack Query, offline queue for `save-board`, feature flag | The E2E from WP-14 passes in remote mode. Production builds can't select local |
| **WP-44** Auth & profiles | WP-40 | `apps/mobile/src/features/auth/**`, `.../profile/**` | Anonymous sign-in by default, upgrade to email/Apple/Google, profile edit, migrate local progress on first sign-in | Anonymous → upgraded account keeps progress |
| **WP-45** Challenges + web | WP-43 | † challenge migrations, `create-challenge`, `challenge-compare`, `apps/mobile/src/features/challenges/**`, `app/c/[code].tsx` | Share link, guest web play with guest token, spoiler-free result card, compare view, referral attribution | Guest finishes in a browser without an account. Compare is hidden until the viewer submits. Link → install → result attaches to the account |
| **WP-46** Analytics & monitoring | WP-43 | `apps/mobile/src/lib/analytics*`, `sentry*` | PostHog events (§11) behind a wrapper with consent, plus Sentry for app and functions | Events visible in a dev project. No PII in event props |
| **WP-47** CI/CD | WP-41 | `.github/workflows/**`, `eas.json` | CI: content validation, function tests with Supabase CLI, EAS preview builds on main, migration deploy on tag | Pipeline docs in README |
| **WP-48** Security review | WP-42, WP-45 | `docs/security-review-p4.md`, tests anywhere (read-only elsewhere) | Threat-model checklist: leaks, IDOR on sessions, rate limits, guest-token forgery, replay scoring | Every finding is fixed or ticketed. **Required before beta** |

**P4 exit:** Private beta (~50 players) on remote mode. Dashboards for the §11 funnels.

---

## P5 — Living city

| WP | Depends | Deliver | Accept |
|---|---|---|---|
| **WP-50** Daily case | P4 | Scheduler (cron function) fills `daily_cases` from a curated pool, plus a Home card and daily streak display (no punishment for missing a day) | Same case for everyone on a UTC date. Unpublished until that date |
| **WP-51** Conspiracy graph backend | P4 | † tables, publish of `packages/content/conspiracy`, reveal on submit, `conspiracyHooks` → lead unlocks | V12 enforced at publish. Edge only revealed after solving its case |
| **WP-52** Conspiracy map UI | WP-51 | Progress → Map: nodes/edges the player has unlocked, tap for dossier | Readable with 50+ nodes. No unrevealed node names leak |
| **WP-53** Canonical chapter 1 | WP-51 | 3–5 authored canonical cases introducing The Quiet, plus graph content | Validator-clean. Story review by a human |
| **WP-54** Push notifications | P4 | Opt-in daily-case reminder (Expo Notifications → FCM/APNs) | Off by default. Easy to opt out |
| **WP-55** Weekly community case | WP-50 | Weekly case, aggregate theory reveal after the window, simple leaderboard (first attempt only) | Aggregate stays hidden until the window closes |

---

## P6+ — Expansion backlog (unscheduled, metric-driven)

- Interviews (question trees that unlock testimony clues)
- Timeline reconstruction mini-game
- Team investigations (shared board, shared theory)
- Player-made cases built from approved templates, going through the validator, community rating, and moderation queue before they can be featured
- Competitive seasons
- Monetization (only after D7 retention is proven): premium story packs, cosmetics, membership. **Never sell solutions or hints that affect competitive play.**

---

## Appendix A — Suggested agent assignment (P0–P1)

| Agent | WPs, in order |
|---|---|
| Engine agent | WP-01 → WP-02 → WP-03 → WP-05 → WP-06 |
| Content agent | (after WP-02) WP-04 → WP-20 |
| Mobile agent A | (after WP-01) WP-07 → WP-10 → WP-11 → WP-13 |
| Mobile agent B | WP-12 → WP-14 |
| Reviewer (human or agent) | Reviews every PR against §0 rules plus the leak and determinism rules |

## Appendix B — Open questions (decide before the listed WP)

| Question | Decide by |
|---|---|
| App name/bundle ids, domain for challenge links | WP-07 / WP-45 |
| How the engine gets imported into Deno edge functions (npm specifier vs. bundled build) | WP-41 |
| Hint mode (`check-link`) on in normal play? | WP-12 |
| Difficulty scale shown to players (1–5 stars vs. named tiers) | WP-24 |
| Guest-token lifetime & merge policy | WP-45 |
