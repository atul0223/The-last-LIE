# AGENTS.md — Standing rules for every coding agent

Read this file at the start of every task. These rules apply on top of every prompt in `PROMPTS.md`.

## Read first
1. `SYSTEM_DESIGN.md` is the architecture and contract source of truth.
2. `PLAN.md` lists the work packages (WPs), what each one owns, and its acceptance criteria.
3. The WP section named in your prompt.

## Hard rules
- **Scope:** only edit paths listed under your WP's *Owns*. If something outside them needs changing, stop and list it under "Requests" in your final report. Don't edit it.
- **Contracts:** shared types live in `packages/case-engine/src/schema` and `packages/api-contract`. If you change one, update `SYSTEM_DESIGN.md` and every consumer in the same change.
- **Determinism:** engine code (`packages/case-engine`) must not use `Math.random`, `Date.now`, `new Date()` without arguments, network calls, `fs`, React, Node APIs, or Deno APIs. Pass RNG and time in as arguments.
- **No answer leaks:** the client must never receive `truth`, `hypotheses[].claims`, `culpritIds`, `meta.seed`, clue `asserts`, `keyEvidence`, `liars`, `conspiracyHooks`, internal clue tags (e.g. `red_herring`), the text of locked clues, or the real ids of locked clues. See SYSTEM_DESIGN §3.6. Any change that touches redaction, RLS, or API responses must add or update a leak test.
- **Server is authoritative:** scoring and progression are computed on the server. The client never sends a score.
- **Secrets:** never commit keys. Use `.env.local` (gitignored) and keep `.env.example` up to date. The service-role key is only allowed in server code and CLI publish code.
- **Types:** TypeScript strict. No `any` and no `@ts-ignore` unless a comment explains why.
- **Tests:** new logic comes with tests. `packages/case-engine` needs ≥90% line coverage.

## Definition of done
Run these and paste the results into your final report:

    pnpm -r typecheck
    pnpm -r lint
    pnpm -r test

Then report:
1. **Summary:** what you built, in 3–6 bullets.
2. **Acceptance checklist:** each WP criterion, marked ✅ with the evidence (test name or command output) or ❌ with the reason.
3. **Files changed.**
4. **Decisions made:** anything not covered by the docs, and why.
5. **Requests:** changes needed outside your scope.
6. **Risks / follow-ups.**

## Git
- Branch: `wp/<id>-<slug>`, created **from up-to-date `main`** (not from another WP branch, unless the prompt says to stack). Commit prefix: `[WP-<id>]`.
- Before you finish, confirm the working tree is clean (`git status`). Every change must be committed on your WP branch.
- Tests must be correct about the data they use. Read the real fixture or case file before writing expected values. Never guess ids or point totals.
- Don't push, merge, or force anything unless the prompt says so.
