# WP-45s Report — Challenges Backend & Guest Play

> **Lane:** Backend  
> **Worktree:** `C:\Users\user\Documents\lastlie-wt\wp-45s`  
> **Branch:** `wp/45s-challenges-backend` (stacked on `wp/42-submit-publish`)  
> **Status:** READY  

---

## 1. Summary

- Authored migration `supabase/migrations/20261103000000_challenges.sql` adding the † tables `challenges`, `challenge_attempts`, and `referrals` with strict RLS policies, indexing, and direct write revocations from client roles.
- Implemented challenge route suite in `supabase/functions/api/routes/challenges.ts`:
  - `POST /challenges`: Validates creator session submission, generates an 8-character unambiguous short code (`[2-9A-HJ-NP-Z]`), share link, and 7-day expiration timestamp.
  - `GET /challenges/:code`: Public endpoint returning challenge metadata and sanitized `CasePublic` presentation.
  - `POST /challenges/:code/guest`: Signs an HMAC-SHA256 guest token bound to the challenge and case, with 7-day lifetime.
  - `GET /challenges/:code/compare`: Enforces submitter requirement (denied with 403 `SUBMISSION_REQUIRED` prior to completion), returning anonymous hypothesis distributions and clue citations without leaking PII.
  - `POST /challenges/:code/attach`: Attaches guest attempt to an authenticated account on sign-in (idempotent, returns 409 `ALREADY_ATTACHED` on duplicate).
- Validated all security boundaries in `supabase/tests/challenges.test.ts` (expired challenges, forged HMAC tokens, compare access gates, leak checks).

---

## 2. Acceptance Checklist

- [x] **Database migration**: `challenges`, `challenge_attempts`, `referrals` created with RLS enabled.
- [x] **Direct client write revocation**: `REVOKE ALL ON TABLE ... FROM anon, authenticated` enforced on attempts and referrals.
- [x] **Creator submit check**: Creating a challenge requires an active session in status `submitted`; rejects unsubmitted sessions with 400 `SUBMISSION_REQUIRED`.
- [x] **Unambiguous short codes**: 8-character codes drawn from `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (excludes confusing `0`/`O`, `1`/`I`/`l`).
- [x] **HMAC signed guest token**: Cryptographically signed using `GUEST_HMAC_SECRET` from environment; verified against forgery and expiration.
- [x] **Comparison access gating**: Only callers who submitted an attempt (or the creator) can view aggregate comparisons; denied with 403 otherwise.
- [x] **Zero PII in compare**: Aggregates only (`hypothesisDistribution`, `mostUsedClues`), no personal display names or IDs exposed.
- [x] **Account attachment on sign-in**: Guest result binds to authenticated user account once; duplicate attempts return 409 `ALREADY_ATTACHED`.
- [x] **DeepScan leak protection**: Zero leaks across all endpoints.
- [x] **Tests pass without Docker**: 21/21 backend tests passing in Vitest.

---

## 3. Env Vars

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `GUEST_HMAC_SECRET` | Secret key for signing and verifying challenge guest tokens | `dev_guest_secret_key` | Yes (in production) |

---

## 4. Files Changed

```text
supabase/migrations/20261103000000_challenges.sql
supabase/functions/_shared/guest_token.ts
supabase/functions/api/routes/challenges.ts
supabase/functions/api/app.ts
supabase/tests/challenges.test.ts
docs/reports/WP-45s.md
```

---

## 5. Self-Review (R1 Checklist)

1. **Scope:** Only touched `supabase/**` and `docs/reports/WP-45s.md`.
2. **Criteria:** Challenge creation, public get, guest token issuance, compare gate, and guest account attachment.
3. **Determinism:** Tests run with injected clock and deterministic fixtures.
4. **Leak Guard:** DeepScan passes cleanly. Zero character/hypothesis spoiler fields.
5. **Types:** TypeScript strict, zero `any`, zero `@ts-ignore`.
