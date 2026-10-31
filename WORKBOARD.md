# WORKBOARD.md — Lanes, waves, ownership, status

> **Maintained only by the integrator (you, or the INT agent).** Agents read it and never edit it.
> Last updated: 2026-10-31

---

## 1. Lanes (task categories that can run in parallel)

A **lane** is a category of work with its own folder. Agents in different lanes never edit the same files.
Inside a lane, several agents can still run at once **if** their WPs own different sub-folders (marked ⚡).

| Lane                | Code  | Owns (root folders)                                                                                                   | WPs                                                                                                 | Parallel inside lane?                       |
| ------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Engine**          | `E`   | `packages/case-engine/src/<module>/**` (one module per WP) + its tests `packages/case-engine/tests/<module>*.test.ts` | WP-22 progression, WP-30 rng/render, WP-31 generator core, WP-32/33/34 templates, WP-36 fingerprint | ⚡ yes, one module per agent                |
| **Content**         | `C`   | `packages/content/cases/**`, `packages/content/pools/**`, `docs/cases/**`, `docs/story/**`                            | WP-20a/b/c (one case each), WP-53                                                                   | ⚡ yes, one case file per agent             |
| **Mobile services** | `MS`  | `apps/mobile/src/services/**`, `apps/mobile/src/store/**`, `apps/mobile/app/**` (routes/layouts)                      | WP-10, WP-21, later WP-43                                                                           | ❌ one agent at a time                      |
| **Mobile UI**       | `MU`  | `apps/mobile/src/features/<feature>/**` (one feature folder per WP)                                                   | WP-11, 12, 13, 23, 24, later 44, 52                                                                 | ⚡ yes, one feature folder per agent        |
| **Tooling & QA**    | `T`   | `tools/cli/src/<command>/**`, `apps/mobile/e2e/**`                                                                    | WP-35a/b, WP-14, WP-37                                                                              | ⚡ yes, one command folder or E2E per agent |
| **Backend**         | `B`   | `supabase/**`                                                                                                         | WP-40, 41, 42, 45, 50, 51                                                                           | ❌ one agent at a time (shared local DB)    |
| **Docs**            | `D`   | `docs/playtest/**`, `docs/security/**`, `docs/proposals/**`                                                           | WP-25, audits                                                                                       | ⚡ yes                                      |
| **Review**          | `R`   | read-only; may add tests only under `**/tests/review/**`                                                              | R1, R3, R6                                                                                          | ⚡ yes, any time                            |
| **Integrator**      | `INT` | hot files, merges, `.github/**`, root configs, `WORKBOARD.md`                                                         | merges, contract tasks, deps                                                                        | ❌ exactly one                              |

**Rule of thumb:** at most **one agent per lane** for MS, B, and INT. For the ⚡ lanes, agents can share a lane as long as their folders differ.
Recommended total: **4–6 agents at once**. More than that and merge work outgrows the time saved.

---

## 2. Waves (what can run together, starting from WP-10)

Team: 3 agents. Agent 1 = integrator (main folder), Agents 2 and 3 = builders reusing new worktrees.
Backend: hybrid (Option C), decided 2026-10-29. B0 not needed.

### Final Build Batch — Ownership & Active Queues (Team of 3)

