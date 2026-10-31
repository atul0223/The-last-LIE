# THE LAST LIE: Infinite — Threat Model & Security Architecture

> **Document:** `docs/security/threat-model.md`  
> **Status:** RATIFIED & ACTIVE  
> **Review Cadence:** Pre-Beta (WP-48), Major Releases, and Phase Gates  
> **Audience:** Core Engineering, Security Reviewers, Infrastructure Integrator

---

## 1. Executive Summary

"THE LAST LIE: Infinite" is an adversarial logic deduction game where investigative integrity is the core product value. If truth data, culprit identities, or scoring algorithms leak to the client, the game's mystery tension collapses. If player progression or leaderboards are vulnerable to client-side spoofing, competitive seasons become meaningless.

This document formalizes the threat model, detailing protected assets, threat actor profiles, attack surfaces, vulnerabilities analyzed, and verified mitigations.

---

## 2. Protected Assets

| Asset Category | Specific Assets | Confidentiality | Integrity | Availability | Primary Risk |
|---|---|---|---|---|---|
| **Mystery Solutions** | `truth`, `culpritIds`, `hypotheses[].claims`, locked clue texts, decisive evidence mappings | **CRITICAL** | High | Normal | Mystery spoiling; game value destruction |
| **Meta & Story Secrets** | `meta.seed`, conspiracy graph nodes >1 hop away, future daily/weekly cases | **CRITICAL** | High | Normal | Long-term narrative spoiler; unfair advantage |
| **Scoring & Progression** | XP, Detective Rank, solved counts, competitive leaderboards, weekly rankings | Normal | **CRITICAL** | High | Score inflation; leaderboard illegitimacy |
| **Player Tenancy** | In-flight sessions, private evidence boards, personal notes, guest attempts | High | **CRITICAL** | High | Cross-user tampering; IDOR; privacy violation |
| **Authentication & Tokens** | Supabase JWTs, HMAC-SHA256 guest challenge tokens, push notification tokens | **CRITICAL** | **CRITICAL** | High | Account takeover; unauthorized actions |
| **Infrastructure Secrets** | `SUPABASE_SERVICE_ROLE_KEY`, `GUEST_HMAC_SECRET`, cloud database credentials | **CRITICAL** | **CRITICAL** | **CRITICAL** | Full system compromise |

---

## 3. Threat Actor Profiles

1. **Curious Player / Reverse Engineer:**
   - *Motivation:* Wants to peek at the answer when stuck, uncover future cases, or understand game mechanics.
   - *Capabilities:* Inspects network traffic via HTTP proxies (Charles, Proxyman), extracts client bundles, decompiles Android APKs, inspects local MMKV/SQLite caches.
   - *Assumed Posture:* Has full physical control over their mobile device and traffic.

2. **Competitive Cheater:**
   - *Motivation:* Wants high Detective Ranks, leaderboard dominance in weekly community cases, or instant solved cases.
   - *Capabilities:* Modifies HTTP request payloads, replays submit transactions, tampers with client-side clock, calls backend endpoints out-of-order, sends forged local migration payloads.

3. **Content Scraper / Dataminer:**
   - *Motivation:* Wants to harvest all procedural and canonical mystery texts, build external solver bots, or mirror cases.
   - *Capabilities:* Automated scripts, rapid-fire endpoint querying, brute-forcing challenge codes or session IDs.

4. **Malicious Threat Actor:**
   - *Motivation:* Server compromise, denial of service, database defacement, unauthorized access to user accounts.
   - *Capabilities:* SQL injection, path traversal, ReDoS, memory exhaustion via giant payloads, JWT signature spoofing.

---

## 4. Attack Surfaces & Entry Points

```
[Mobile Client / Web Guest View]
              │
              ├── (1) REST API Gateway (Hono Edge Function `api`)
              │         ├── POST /sessions
              │         ├── POST /sessions/:id/unlock
              │         ├── PUT /sessions/:id/board
              │         ├── POST /sessions/:id/submit
              │         ├── POST /challenges
              │         ├── GET /challenges/:code
              │         ├── POST /challenges/:code/guest
              │         ├── GET /challenges/:code/compare
              │         ├── POST /challenges/:code/attach
              │         ├── GET /daily
              │         ├── GET /weekly & GET /weekly/:id/aggregate
              │         ├── GET /graph
              │         ├── POST /account/migrate-local & DELETE /account
              │         └── POST /push/token
              │
              ├── (2) Cryptographic Tokens
              │         ├── Supabase JWTs
              │         └── 7-Day HMAC-SHA256 Guest Challenge Tokens
              │
              ├── (3) Deep Links & Custom Schemes
              │         ├── thelastlie://challenge/:code
              │         └── https://lastlie.app/c/:code
              │
[Authoring & Publishing CLI]
              │
              └── (4) CLI Case & Graph Publish Pipeline
                        ├── lastlie publish <glob> --env <env>
                        └── lastlie publish-graph <nodes> <edges>
```

