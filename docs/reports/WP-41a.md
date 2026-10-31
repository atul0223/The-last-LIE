# WP-41a Report — API Contract for All Routes

> **Lane:** Backend / Contracts  
> **Worktree:** `C:\Users\user\Documents\lastlie-wt\wp-41a`  
> **Branch:** `wp/41a-api-contract`  
> **Status:** READY  
> **Version:** `@lastlie/api-contract@0.2.0`  

---

## 1. Summary

- Defined complete, strict Zod schemas and TypeScript types for all 14 API endpoints across sessions, daily, weekly, challenges, account migration, conspiracy graph, and push notifications.
- Defined uniform error envelope `{ error: { code, message, requestId? } }` with strict `ApiErrorCode` union.
- Integrated canonical `@lastlie/case-engine` public schemas (`CasePublic`, `PublicClue`, `ScoreResult`, `Reveal`, `PlayerProgress`, `SessionState`, `BoardState`).
- Exported fully typed `ApiClient` client interface for Agent 3 (mobile) to implement and mock against.
- Verified strictness (unknown fields rejected on all inputs and outputs) and round-trip parsing across 17 Vitest tests.

---

## 2. Acceptance Checklist

- [x] **POST /sessions**: `CreateSessionRequestSchema` + `CreateSessionResponseSchema` (strict).
- [x] **POST /sessions/:id/unlock**: `UnlockClueRequestSchema` + `UnlockClueResponseSchema` (placeholder id mapping compatible).
- [x] **PUT /sessions/:id/board**: `SaveBoardRequestSchema` + `SaveBoardResponseSchema`.
- [x] **POST /sessions/:id/submit**: `SubmitSessionRequestSchema` + `SubmitSessionResponseSchema` with `result`, `reveal`, `progress`, `tooFast`.
- [x] **GET /daily**: `DailyCaseResponseSchema` with date and case public payload.
- [x] **GET /weekly**: `WeeklyCaseResponseSchema` with week number, open/close bounds, and case public payload.
- [x] **GET /weekly/:id/aggregate**: `WeeklyAggregateResponseSchema` with participant count, hypothesis distribution, clue usage, and leaderboard.
- [x] **POST /challenges**: `CreateChallengeRequestSchema` + `CreateChallengeResponseSchema`.
- [x] **GET /challenges/:code**: `GetChallengeResponseSchema` with case public payload and expiration.
- [x] **POST /challenges/:code/guest**: `CreateGuestTokenRequestSchema` + `CreateGuestTokenResponseSchema`.
- [x] **GET /challenges/:code/compare**: `ChallengeCompareResponseSchema` with hypothesis distributions and clue usage aggregates.
- [x] **POST /account/migrate-local**: `MigrateLocalRequestSchema` + `MigrateLocalResponseSchema` (grants archive unlocks only, no XP).
- [x] **DELETE /account**: `DeleteAccountResponseSchema`.
- [x] **GET /graph**: `GraphResponseSchema` with revealed nodes/edges and unrevealed neighbours with `name: null`.
- [x] **POST /push/token**: `RegisterPushTokenRequestSchema` + `RegisterPushTokenResponseSchema`.
- [x] **Error envelope**: `{ error: { code, message, requestId } }` with typed error code union.
- [x] **Typed ApiClient**: `ApiClient` interface in `src/client.ts`.
- [x] **No answer leaks**: All response schemas strictly use public projections (`CasePublic`, `PublicClue`, etc.) and prohibit private fields (`truth`, `claims`, `culpritIds`, `asserts`, `keyEvidence`, `liars`, `meta.seed`, `conspiracyHooks`).
- [x] **Tests pass**: 17 tests in `packages/api-contract/tests/` verifying round-trip and strictness.

---

## 3. Env Vars

| Variable | Description | Default / Required |
|---|---|---|
| *None* | `@lastlie/api-contract` is a pure isomorphic TypeScript/Zod package with zero runtime environment variables. | N/A |

---

## 4. Contract Freeze Notice for Agent 3 (Mobile)

All endpoint payloads and client methods in `@lastlie/api-contract` are now frozen. Subsequent modifications during backend implementation will be **additive only** and prefixed with `[WP-<ID>] contract:`.

---

## 5. Files Changed

```text
packages/api-contract/package.json
packages/api-contract/src/account.ts
packages/api-contract/src/challenges.ts
packages/api-contract/src/client.ts
packages/api-contract/src/daily.ts
packages/api-contract/src/error.ts
packages/api-contract/src/graph.ts
packages/api-contract/src/index.ts
packages/api-contract/src/push.ts
packages/api-contract/src/sessions.ts
packages/api-contract/src/weekly.ts
packages/api-contract/tests/contract.test.ts
packages/api-contract/tests/index.test.ts
pnpm-lock.yaml
docs/reports/WP-41a.md
```

---

## 6. Self-Review (R1 Checklist)

1. **Scope:** Only touched `packages/api-contract/**`, `docs/reports/WP-41a.md`, and added workspace dependency `@lastlie/case-engine` and `zod` to `packages/api-contract/package.json`.
2. **Criteria:** All 14 API routes have typed requests, responses, and errors.
3. **Determinism:** Pure schemas and interfaces.
4. **Leak Guard:** Strict allowlist with engine public models; no private keys.
5. **Types:** TypeScript strict, zero `any`, zero `@ts-ignore`.