#### Ownership Map (Final Build Batch)
- **Agent 1 (Integrator, `main` repo):**
  - `packages/content/**` (authored cases, generated pack, canonical cases, conspiracy graph)
  - `docs/**`
  - `.github/**`
  - Root configs (`package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, etc.)
  - `.env.example`
  - Hot docs (`SYSTEM_DESIGN.md`, `PLAN.md`, `WORKBOARD.md`, etc.)
- **Agent 2 (Backend, `lastlie-wt/wp-*`):**
  - `supabase/**` (migrations, seed, config, functions/api, _shared)
  - `packages/api-contract/**`
  - `tools/cli/src/publish/**`
- **Agent 3 (Mobile & Templates, `lastlie-wt/wp-*`):**
  - `apps/mobile/**`
  - `packages/case-engine/src/generator/templates/**` (for WP-32c variety)
  - *Note: `packages/case-engine/**` outside templates is frozen (changes only through request to Agent 1).*

#### Active Agent Queues
- **Agent 2 (Backend Queue):**
  - [x] WP-41a (API contract & Hono route schemas) — MERGED
  - [x] WP-41 (Functions core: sessions, unlock, board, daily) — MERGED
  - [x] WP-42 (Submit + publish transactions, idempotent scoring) — MERGED
  - → WP-45s (Challenge server routes & guest tokens)
  - → WP-44s (Auth server hooks & profile sync)
  - → WP-50s / WP-55s (Daily case rotation & weekly competitive case server support)
  - → WP-51s (Conspiracy graph server endpoints & player graph state)
- **Agent 3 (Mobile Queue):**
  - [x] WP-32c (Template variety & fingerprint collision fix) — MERGED
  - → WP-43 (RemoteGameService + feature flag + query sync)
  - → WP-44 (Auth & profile UI screens)
  - → WP-45 (Challenge creation, share cards, and compare UI)
  - → WP-50 / WP-55 UI (Daily & weekly challenge screens)
  - → WP-52 (Conspiracy graph map canvas UI)
  - → WP-54 (Push notifications & reminders)
- **Agent 1 (Integrator Queue):**
  - Continuous merge loop: R1 verify + INT-MERGE incoming READY branches
  - (a) WP-53a Conspiracy content model (schemas, loader, validation tests)
  - (b) WP-53 Canonical chapter 1 (story doc, 3 canonical cases, 15-25 conspiracy nodes/edges, R6 reviews)
  - (c) After WP-32c: delete + regenerate generated pack, validate, leak scan, repetition report, R6 review, gate-p3.md to GO
  - (d) Keep .env.example complete after every merge
  - (e) After 41, 42, 45s: R3 API security audit -> docs/security/audit-p4a.md
  - (f) Final wrap-up: WP-48 full security review, R4 gates (P4, P5), docs/setup/HUMAN-SETUP.md, docs/reports/FINAL-STATUS.md

A wave starts only after the previous wave is **merged to `main`** and `main` is green.

### Wave 0 — Stabilize (sequential, INT only) ⛔ do this first

| Order | Task                                                                                                                             | Prompt             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 0.1   | Commit WP-07 (mobile shell is built but **uncommitted** in the main checkout), then run R1 on it                                 | INT-0              |
| 0.2   | Merge the stack WP-01…WP-07 into `main` (fast-forward), push, set GitHub default branch to `main`                                | INT-0              |
| 0.3   | Housekeeping: `.gitattributes` + line-ending renormalize, CI on `wp/**`. **Alone**, because it touches every file. Then merge it | NEXT-3 → INT-MERGE |
| 0.4   | Contract task: optional message sender + case_0001 fix + V11 text rule                                                           | NEXT-2             |
| 0.5   | Merge 0.4 to `main`. R4 phase gate for P0                                                                                        | INT-1, R4          |

### Wave 1 — 6 agents in parallel

| Agent | Lane | WP                                                 | Branch / worktree     | Owns                                                                                                                                                                                           |
| ----- | ---- | -------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | MS   | **WP-10** LocalGameService + **case-screen slots** | `wp/10-local-service` | `apps/mobile/src/services/local/**`, `apps/mobile/src/services/index.ts`, `apps/mobile/src/store/**`, `apps/mobile/app/case/**`, `apps/mobile/src/features/case/*/index.tsx` (slot stubs only) |
| A2    | E    | **WP-22** Progression engine                       | `wp/22-progression`   | `packages/case-engine/src/progression/**`, `tests/progression*.test.ts`                                                                                                                        |
| A3    | E    | **WP-30** RNG + renderer                           | `wp/30-rng-render`    | `packages/case-engine/src/rng.ts`, `src/render/**`, `tests/rng*.test.ts`, `tests/render*.test.ts`                                                                                              |
| Agent 2 | C    | **WP-20a** case_0002 (missing_item, d1)            | `wp/20a-case-0002`    | `packages/content/cases/authored/case_0002.json`, `docs/cases/case_0002-walkthrough.md`                                                                                                        |
| Agent 2 | C    | **WP-20b** case_0003 (hidden_identity, d2)         | `wp/20b-case-0003`    | `case_0003.json`, `docs/cases/case_0003-walkthrough.md`                                                                                                                                        |
| Agent 2 | T    | **WP-35a** CLI: validate / render / playtest       | `wp/35a-cli-core`     | `tools/cli/src/**` (except `generate/`, `publish/`, `report/`, `paraphrase/`)                                                                                                                  |
| (opt) | C    | **WP-20c** case_0004 (forged_message, d3)          | `wp/20c-case-0004`    | `case_0004.json`, walkthrough                                                                                                                                                                  |
| (opt) | D    | **WP-25** Playtest kit                             | `wp/25-playtest-kit`  | `docs/playtest/**`                                                                                                                                                                             |

**Wave 1 notes**
- Content agents (Agent 2, opt 20c) also own `packages/content/tests/<case>.test.ts`. They must NOT edit `packages/content/src/index.ts`. INT registers each case during merge.
- A1 (WP-10) also owns `apps/mobile/src/features/case/slots.ts` and `docs/proposals/WP-10.md`, and may edit the three tab screens only to render the home/library/progress slots.
- A1 should commit **Part A (slots)** first. INT may merge Part A early, so Wave 2 UI agents can start sooner.
- A2 and A3 both append one line to `packages/case-engine/src/index.ts`. That conflict is expected and trivial: INT keeps both lines.

### Wave 2 — after Wave 1 is merged

| Agent | Lane | WP                                                  | Owns                                                                                       |
| ----- | ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| B1    | MU   | **WP-11** Briefing & Evidence                       | `apps/mobile/src/features/case/briefing/**`, `.../evidence/**`, `.../components/ClueCard*` |
| B2    | MU   | **WP-12** Evidence board                            | `apps/mobile/src/features/case/board/**`                                                   |
| B3    | MU   | **WP-13** Theory & Reveal                           | `apps/mobile/src/features/case/theory/**`, `.../reveal/**`                                 |
| B4    | MS   | **WP-21** Local persistence                         | `apps/mobile/src/services/local/storage/**`, `apps/mobile/src/store/persist*`              |
| B5    | E    | **WP-31** Template framework                        | `packages/case-engine/src/generator/core/**`, `packages/content/pools/**`                  |
| (opt) | B    | **WP-40** DB schema + RLS (only if backend decided) | `supabase/**`                                                                              |

### Wave 3 — after Wave 2 is merged

| Agent | Lane | WP                                | Owns                                                        |
| ----- | ---- | --------------------------------- | ----------------------------------------------------------- |
| C1    | T    | **WP-14** Prototype E2E           | `apps/mobile/e2e/**` (uses testIDs, edits no feature files) |
| C2    | MU   | **WP-23** Progress tab            | `apps/mobile/src/features/progress/**`                      |
| C3    | MU   | **WP-24** Home & library          | `apps/mobile/src/features/home/**`, `.../library/**`        |
| C4    | E    | **WP-32** template false_alibi    | `src/generator/templates/false_alibi*`                      |
| C5    | E    | **WP-33** template missing_item   | `src/generator/templates/missing_item*`                     |
| C6    | E    | **WP-34** template forged_message | `src/generator/templates/forged_message*`                   |
| (opt) | T    | **WP-35b** CLI: generate          | `tools/cli/src/generate/**`                                 |

After Wave 3: R3 security audits (P1 + P2), R4 gates, then real playtesting. Then Wave 4 (WP-36, WP-37, Backend lane P4).

---

## 3. Ownership map — mobile app slots (created by WP-10)

WP-10 creates the case screen and **one placeholder file per feature**. Wave 2 agents replace only the inside of their own slot. The route file never changes again.

```
apps/mobile/app/case/[sessionId].tsx          ← WP-10 (owns; imports the slots below)
apps/mobile/src/features/case/briefing/index.tsx   ← slot → WP-11
apps/mobile/src/features/case/evidence/index.tsx   ← slot → WP-11
apps/mobile/src/features/case/board/index.tsx      ← slot → WP-12
apps/mobile/src/features/case/theory/index.tsx     ← slot → WP-13
apps/mobile/src/features/case/reveal/index.tsx     ← slot → WP-13
apps/mobile/src/features/progress/index.tsx        ← slot → WP-23 (tab screen imports it)
apps/mobile/src/features/home/index.tsx            ← slot → WP-24
apps/mobile/src/features/library/index.tsx         ← slot → WP-24
```

Each slot exports a component with a **fixed props type**, defined in `apps/mobile/src/features/case/slots.ts` (owned by WP-10, frozen after Wave 1):

```ts
export interface CaseSlotProps {
  sessionId: string;
  // all data via hooks from apps/mobile/src/store (useCaseSession, useGameService)
}
```

---

## 4. Live status

| WP      | Lane | Agent | Branch                     | State                                                 |
| ------- | ---- | ----- | -------------------------- | ----------------------------------------------------- |
| 01–07   | —    | INT   | `main`                     | ✅ committed & merged to main                         |
| 10      | MS   | A1    | `wp/10-local-service`      | ✅ merged (slot/hook contract FROZEN)                 |
| 22      | E    | A2    | `wp/22-progression`        | ✅ merged                                             |
| 30      | E    | A2    | `wp/30-rng-render`         | ✅ merged                                             |
| 20a     | C    | Agent 2| `wp/20a-case-0002`         | ✅ merged (authored case_0002)                        |
| 05b     | E    | Agent 2| `wp/05b-validator-fairplay`| ✅ merged (V14/V15 validator checks)                  |
| 11      | MU   | Agent 3| `wp/11-briefing-evidence`  | ✅ merged                                             |
| 12      | MU   | Agent 3| `wp/12-evidence-board`     | ✅ merged                                             |
| 13      | MU   | Agent 3| `wp/13-theory-reveal`       | ✅ merged                                             |
| 14      | T    | A1    | `main`                     | ✅ merged (Maestro flows, case_solve & fail)          |
| 21      | MS   | Agent 3| `wp/21-local-persistence`  | ✅ merged (MMKV, migrations, quarantine)             |
| 20b     | C    | Agent 2| `wp/20b-case-0003`         | ✅ merged (authored case_0003)                        |
| 20c     | C    | Agent 2| `wp/20c-case-0004`         | ✅ merged (authored case_0004)                        |
| 31      | E    | Agent 2| `wp/31-template-framework` | ✅ merged (generator core, pools, toy template)       |
| 24      | MU   | Agent 3| `wp/24-home-library`       | ✅ merged (home hero CTA, library catalog, filters)   |
| 23      | MU   | Agent 3| `wp/23-progress-tab`       | ✅ merged (rank card, archive, replay, dossiers)      |
| 25      | D    | A1    | `main`                     | ✅ merged (playtest kit, survey, rubrics, guide)      |
| 32      | E    | Agent 2| `wp/32-template-false-alibi`| ✅ merged (false_alibi procedural template)           |
| 33      | E    | Agent 2| `wp/33-template-missing-item`| ✅ merged (missing_item procedural template)         |
| 34      | E    | Agent 2| `wp/34-template-forged-message`| ✅ merged (forged_message procedural template)        |
| 26      | MU   | Agent 3| `wp/26-generated-library`  | ✅ merged (generated cases in library & service)     |
| 35a     | T    | Agent 3| `wp/35a-cli-core`          | ✅ merged (CLI validate, render, playtest)           |
| 35b     | T    | Agent 3| `wp/35b-cli-generate`      | ✅ merged (CLI generate command)                     |
| 32b     | E    | Agent 2| `wp/32b-template-neutrality`| ✅ merged (neutrality fix + V16)                     |
| 36      | E    | Agent 3| `wp/36-fingerprint-calibration` | ✅ merged (fingerprint dedupe & calibration)         |
| 40      | B    | Agent 2| `wp/40-db-schema`           | ✅ merged (DB schema, RLS, triggers, seed)          |
| 41a     | B    | Agent 2| `wp/41a-api-contract`       | ✅ merged (strict Zod API schemas)                  |
| 41      | B    | Agent 2| `wp/41-api-core`            | ✅ merged (Hono API core, middlewares, leak test)   |
| 32c     | E    | Agent 3| `wp/32c-template-variety`   | ✅ merged (variety, hidden_identity, <=14% coll)    |
| 42      | B    | Agent 2| `wp/42-submit-publish`      | ✅ merged (submit idempotency, publisher CLI)       |
| 46      | T/MU | Agent 3| `wp/46-analytics`           | ✅ merged (PostHog & Sentry monitoring)              |
| NEXT-2  | INT  | A1    | `main`                     | ✅ done (optional message sender)                     |
| NEXT-3  | INT  | A1    | `main`                     | ✅ done (.gitattributes, .gitignore, CI scope step)   |

> **Wave 2 notice:** The mobile slot and hook contract defined in WP-10 (`useCaseSession`, `CaseSlotProps`, subview slot mapping) is **FROZEN** for Wave 2 UI agents.
> **Resolved:** WP-30 proposal (wire `renderClue` into V11 text render check) implemented and merged to `main`.

States: ⬜ todo · 🔵 in progress · 🟡 done, awaiting review · 🟢 verified (R1 PASS) · ✅ merged · 🔴 blocked
