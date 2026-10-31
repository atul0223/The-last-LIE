# WP-44s Report — Account Routes & Local Migration

> **Lane:** Backend  
> **Worktree:** `C:\Users\user\Documents\lastlie-wt\wp-44s`  
> **Branch:** `wp/44s-account-routes` (stacked on `wp/45s-challenges-backend`)  
> **Status:** READY  

---

## 1. Summary

- Authored migration `supabase/migrations/20261104000000_push_tokens.sql` introducing `push_tokens` table with strict Row Level Security (own rows only; direct anonymous writes revoked).
- Implemented `POST /account/migrate-local`:
  - Validates `MigrateLocalRequestSchema` (`solvedCaseIds`, `localResults`).
  - **Anti-Cheat Architecture:** The server does not retroactively rescore or grant XP for local prototype play; it grants archive access in `player_unlocks` (`kind = 'archive'`) so players can replay and view dossiers without compromising competitive leaderboards.
- Implemented `DELETE /account`:
  - Permanently purges user account records across `case_sessions`, `case_results`, `player_progress`, `player_unlocks`, and `push_tokens`.
- Implemented `POST /push/token`:
  - Registers Expo push notification tokens scoped to the authenticated caller.
- Tested and verified in `supabase/tests/account.test.ts`.

---

## 2. Acceptance Checklist

- [x] **POST /account/migrate-local**:
  - Validates solved case IDs and local result timestamps.
  - Grants `archive` unlocks in `player_unlocks`.
  - Enforces anti-cheat: grants ZERO retroactive XP.
- [x] **DELETE /account**:
  - Permanently deletes all rows associated with `userId`.
  - Verified by integration tests: subsequent reads return 404 / null.
- [x] **POST /push/token**:
  - Own rows only enforced by authentication middleware.
  - Rejects unauthenticated requests with 401 `UNAUTHORIZED`.
- [x] **Migration & RLS**: Created `supabase/migrations/20261104000000_push_tokens.sql` with strict user-scoped policies.
- [x] **DeepScan leak protection**: Zero leaks across all account and push endpoints.
- [x] **Tests pass without Docker**: 26/26 backend tests pass in Vitest.

---

## 3. Env Vars

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| *None* | Uses existing Supabase environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). | N/A | No new env vars |

---

## 4. Anti-Cheat Documentation

During early prototypes (Phases 1–3), gameplay operates locally via `LocalGameService`, where truth data is bundled on-device. When players connect online and upgrade their account, `POST /account/migrate-local` migrates their completed cases into the remote archive. To prevent score tampering or leaderboard inflation, the server treats local submissions as unverified: no XP is awarded, and rank mastery gates cannot be satisfied via local migration. Players can freely replay their migrated cases in remote mode.

---

## 5. Files Changed

```text
supabase/migrations/20261104000000_push_tokens.sql
supabase/functions/api/routes/account.ts
supabase/functions/api/app.ts
supabase/tests/account.test.ts
docs/reports/WP-44s.md
```

---

## 6. Self-Review (R1 Checklist)

1. **Scope:** Only touched `supabase/**` and `docs/reports/WP-44s.md`.
2. **Criteria:** Migration without XP, account deletion, push token registration.
3. **Determinism:** Tests run with injected repository and deterministic assertions.
4. **Leak Guard:** DeepScan passes cleanly.
5. **Types:** TypeScript strict, zero `any`, zero `@ts-ignore`.
