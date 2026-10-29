# AGENTS.md — Standing rules for every coding agent

Read this file at the start of every task. These rules apply on top of every prompt in `PROMPTS.md`.
**Several agents work on this repo at the same time.** The "Parallel work protocol" below is mandatory.

## Read first
1. `WORKBOARD.md`: your lane, your WP, its wave, and who owns which files right now.
2. `SYSTEM_DESIGN.md`: the architecture and contract source of truth.
3. `PLAN.md`: your WP's section (Owns, Deliver, Accept).

---

## Parallel work protocol (MANDATORY)

### 1. Work only in your own worktree
- Each agent works in its **own git worktree** on its **own branch**. Never use the main checkout (`C:\Users\user\Documents\The last LIE`) and never touch another agent's worktree.
- Worktree location: `C:\Users\user\Documents\lastlie-wt\wp-<ID>`. Branch: `wp/<ID>-<slug>`, created from the current `main`.
- Create it yourself as step 0, unless your prompt says it already exists:

      git -C "C:\Users\user\Documents\The last LIE" fetch --all --prune   (skip if no remote)
      git -C "C:\Users\user\Documents\The last LIE" worktree add "C:\Users\user\Documents\lastlie-wt\wp-<ID>" -b wp/<ID>-<slug> main
      cd "C:\Users\user\Documents\lastlie-wt\wp-<ID>" && pnpm install --frozen-lockfile

  If `git` reports `index.lock` or "already exists", wait a few seconds and retry once. If the branch already exists, **stop and report it**. Someone else may be on it.

### 2. Never destroy or rewrite other work
You must NOT:
- run `git reset --hard`, `git checkout -- <path>`, `git restore`, `git clean`, `git stash`, `git rebase` (on anything but your own branch), `git push --force`, `git branch -D`, or `git worktree remove` on anything you didn't create;
- delete, rename, move, or reformat a file you did not create in this WP;
- run repo-wide fixers: `prettier --write .`, `eslint --fix` outside your Owns paths, or `pnpm -r format`;
- update or regenerate snapshots, fixtures, or generated files owned by another WP;
- "fix" a failing test or a type error in code outside your Owns paths. **Report it instead.**

If your work seems to need any of these, stop and list it under **Requests**.

### 3. File ownership
- You may create or edit only the files under your WP's **Owns** paths (see `WORKBOARD.md` → Ownership map).
- **Hot files** are shared by everyone. Treat them as follows:

| Hot file | Rule |
|---|---|
| `SYSTEM_DESIGN.md`, `PLAN.md`, `AGENTS.md`, `PROMPTS.md`, `WORKBOARD.md` | **Read-only.** Write proposed changes to `docs/proposals/WP-<ID>.md`. The integrator applies them. |
| `packages/case-engine/src/schema/**`, `packages/api-contract/**` | **Frozen during a wave.** Contract changes run as a separate, solo "contract" task between waves. If you need one, stop and request it. |
| Package `index.ts` barrels (e.g. `packages/case-engine/src/index.ts`) | **Append-only.** Add your single `export * from './<your-module>/index.js';` line at the end. Don't reorder or remove lines. |
| `package.json` (root or any package) and `pnpm-lock.yaml` | You may **add** a dependency only to the package you own, using `pnpm --filter <pkg> add <dep>`. Never upgrade or remove existing deps. Commit the lockfile change in its **own commit** named `[WP-<ID>] deps: add <dep>`. |
| `apps/mobile/app/**` (routes, layouts), `apps/mobile/src/services/index.ts`, `apps/mobile/src/theme/**` | Owned by the WP named in WORKBOARD. Other UI agents must not edit them. Fill your **slot** file instead (see WP-10). |
| `.github/**`, root configs (`tsconfig*`, `eslint.config.mjs`, `vitest*`) | Integrator only. |

### 4. Stay testable in isolation
- Your tests must not depend on unmerged work from another lane. If you need something another WP will build, code against the existing interface or contract and use a local fake inside your own folder.
- Use your own ports so dev servers don't collide: Expo `--port 80<ID>` (e.g. WP-12 → 8012). Only **one** agent at a time may run local Supabase (the backend lane).

### 5. Finish cleanly
- Commit everything on your branch (`git status` must be clean), with commits prefixed `[WP-<ID>]`.
- **Do not merge into `main`, do not push, and do not remove your worktree.** The integrator does all three.
- Before finishing, check you haven't touched files outside your scope:

      git diff --name-only main...HEAD

  Every path printed must be in your Owns list, an append-only barrel line, or your own lockfile commit.

---

## Hard rules (all work)
- **Contracts:** shared types live in `packages/case-engine/src/schema` and `packages/api-contract`. Change them only in a contract task.
- **Determinism:** engine code (`packages/case-engine`) must not use `Math.random`, `Date.now`, `new Date()` without arguments, network calls, `fs`, React, Node APIs, or Deno APIs. Pass RNG and time in as arguments.
- **No answer leaks:** the client must never receive `truth`, `hypotheses[].claims`, `culpritIds`, `meta.seed`, clue `asserts`, `keyEvidence`, `liars`, `conspiracyHooks`, internal clue tags (e.g. `red_herring`), the text of locked clues, or the real ids of locked clues. See SYSTEM_DESIGN §3.6. Any change touching redaction, RLS, services, or API responses must add or update a leak test.
- **Server is authoritative:** scoring and progression are computed by the engine on the server (or inside the service layer while offline). The UI never computes a score.
- **Secrets:** never commit keys. Use `.env.local` (gitignored) and keep `.env.example` up to date.
- **Types:** TypeScript strict. No `any` and no `@ts-ignore` unless a comment explains why.
- **Tests:** new logic comes with tests. `packages/case-engine` needs ≥90% line coverage. Read the real fixture or case file before writing expected values. Never guess ids or point totals.
- **Mobile testIDs:** use `<feature>.<element>[.<id>]` (e.g. `case.evidence.card.clue_keycard_exit`, `case.theory.submit`), so the E2E lane needs no edits in your files.

## Definition of done
Run these inside your worktree and paste the results:

    pnpm -r typecheck
    pnpm -r lint
    pnpm -r test
    git diff --name-only main...HEAD

Then report:
1. **Summary:** 3–6 bullets.
2. **Acceptance checklist:** each WP criterion, marked ✅ with evidence or ❌ with the reason.
3. **Files changed** (from the diff above). Confirm all are in scope.
4. **Decisions made** that the docs didn't cover.
5. **Requests:** changes needed outside your scope, plus any doc proposals file you wrote.
6. **Risks / follow-ups.**
7. **Branch + worktree path**, for the integrator.
