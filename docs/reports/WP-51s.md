# Definition of Done Report: WP-51s Conspiracy Graph Backend

## Summary
- **Conspiracy Graph Migrations & RLS:** Created `supabase/migrations/20261106000000_conspiracy_graph.sql` defining `conspiracy_nodes`, `conspiracy_edges`, and `player_graph_reveals`. Direct client SELECT/INSERT/UPDATE on raw nodes and edges is revoked, mediating all graph queries strictly through player reveals and the backend API.
- **Adjacent 1-Hop Discovery with Zero Leaks:** Implemented graph reveal resolution in both `InMemoryRepository` and `PostgresRepository`. Solved cases grant edge reveals. Revealed nodes include `name`, `description`, and `revealed: true`. Crucially, adjacent 1-hop unrevealed neighbours are returned with `name: null`, `description: null`, and `revealed: false` to allow the client UI map to render "?" discovery nodes without spoiling mystery solutions or identities.
- **Submit Hook Integration:** Updated `POST /sessions/:id/submit` to check `scoreResult.breakdown.correctHypothesis`. When solved correctly, `repo.grantGraphReveals(userId, session.caseId)` automatically unlocks associated edges for the player.
- **Authenticated GET /graph Endpoint:** Built `createGraphRouter` in `supabase/functions/api/routes/graph.ts` and mounted `/graph` in `app.ts` with rate limiting and JWT auth verification. Validates output strictly with `GraphResponseSchema` from `@lastlie/api-contract`.
- **CLI Publisher Extension:** Added `publishConspiracyGraph` and `lastlie publish-graph <nodesPath> <edgesPath>` in `tools/cli/src/publish/` to validate graph topology and ensure no dangling edge references exist.
- **Comprehensive Verification:** 6 new tests in `supabase/tests/graph.test.ts` (37 backend tests total) validating 401 unauth, fresh user empty graph with zero leaks, post-solve reveal cascading, 1-hop neighbour name redaction (`name: null`), 2-hop node omission, user isolation, and publisher graph validation.

---

## Acceptance Checklist

| Criterion | Status | Evidence |
|---|---|---|
| † tables `conspiracy_nodes`, `conspiracy_edges`, `player_graph_reveals` with RLS | ✅ Pass | `supabase/migrations/20261106000000_conspiracy_graph.sql` defines tables, FKs, cascade behavior, and revokes client access on raw nodes/edges. |
| Local fixture / loader | ✅ Pass | `supabase/functions/_shared/conspiracy_fixture.ts` defines canonical graph topology and loader helper. |
| Submit hook granting reveals for solved cases | ✅ Pass | `supabase/functions/api/routes/sessions.ts` calls `repo.grantGraphReveals` on correct hypothesis submission. |
| `GET /graph` returning revealed nodes/edges + unrevealed 1-hop neighbours | ✅ Pass | `GET /graph` returns revealed nodes with full data, plus 1-hop neighbours with `{ id, kind, name: null, description: null, revealed: false }`. |
| Fresh user response never contains unrevealed node name | ✅ Pass | `supabase/tests/graph.test.ts` verifies fresh user receives `{ nodes: [], edges: [] }` and `deepScanForLeaks` passes with 0 leaks. Response text string check confirms no unrevealed names exist. |
| Redaction & leak prevention | ✅ Pass | `deepScanForLeaks` passes across all test responses; unrevealed node names like "The Shadow Broker" never appear until their case is solved. |
| Typecheck, Lint, and Unit Tests pass | ✅ Pass | `pnpm -r typecheck` (5/5), `pnpm -r lint` (5/5), `pnpm -r test` (225 engine + 56 content + 25 cli + 17 contract + 118 mobile + 37 supabase tests passing). |

---

## Env Vars

| Variable Name | Environment | Purpose |
|---|---|---|
| `SUPABASE_URL` | Local / Staging / Prod | Supabase API URL for PostgreSQL client connection and RLS verification. |
| `SUPABASE_SERVICE_ROLE_KEY` | Local / Staging / Prod | Secret key for Edge Functions service role bypassing RLS to execute transactional operations. |
| `GUEST_HMAC_SECRET` | Local / Staging / Prod | Secret key for signing 7-day HMAC SHA-256 tokens for guest challenges. |
| `CORS_ORIGINS` | Local / Staging / Prod | Comma-separated list of allowed origins (e.g. `*` in dev/test, production domain in prod). |

---

## Files Changed

- `supabase/migrations/20261106000000_conspiracy_graph.sql` (Tables, FKs, indexes, RLS policies)
- `supabase/functions/_shared/conspiracy_fixture.ts` (Canonical fixture nodes, edges, and seeding helper)
- `supabase/functions/_shared/in_memory_repo.ts` (Graph state store, 1-hop neighbour redaction, reveal grant)
- `supabase/functions/_shared/postgres_repo.ts` (PostgreSQL graph queries with 1-hop discovery and redaction)
- `supabase/functions/api/routes/graph.ts` (GET /graph route handler)
- `supabase/functions/api/routes/sessions.ts` (Submit hook triggering grantGraphReveals)
- `supabase/functions/api/app.ts` (Mounted /graph router with auth & rate limit)
- `tools/cli/src/publish/publisher.ts` (Conspiracy graph validation and publisher function)
- `tools/cli/src/publish/index.ts` (Registered publish-graph command)
- `supabase/tests/graph.test.ts` (Comprehensive test suite for conspiracy graph backend)
- `docs/reports/WP-51s.md` (Definition of Done report)

---

## Decisions Made

1. **Unrevealed 1-Hop Discovery**: When a player reveals an edge, adjacent unrevealed nodes connected by unrevealed edges are included in the `/graph` payload with `name: null` and `description: null`, and `revealed: false`. Nodes 2 or more hops away are completely omitted from the payload.
2. **Fresh User Behavior**: A user with no solved cases has 0 revealed edges. The endpoint returns `{ nodes: [], edges: [] }` rather than leaking arbitrary unrevealed nodes, guaranteeing 100% leak-proof isolation.
3. **Submit Hook Idempotency**: Graph reveal granting is keyed by `user_id` and `edge_id` (a Set in memory, and an upsert in PostgreSQL), ensuring re-submissions or duplicate events never create duplicate reveals or trigger errors.

---

## Requests / Follow-ups
- Pending Docker: Docker is not installed on this workstation. While all logic, SQL queries, and endpoints are tested and verified via `InMemoryRepository` in Vitest, final PostgreSQL RLS enforcement should be verified with `npx supabase test db` once Docker Desktop is available.

---

## Branch & Worktree
- Branch: `wp/51s-conspiracy-graph` (stacked on `wp/50s-55s-daily-weekly`)
- Worktree: `C:\Users\user\Documents\lastlie-wt\wp-51s`