---

## 5. Security Mitigations & Architectural Controls

### 5.1 Zero-Leakage Architecture (§3.6 & §12)
- **Authoritative Redaction:** Private case definitions (`case_private`) are stored exclusively in backend storage or local encrypted store during offline development. All client-bound payloads pass through `toPublicCase(def, unlockedIds)`.
- **Field Whitelisting:** Hypotheses in public responses expose only `{ id, label }`. The `claims` array and `culpritIds` are stripped.
- **Locked Clue Shielding:** Clues with `locked: true` have their `text` and `asserts` properties completely removed.
- **DeepScan Verification:** Automated regression tests (`deepScanForLeaks`) parse every API response and reject any payload containing forbidden strings (`truth`, `culpritIds`, `seed`, `asserts`, `keyEvidence`, `liars`, `conspiracyHooks`).
- **Graph Redaction (1-Hop Shielding):** In `GET /graph`, newly discovered neighbouring nodes 1 hop away are delivered with `name: null` and `description: null`, allowing the client map to render mysterious "?" nodes without leaking identities or roles. Nodes 2 or more hops away are omitted entirely.

### 5.2 Tenancy & IDOR Defense
- **Compound Primary Lookups:** Operations on sessions strictly query `(sessionId, userId)`. User A referencing User B's session receives a 404/403, preventing cross-tenant observation.
- **Database Row-Level Security (RLS):** Policies in Postgres enforce tenancy even if an application bug bypasses route constraints. Direct writes from client roles (`anon`, `authenticated`) on sensitive tables (`case_results`, `player_progress`, `player_unlocks`) are strictly revoked.

### 5.3 Anti-Cheat & Scoring Integrity
- **Authoritative Server Scoring:** Scoring is computed entirely by the case engine on the server using `scoreSubmission(def, session, submission)`. The mobile client never computes or transmits a score.
- **Concurrency & Idempotency:** The database stored procedure `submit_case_session` uses `FOR UPDATE` row locking. Duplicate or concurrent submit calls return the identical original score without duplicate XP.
- **Timing Sanity Check:** Sessions submitted under 15 seconds from `startedAt` are permanently tagged with `tooFast: true` and excluded from competitive rankings.
- **Local Progress Migration Anti-Cheat:** Prototype local solves uploaded via `POST /account/migrate-local` grant archive replay unlocks only. The server awards **zero retroactive XP**, preventing players from injecting fabricated local scores.

### 5.4 Token Cryptography & Challenge Abuse
- **HMAC-SHA256 Signatures:** Guest challenge tokens encode `{ challengeId, caseId, guestId, exp, iat }` signed with `GUEST_HMAC_SECRET`. Any modification to the payload or signature causes immediate rejection.
- **Comparison Gate:** `GET /challenges/:code/compare` requires the caller to have completed an attempt, preventing non-participants from viewing solution consensus.

### 5.5 Input Validation & System Hardening
- **Strict Zod Schemas:** Every endpoint uses Zod `.strict()` schemas. Unexpected or extra fields are rejected with 400 `BAD_REQUEST`.
- **Payload Size Limits:** `bodyLimit` middleware limits request payloads (e.g. 64KB in production, 4KB in strict tests), precluding memory exhaustion attacks.
- **IP Rate Limiting:** Rate limit middleware throttles automated traffic, preventing brute-force enumeration.
- **CLI Path Sandboxing:** The publishing CLI uses `assertSafePath` to verify file paths, preventing directory traversal attacks.

---

## 6. Pre-Beta Security Checklist (WP-48 Audit Status)

- [x] Solution & clue leakage audited across all route responses.
- [x] IDOR defense verified for sessions, boards, submits, and account actions.
- [x] Idempotent submit and concurrency race conditions tested with `Promise.all`.
- [x] Anti-cheat local migration verified to award zero retroactive XP.
- [x] HMAC guest token expiration and signature forgery verified.
- [x] Comparison secrecy gate verified (403 prior to submit).
- [x] Request body limits and rate limiting verified.
- [x] Conspiracy graph 1-hop redaction verified.
- [x] Path traversal protections verified in CLI publisher.
- [ ] Physical PostgreSQL pgTAP RLS test execution (Pending Docker Desktop).
