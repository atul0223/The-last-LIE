# PROMPTS.md — Agent prompts (parallel mode)

Several agents work at once, each in its **own git worktree** and lane.
- **`WORKBOARD.md`** says which WPs run together (waves), who owns which files, and live status.
- **`AGENTS.md`** holds the rules every agent follows, including the parallel work protocol.
- This file holds the prompts to paste.

---

## How parallel work runs

```
             ┌── Agent A1 (worktree wp-10) ──┐
main ──▶ WAVE├── Agent A2 (worktree wp-22) ──┤──▶ R1 verify each ──▶ INT merges one by one ──▶ main (green) ──▶ next WAVE
             ├── Agent A3 (worktree wp-30) ──┤
             └── ...                          ┘
```

1. **INT** (you, or one integrator agent) prepares the wave. `main` must be green, and WORKBOARD must be updated.
2. Open **one terminal or session per agent**. Paste **P-START** with that agent's WP filled in, then the WP prompt under it.
3. When an agent finishes, open a **new** session and paste **R1** for that WP (reviewers can run in parallel too).
4. Paste **R2** into the builder's session for any findings. Repeat until R1 says PASS.
5. **INT** merges PASSed branches into `main` one at a time, with **INT-MERGE**.
6. When the whole wave is merged, start the next wave. At the end of a phase, run R3 (security) and R4 (gate).

**Golden rules:**
- One WP = one agent = one worktree = one branch.
- Agents never merge, push, or touch other worktrees.
- Contract changes (schema, api-contract, design docs) only happen **between** waves, run by INT alone.

---

# Parallel-mode prompts

### P-START — Put this ABOVE every WP prompt

```text
You are agent <A1> working in lane <MS|E|C|MU|T|B|D> on WP-<ID>, in parallel with other agents.
Main repo: C:\Users\user\Documents\The last LIE
Your worktree: C:\Users\user\Documents\lastlie-wt\wp-<ID>   Your branch: wp/<ID>-<slug>

Before anything else:
1. Read AGENTS.md (especially "Parallel work protocol"), then WORKBOARD.md (find your row and its Owns paths), then your WP in PLAN.md.
2. Create your worktree from main exactly as AGENTS.md §1 shows, then cd into it. Do ALL work there. Never run commands in the main repo folder except `git worktree add`.
3. Restate your Owns paths in one line. Those, plus an append-only barrel line and your own deps commit, are the ONLY files you may create or change.
4. Other agents are editing other folders right now. Never delete, revert, reformat, or "fix" anything outside your Owns paths. If something outside them is broken or missing, put it under Requests and continue with a local fake.
5. At the end: commit everything, run the Definition of done (including `git diff --name-only main...HEAD`), and report. Do NOT merge, push, or remove the worktree.

Your task:
```
*(paste the WP prompt from below here)*

---

### INT-0 — Stabilize: commit WP-07 and merge the stack (run ALONE, in the main repo)

```text
You are the integrator. You are the ONLY agent running right now. Work in C:\Users\user\Documents\The last LIE.
Read AGENTS.md and WORKBOARD.md.

1. You are on branch wp/07-mobile-shell, and apps/ plus a pnpm-lock.yaml change are uncommitted. These are the finished WP-07 work. Review `git status` and `git diff`. Make sure nothing secret or generated (node_modules, .expo, dist, coverage) is staged. Commit as "[WP-07] Mobile shell". Don't change source code.
   The updated docs (AGENTS.md, PROMPTS.md, and the new WORKBOARD.md) are also uncommitted. Commit them separately as "docs: parallel work protocol, workboard, prompts".
   For any OTHER modified file (e.g. packages/case-engine/tests/redact.test.ts): if `git diff -w --ignore-blank-lines` shows only formatting, commit it as "chore: format". If it has real code changes, STOP and ask the user. Never discard it.
2. Run pnpm install --frozen-lockfile, then pnpm -r typecheck, pnpm -r lint, and pnpm -r test. Paste the results. If anything fails, STOP and report it. Don't fix it.
3. Fast-forward main to wp/07-mobile-shell (git checkout main && git merge --ff-only wp/07-mobile-shell). The branches are a linear stack 01→07, so this must be a pure fast-forward. If it isn't, STOP and report.
4. Show the commands the user should run to push main and set it as the GitHub default branch (`git push -u origin main`, then GitHub → Settings → Default branch). Don't run them unless the user said to push.
5. Create the folder C:\Users\user\Documents\lastlie-wt (for worktrees).
6. In WORKBOARD.md §4 (you own it), mark 01–07 as ✅ merged.
Report what you did.
```

### NEXT-2 — Contract task: optional message sender + case_0001 + text rule (run ALONE, after NEXT-3 is merged into main)

```text
Follow AGENTS.md. This is a CONTRACT task. No other agents are running, so the hot-file restrictions don't apply to your Owns list below.
Create worktree C:\Users\user\Documents\lastlie-wt\wp-06b on branch wp/06b-message-sender from main.
Owns: packages/case-engine/src/schema/fact.ts, src/logic/contradicts.ts (message rules only), src/validator/checks/v11_text_render.ts, packages/content/cases/authored/case_0001.json, docs/cases/case_0001-walkthrough.md, and the matching tests.
Read SYSTEM_DESIGN.md §3.2 and §3.6.

1. Make `sender` optional on the message Fact. Update message.sender_device: it fires only when the message HAS a sender and a device_use on the same device at the same time shows a different person. Add tests for the sender-less case (no contradiction).
2. Fix case_0001 so physical evidence doesn't hand over the answer:
   - clue_message_carrier: remove `sender` (a carrier record only knows the device).
   - clue_arjun_testimony: add a message fact {msg_2347, sender: char_maya, device: obj_phone_maya, recipient: char_arjun, sentAt: 1427}, which is his lie. Make sure truth.liars still covers it and V5 passes.
   - Now arjun_testimony ↔ device_log is a valid contradiction (message.sender_device), alongside arjun_testimony ↔ keycard_exit (presence.two_places).
   - Re-check all 3 hypotheses, V7, and V8. Update the walkthrough.
3. V11 text rule: a clue's text must not mention a character name that isn't its `source` or in its asserts. Every HH:MM in the text must appear in its asserts. Add a broken-fixture test for each rule.
4. Run the full suite. Fix test expectations in scoring/redact tests that changed because of the new valid link (allowed in this contract task). Commit. Finish with the Definition of done report.
```

### NEXT-3 — Housekeeping (run ALONE, right after INT-0 and BEFORE NEXT-2. It renormalizes line endings in every file, so anything running alongside it would conflict)

```text
Follow AGENTS.md. Integrator-lane task. Worktree C:\Users\user\Documents\lastlie-wt\wp-00 on branch wp/00-housekeeping from main.
Owns: .gitattributes, .gitignore, .github/workflows/ci.yml.
1. Add .gitattributes: `* text=auto eol=lf`, plus binary rules for png/jpg/jpeg/gif/webp/ttf/otf/mp3/mp4. Renormalize (git add --renormalize .) in a separate commit, only for line endings.
2. Check .gitignore covers node_modules, coverage/, dist/, .expo/, web-build/, .env*, !.env.example, *.log.
3. CI must run on push to main and wp/**, and on pull requests. Add a job step that runs `git diff --name-only origin/main...HEAD` and prints it (for scope review).
Commit. Don't push. Finish with the Definition of done report.
```

### INT-1 — Merge Wave 0 and prep Wave 1

```text
You are the integrator, running alone in C:\Users\user\Documents\The last LIE. Read AGENTS.md and WORKBOARD.md.
Merge wp/06b-message-sender into main using the INT-MERGE steps (wp/00-housekeeping should already be merged; if not, merge it first). Then run R4-style checks for P0 (all tests green, content validator clean).
Update WORKBOARD.md §4: Wave 0 ✅, Wave 1 rows ⬜ ready.
Report: GO or NO-GO for Wave 1.
```

### INT-MERGE — Merge one finished branch (integrator only, ONE branch at a time)

```text
You are the integrator. Work in the main repo C:\Users\user\Documents\The last LIE. No other agent may merge right now.
Merge branch <wp/ID-slug> (R1 verdict: PASS) into main:

1. git checkout main. Make sure the working tree is clean. If it isn't, STOP.
2. Scope check: git diff --name-only main...<branch>. Compare every path with the WP's Owns in WORKBOARD.md. Allowed extras: one appended export line in a barrel, package.json/pnpm-lock.yaml in a "[WP-<ID>] deps:" commit, docs/proposals/WP-<ID>.md. Anything else → STOP and report (send it back with R2).
3. git merge --no-ff <branch> -m "Merge WP-<ID>: <title>".
4. Conflicts:
   - Barrel index.ts → keep BOTH export lines.
   - pnpm-lock.yaml → take main's version (`git checkout --ours pnpm-lock.yaml`, since you are on main), finish resolving package.json, then run `pnpm install` to regenerate it, and `git add pnpm-lock.yaml`.
   - package.json dependency lists → keep the union of both sides.
   - ANY other conflict → git merge --abort and STOP. Report the files. A human or the WP agent must decide.
5. pnpm install --frozen-lockfile (or pnpm install if the lockfile was regenerated), then pnpm -r typecheck, lint, and test. If anything fails, git reset --hard ORIG_HEAD (this undoes ONLY your merge) and STOP with the failure output.
5b. Content lane (WP-20x, WP-53): register the new case in packages/content/src/index.ts (import + add to AUTHORED_CASES), run tests again, and commit "[INT] register <case>".
6. If docs/proposals/WP-<ID>.md exists, apply the approved doc changes to SYSTEM_DESIGN.md/PLAN.md in a separate commit "docs: apply WP-<ID> proposals".
7. Update WORKBOARD.md §4 (state ✅) and commit.
8. Remove the merged worktree: git worktree remove "C:\Users\user\Documents\lastlie-wt\wp-<ID>" (only this one), and keep the branch.
9. Tell every still-running agent in the same wave: "main moved. You may run `git merge main` on your own branch if you need the new code." Never rebase their branches for them.
Report what was merged and the test results.
```

### INT-WAVE — Start a new wave

```text
You are the integrator. Read WORKBOARD.md §2 for Wave <N>.
1. Confirm every WP from the previous wave is ✅ merged and main is green (run the full suite).
2. If the previous wave produced Requests for contract changes, list them and propose ONE contract task prompt that bundles them. It must run alone BEFORE this wave.
3. For each Wave <N> row, output the exact text to paste into that agent's session: P-START filled with agent name, lane, WP id, branch, and worktree path, followed by the WP prompt copied from PROMPTS.md.
4. Mark those rows 🔵 in WORKBOARD.md §4 and commit on main.
```

### R0 — Conflict / scope inspector (any time, read-only)

```text
Read-only task. Don't modify anything.
List all worktrees (git worktree list) and, for each wp/* branch not merged into main, run git diff --name-only main...<branch>.
Report:
1. Any file changed by more than one branch (potential conflict), with the branches involved.
2. Any file outside that branch's Owns paths in WORKBOARD.md.
3. Any branch whose base is far behind main (git rev-list --count <branch>..main > 15).
Recommend which branch should merge first and which agents should `git merge main` now.
```

---

# Reusable prompts

### R1 — Verify a work package (run in a NEW session)

```text
You are a strict reviewer. Do NOT write feature code.
Read AGENTS.md, SYSTEM_DESIGN.md, and the section for WP-<ID> in PLAN.md.

Verify WP-<ID> on the current branch:
1. Run: pnpm i, pnpm -r typecheck, pnpm -r lint, pnpm -r test (and coverage for case-engine). Paste the results.
2. Go through every acceptance criterion for WP-<ID> and mark it PASS or FAIL with evidence (file:line, test name, or command output). If a criterion has no test proving it, write a test that proves it or mark it FAIL.
3. Scope check: list every changed file (git diff --stat against main) and flag any file outside the WP's "Owns" paths.
4. Rule check against AGENTS.md: determinism, no answer leaks, no secrets, no any/@ts-ignore, contracts in sync with SYSTEM_DESIGN.md.
5. Hunt for bugs: edge cases, off-by-one errors in time intervals, empty arrays, missing ids, error handling.

You MAY add or adjust tests only. Do not change source files.
Output a verdict of PASS or FAIL, then a numbered findings list. Give each finding a severity (blocker/major/minor), file:line, the failing scenario, and a suggested fix.
```

### R2 — Fix findings

```text
Read AGENTS.md and the WP-<ID> section of PLAN.md.
A reviewer reported the findings below for WP-<ID>. Fix every blocker and major finding. Fix minor findings only if it takes under 10 minutes each. Otherwise list them as follow-ups.
For each fix, add or update a test that would have caught the problem.
Stay inside the WP's Owns paths. Finish with the AGENTS.md "Definition of done" report and a table: finding # → fixed / deferred (reason).

FINDINGS:
<paste reviewer output here>
```

### R3 — Security audit for a phase (run in a NEW session)

```text
You are a security reviewer for "THE LAST LIE: Infinite". Read AGENTS.md and SYSTEM_DESIGN.md (sections 3, 7, 8, 9.2, 12).
Audit everything built so far for phase <P0|P1|P2|P3|P4|P5>. Do not add features.

Check, as applicable:
A. Answer leakage: can the client obtain truth, hypothesis claims, culpritIds, seeds, or locked clue text from bundle contents, API responses, error messages, logs, analytics events, share cards, or deep links? Write automated tests that deep-scan real responses and payloads for forbidden keys and for locked clue strings.
B. Authorization: for every table and endpoint, can user A read or modify user B's sessions, results, progress, or profile (IDOR)? Can anon read case_private? Can the client write results or progress directly? Write RLS tests (pgTAP or supabase test scripts) and endpoint tests.
C. Scoring integrity: double submit, submitting after a reveal, submitting for a case not in the session, unlocking a clue whose prerequisites aren't met, replay farming of XP, forged guest tokens, tampered request bodies (extra fields, huge arrays, wrong types).
D. Input validation and abuse: every endpoint validates input with Zod, sets body size limits, and has rate limits. Check for SQL injection (no string-built SQL), path traversal in the CLI, and ReDoS in regexes.
E. Secrets and config: no keys in git history (run gitleaks or an equivalent scan), service-role key only on the server or in the CLI, .env.example present, CORS restricted, HTTPS only.
F. Dependencies: run pnpm audit and list high/critical issues with a fix plan.
G. Mobile: no secrets in the app bundle, secure storage for auth tokens (expo-secure-store), dev/local mode impossible in production builds, deep-link parameters validated.
H. Privacy: no PII in analytics, a working data-deletion path for a user, minimal profile fields.

Fix issues only inside test files and docs/security/. For every real vulnerability, write it up in docs/security/audit-<phase>.md with severity (critical/high/medium/low), reproduction, impact, and recommended fix. Don't patch source; a separate fix session does that with R2.
Finish with: a count of findings by severity, the list of tests added, and a PASS/FAIL verdict (FAIL if any critical or high finding is open).
```

### R4 — Phase gate (run in a NEW session)

```text
Read PLAN.md (Phase overview and the phase <P#> section) and AGENTS.md.
Decide whether phase <P#> is complete:
1. For each WP in the phase, check that it is merged and that its acceptance criteria hold on main (re-run the tests).
2. Check the phase exit criteria in the Phase overview table.
3. Check that the latest docs/security/audit-<P#>.md has no open critical or high findings (P0–P3 may have no audit file. Treat that as fine only if no network or auth code exists yet).
4. Run the full test suite and the content validator (pnpm lastlie validate "packages/content/cases/**" once the CLI exists).
5. Check SYSTEM_DESIGN.md against the code. List any drift.
Output: GO or NO-GO, a blockers list, a drift list, and the recommended first WPs for the next phase.
```

### R5 — Resume an interrupted WP

```text
Read AGENTS.md and the WP-<ID> section of PLAN.md. A previous agent started WP-<ID> but did not finish.
Inspect git status, git diff, and git log on branch wp/<ID>-*. Work out what is done and what is missing against the acceptance criteria. Then finish the WP. Don't redo completed work unless it is broken.
Finish with the Definition of done report.
```

### R6 — Content review (for any new case)

```text
You are a mystery editor. Read docs/content-style-guide.md and SYSTEM_DESIGN.md §3–4.
Review the case file <path>:
1. Run the validator on it and paste the report.
2. Solve the case yourself using only what a player sees (run `pnpm lastlie render <path> --public` if available, or apply toPublicCase mentally). Write your reasoning before reading truth. Record your time estimate.
3. Compare your answer with truth. Is the solution fair, unique, and explainable from the key evidence? Is any red herring unfair? Is any clue text ambiguous?
4. Check tone and style against the guide.
Output: verdict (publishable / needs changes), issues with suggested rewrites. Don't edit the file.
```

### B0 — (Only if you choose a backend other than Option C)

```text
Read SYSTEM_DESIGN.md §8 and the P4 sections of PLAN.md and PROMPTS.md.
We chose backend option <B: own Node (Hono) API on <host> + managed Postgres on <Neon/...> + <auth provider> | other: ...>.
Update SYSTEM_DESIGN.md §2, §8 and §13, PLAN.md P4/P5 WPs, and the P4/P5 prompts in PROMPTS.md to match. Keep every security property: server-only solutions, row-level authorization (enforced in the API if there is no RLS), rate limits, and idempotent submit.
Change docs only. List every changed section.
```

---

# Phase 0 — Foundation

### WP-01 — Monorepo scaffold

```text
Follow AGENTS.md. Task: WP-01 in PLAN.md.

1. This folder sits inside a parent git repo (the user's home directory). Run `git init` in THIS folder so the project has its own repo, create branch `main`, then branch `wp/01-scaffold`.
2. Create a pnpm workspace: packages/case-engine, packages/content, packages/api-contract, tools/cli (apps/mobile comes later in WP-07, but include `apps/*` in the workspace globs).
3. Root: tsconfig.base.json (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes), ESLint (typescript-eslint, plus a rule banning Math.random and Date.now inside packages/case-engine), Prettier, a Vitest workspace with coverage (v8), .nvmrc (Node 20), .gitignore (node_modules, .env*, !.env.example, coverage, dist, .expo), .env.example, and a README covering the commands.
4. Each package gets package.json, tsconfig.json, src/index.ts, and one placeholder test.
5. Root scripts: typecheck, lint, test, test:coverage, format.
6. .github/workflows/ci.yml: install with pnpm cache, then run typecheck, lint, and test on push and PR.
Make an initial commit with only the scaffold. Finish with the Definition of done report.
```

### WP-02 — Engine schema & types

```text
Follow AGENTS.md. Task: WP-02 in PLAN.md. Owns: packages/case-engine/src/schema/**.

Using SYSTEM_DESIGN.md §3 and §7.1 exactly, write Zod schemas and z.infer types for: Time (with helpers toTime("23:47") → 1427 and fromTime), Id, every Fact variant (discriminated union on `kind`), Verb, RelationType, MotiveType, Clue (with unlock union and reliability), Hypothesis, RevealBeat, GroundTruth, Character, Location (include doorIds and travel-time adjacency), GameObject (include ownerId for devices), Interview (minimal, for later), ConspiracyHook, CaseStatus, CaseMeta, CaseDefinition, PublicClue, CasePublic, BoardState (cards with x,y; links {a,b}), SessionState, Submission (max 3 supportingClueIds, max 20 contradictions), ScoreResult (with breakdown), Reveal.
Add schema-level refinements for cheap checks: from <= to for intervals, Time range 0..2879 (allows past midnight), unique ids inside arrays.
Export everything from packages/case-engine/src/index.ts.
Tests: valid fixtures parse; round-trip; at least one invalid fixture per schema with a readable error path.
Finish with the Definition of done report.
```

### WP-03 — Logic core

```text
Follow AGENTS.md. Task: WP-03 in PLAN.md. Owns: packages/case-engine/src/logic/**.

Implement, as pure functions:
- buildContext(def): door→location map, device→owner map, travel time lookup (symmetric; default "unknown" means no travel rule fires).
- contradicts(a, b, ctx) → { ruleId, explanation } | null. Cover every rule in SYSTEM_DESIGN §4.1 plus presence.travel. It must be symmetric: contradicts(a,b) and contradicts(b,a) both fire or both don't, with the same ruleId.
- Interval semantics: intervals are [from, to). Touching intervals (to === from) do NOT overlap. Document this in a comment and in SYSTEM_DESIGN.md §4.1.
- factEntailed(fact, timeline, ctx): true if the fact is in the timeline or implied by it (sub-interval of an `at`, same message, and so on). Keep the implication rules explicit and listed.
- evaluateHypothesis(h, clues, ctx) → { eliminated: boolean, by: {claim, fact, ruleId}[] }. Only PHYSICAL clue facts eliminate.
- survivingHypotheses(def, clueIds, ctx).
Tests: for each rule, one positive, one negative, and one boundary case. A fast-check property test for symmetry. Coverage ≥90%.
Finish with the Definition of done report.
```

### WP-04 — First authored case (can run alongside WP-03)

```text
Follow AGENTS.md. Task: WP-04 in PLAN.md. Owns: packages/content/cases/authored/case_0001.json, docs/content-style-guide.md.

1. Write docs/content-style-guide.md: Vesper City tone (noir, grounded, no gore), clue-writing rules (one fact per sentence, times in 24h HH:MM, no clue that names the answer), id naming (char_, loc_, obj_, clue_, hyp_, msg_, door_, dev_), and a difficulty guide.
2. Write case_0001 "The Missing Message" exactly as specified in WP-04: the ground-truth timeline first, then clues derived from it, then 3 hypotheses (the solution plus 2 decoys, each eliminated by a different key clue), keyEvidence sets of size 2, and reveal beats that cite clue ids.
3. Before writing JSON, write a short plain-English solution walkthrough at docs/cases/case_0001-walkthrough.md: what happened, and how a player proves it from the evidence step by step.
4. Make it parse with the WP-02 schema (add a test in packages/content that loads and parses all authored cases).
If WP-05 (validator) exists, run it and get zero errors. If not, say so in the report.
Finish with the Definition of done report.
```

### WP-05 — Validator

```text
Follow AGENTS.md. Task: WP-05 in PLAN.md. Owns: packages/case-engine/src/validator/**.

Implement validateCase(def, opts?) → ValidationReport { ok, errors[], warnings[], metrics }, with checks V1–V13 from SYSTEM_DESIGN §4.3, each in its own file exporting { checkId, run(def, ctx) }.
- "Obtainable clues" means every clue reachable through the unlock graph (default + after_clue + interview + request).
- V8: for each keyEvidence set, check that it is reachable AND that with only that set every non-solution hypothesis is eliminated.
- Difficulty metric: put the weights in a DIFFICULTY_WEIGHTS config object. Return the computed score in metrics.
- Add formatReport(report) for readable CLI output.
Tests: a minimal valid fixture builder (makeCase()) and, for EACH check, a mutation that breaks only that check and asserts its checkId fires. case_0001 must validate clean (fix validator bugs, not the case. If the case is truly wrong, list it under Requests).
Finish with the Definition of done report.
```

### WP-06 — Redaction & scoring

```text
Follow AGENTS.md. Task: WP-06 in PLAN.md. Owns: packages/case-engine/src/redact/**, packages/case-engine/src/scoring/**.

Implement:
- toPublicCase(def, unlockedIds): builds an explicit allow-list of output fields, following SYSTEM_DESIGN §3.6 exactly. Never copy the object and delete fields from it. Unlocked clues: NO `asserts`, tags filtered by PUBLIC_CLUE_TAGS, text always present. Locked clues: { id: "locked_<n>", type, locked: true, hint }. Hypotheses show only id and label.
- canUnlock(def, session, clueId, via) → ok | { error code }.
- scoreSubmission(def, session, submission) following §7.2 exactly. Return a breakdown per component. Validate the submission against the session (clue ids must be unlocked, hypothesis must exist).
- buildReveal(def, result): full timeline beats, all clues, the validity of each player link with its ruleId.
Security tests: a deepScan helper that walks any output and fails on keys {truth, claims, culpritIds, seed, asserts, keyEvidence, liars, conspiracyHooks}, on internal tags, on any locked clue's text, and on real ids of locked clues.
Scoring tests: read case_0001.json first and derive every expected id and number from it. Run it against case_0001 for every unlock subset (the power set is fine at this size).
Scoring table tests: correct + full evidence, correct + partial, wrong + good links, bad links floor, request penalties, replay multiplier.
Finish with the Definition of done report.
```

### WP-07 — Mobile shell

```text
Follow AGENTS.md. Task: WP-07 in PLAN.md. Owns: apps/mobile/**.

Create an Expo app (latest stable SDK, TypeScript, Expo Router, New Architecture on, Hermes) at apps/mobile, wired into the pnpm workspace (configure Metro for monorepo + pnpm symlinks).
- Tabs: Home, Investigate, Progress, Challenges, Profile, each with a placeholder screen.
- Theme: dark noir tokens (bg, surface, text, muted, accent, danger, success), spacing scale, typography with a monospace style for logs. Respect system font scaling.
- Install and configure: react-native-reanimated, react-native-gesture-handler, @shopify/react-native-skia, @shopify/flash-list, zustand, @tanstack/react-query, react-native-mmkv.
- src/services/GameService.ts: the interface from SYSTEM_DESIGN §9.2, plus FakeGameService returning static data.
- Import a type from @lastlie/case-engine to prove workspace linking works.
- The web target must run (expo start --web).
Add a test setup (jest-expo or vitest + react-native-testing-library, pick one and document it) with one render test per tab.
Finish with the Definition of done report, including the exact commands to run on iOS, Android, and web.
```

**After P0:** run **R3 (P0)**, then **R4 (P0)**.

---

# Phase 1 — Playable prototype (offline)

### WP-10 — LocalGameService

```text
Follow AGENTS.md. Task: WP-10 in PLAN.md (Wave 1, lane MS).
Owns: apps/mobile/src/services/local/**, apps/mobile/src/services/index.ts, apps/mobile/src/store/**, apps/mobile/app/case/**, apps/mobile/src/features/case/slots.ts, docs/proposals/WP-10.md, and the SLOT STUB files listed in WORKBOARD.md §3 (stubs only). You may also edit apps/mobile/app/(tabs)/index.tsx, investigate.tsx and progress.tsx, but ONLY to render the home/library/progress slots.

Part A, slots for parallel UI work (do this FIRST and commit it on its own, so Wave 2 agents get a stable layout):
- apps/mobile/src/features/case/slots.ts: export `CaseSlotProps { sessionId: string }`, plus the hooks contract the slots use: `useCaseSession(sessionId)` → { casePublic, session, status, error } and `useGameService()` → GameService. Implement the hooks in apps/mobile/src/store/.
- apps/mobile/app/case/[sessionId].tsx: case screen container with top tabs Briefing | Evidence | Board | Theory, and Reveal shown after submit. Each tab renders its slot component.
- Slot stubs (WORKBOARD §3): each exports a default component (CaseSlotProps for case slots, no props for home/library/progress) that renders a placeholder <Text> with testID "<feature>.placeholder". Wave 2 agents replace ONLY the inside of these files and add sibling files.
- Write docs/proposals/WP-10.md describing the slot contract, for the integrator to fold into SYSTEM_DESIGN §9.

Part B, LocalGameService:

Implement LocalGameService over bundled authored cases from @lastlie/content, using engine functions (toPublicCase, canUnlock, scoreSubmission, buildReveal). The UI must only ever receive CasePublic, never CaseDefinition, even locally. Keep definitions private inside the service module.
- Sessions are held in a Zustand store (persistence comes in WP-21).
- services/index.ts picks the implementation from a config flag. Show a visible "DEV · LOCAL" badge component when local is active.
- Errors are typed (CASE_NOT_FOUND, CLUE_LOCKED, ALREADY_SUBMITTED, ...).
Tests: a full session on case_0001 (start → unlock → saveBoard → submit → reveal). Submitting twice gives the same result and no double XP. deepScan over every value the service returns before submit.
Finish with the Definition of done report.
```

### WP-11 — Briefing & Evidence screens

```text
Follow AGENTS.md. Task: WP-11 in PLAN.md (Wave 2, lane MU, runs in parallel with WP-12 and WP-13).
Owns: apps/mobile/src/features/case/briefing/**, apps/mobile/src/features/case/evidence/**, apps/mobile/src/features/case/components/** (the shared ClueCard. Keep its props stable and document them in the file header).
Do NOT edit app/case/** or slots.ts (WP-10 owns them). Fill in the briefing/index.tsx and evidence/index.tsx slots. Get all data through useCaseSession/useGameService.
- Briefing: question, setting, character list with public descriptions.
- Evidence: FlashList of ClueCards, type filter chips, unread dot (tracked in the session), detail sheet. Log-type clues use the monospace style.
- Locked clues show as locked cards with their `hint` (SYSTEM_DESIGN §3.6). "Request evidence" shows its cost and asks for confirmation (in-app sheet, not a native alert).
- Accessibility: labels on all interactive elements, works at 200% font scale, color is never the only signal.
Tests: renders every clue type; filter works; unlock flow calls the service; locked card shows no text.
Finish with the Definition of done report plus screenshots or a description of each state.
```

### WP-12 — Evidence board

```text
Follow AGENTS.md. Task: WP-12 in PLAN.md (Wave 2, lane MU, runs in parallel with WP-11 and WP-13).
Owns: apps/mobile/src/features/case/board/** only. Fill in the board/index.tsx slot. Don't import WP-11's ClueCard (not merged yet). Board cards are drawn with Skia inside board/.
Use Expo port 8012 if you run the dev server.

Build the board with react-native-skia for drawing (cards and link lines), plus Reanimated and Gesture Handler for pan/zoom/drag (UI thread, no JS-thread animation).
- Add clue cards to the board from the Evidence tab or a tray. Drag to position.
- Create a link by dragging from one card's handle to another, OR through the accessible flow: tap card A → "Link" → tap card B. Tap a link to delete it.
- No validity feedback before submit (unless the hint-mode flag is on; keep that off by default and leave it unimplemented beyond the flag).
- BoardState goes through GameService.saveBoard, debounced at 500ms.
- Performance: 12 cards + 10 links at 60fps on a mid-range Android. Add a dev FPS overlay toggle.
Tests: pure reducer tests for board state (add/move/link/unlink/dedupe links, no self-links); a component test for the accessible link flow.
Finish with the Definition of done report.
```

### WP-13 — Theory & Reveal

```text
Follow AGENTS.md. Task: WP-13 in PLAN.md (Wave 2, lane MU, runs in parallel with WP-11 and WP-12).
Owns: apps/mobile/src/features/case/theory/**, apps/mobile/src/features/case/reveal/**. Fill in the theory/index.tsx and reveal/index.tsx slots. For clue lists, use a small local row component inside theory/. Don't import WP-11's ClueCard yet; a follow-up can swap it in after merge.
Use Expo port 8013 if you run the dev server.

- Theory: pick one hypothesis (labels only), choose up to 3 supporting clues from the unlocked ones, review the board links, then a confirm sheet ("You can't change your answer"), then submit.
- Reveal: score header with breakdown, a vertical timeline of reveal beats (tap a beat to open the cited clue), the player's links marked ✓/✗ with an icon and text (not color alone) and the rule explanation, then "Next case" and "Back to home".
- Submit is disabled while in flight, and a double tap can't double-submit.
Tests: nothing from the reveal is rendered before submit; the 3-clue limit is enforced; a double tap results in one submit call.
Finish with the Definition of done report.
```

### WP-14 — Prototype E2E

```text
Follow AGENTS.md. Task: WP-14 in PLAN.md (Wave 3, lane T). Owns: apps/mobile/e2e/** ONLY.
Use the testIDs that feature agents added under the `<feature>.<element>[.<id>]` convention (grep the code for testID). If one you need is missing, do NOT add it to feature files. List it under Requests and use a text-based selector for now.

Write a Maestro flow: launch → Home "Solve a case" → case_0001 → open 2 clues → unlock 1 → create 1 link on the board (use the accessible flow) → Theory → pick the correct hypothesis + key clues → submit → assert the reveal score > 0 → "Next case" opens a case screen.
Add a second flow with the wrong hypothesis that asserts the reveal shows the correct answer.
Document how to run it locally (Android emulator + iOS simulator) in apps/mobile/e2e/README.md. Add it to CI if a free runner option is available; otherwise document a manual run.
Finish with the Definition of done report.
```

**After P1:** run **R3 (P1)** and **R4 (P1)**. Then playtest a build yourself before moving on.

---

# Phase 2 — Content & progression

### WP-20a / 20b / 20c — One authored case per agent (Wave 1, lane C, can run in parallel)

| Sub-WP | Case | Type | Difficulty | Decisive rule | Setting | Cast first names |
|---|---|---|---|---|---|---|
| 20a | case_0002 | missing_item | 1 | `possess.exclusive` or `access.presence` | gallery + loading dock | start with A–H |
| 20b | case_0003 | hidden_identity | 2 | `presence.travel` | train station + hotel | start with I–P |
| 20c | case_0004 | forged_message | 3 | `message.time` or `state.value` | newsroom + print shop | start with Q–Z |

case_0001's cast (Maya, Arjun, Rhea, Marcus) and its studio are reserved, so don't reuse them.

```text
Follow AGENTS.md and docs/content-style-guide.md. Task: WP-20<a|b|c> (Wave 1, lane C). Other content agents are writing the other cases right now.
Owns ONLY: packages/content/cases/authored/<case_000N>.json, docs/cases/<case_000N>-walkthrough.md, packages/content/tests/<case_000N>.test.ts.
Do NOT edit packages/content/src/index.ts. The integrator registers your case on merge, and your test imports the JSON directly.

Write <case_000N> using the type, difficulty, decisive rule, setting, and name range from the WP-20 table in PROMPTS.md.
Order: walkthrough first, then the timeline, clues derived from the timeline, hypotheses (solution + 2–3 decoys, each eliminated by a different key clue), keyEvidence, and reveal beats.
Follow SYSTEM_DESIGN §3.6: physical clue asserts contain only what that record could observe (no message sender on carrier logs), and clue text mentions only people and times in its own asserts.
Fair-play rule: no single clue may state the crime or the answer outright (e.g. never 'X took the item'). But the evidence MUST let the player prove the solution: every declared lie must be contradicted by at least one obtainable physical clue, and the culprit must be placed (by time/place/possession/device) by at least one key-evidence clue. Physical records may name people when the record itself would show them (badge logs, sign-in sheets, device logins).
Your test must: parse with CaseDefinitionSchema, validateCase → zero errors, measured difficulty within ±1 of the target, and deepScan(toPublicCase(def, defaultClueIds)) passes.
Finish with the Definition of done report plus the validator output.
```
Then run **R6** on each new case.

### WP-21 — Local persistence

```text
Follow AGENTS.md. Task: WP-21 in PLAN.md. Owns: apps/mobile/src/services/local/storage*.

Persist sessions, results, progress, and unread state with MMKV. Store a schemaVersion with an ordered migration list. On a parse failure (validate with Zod on load), quarantine the corrupt data under a backup key and start fresh without crashing.
Resume: an app kill mid-case restores the session, board, and current tab.
Tests: save/load round-trip; a migration from v1 to v2 with a fake migration; a corrupt-blob recovery.
Finish with the Definition of done report.
```

### WP-22 — Progression engine

```text
Follow AGENTS.md. Task: WP-22 in PLAN.md. Owns: packages/case-engine/src/progression/**.

Implement applyResult(progress, result, caseMeta, config) → { progress, events[] } (events like rank_up, mastery_progress, unlock). Rules are in SYSTEM_DESIGN §7.3: XP = score × difficulty multiplier, ×0.25 for replays, and a mastery gate per rank. Put defaults in a DEFAULT_PROGRESSION_CONFIG object (ranks, thresholds, gates).
Tests: table-driven. Include a "grinder" test: 500 perfect difficulty-1 solves must NOT pass the Investigator gate. A "skilled" test: a realistic mix reaches Specialist.
Finish with the Definition of done report.
```

### WP-23 — Progress tab

```text
Follow AGENTS.md. Task: WP-23 in PLAN.md. Owns: apps/mobile/src/features/progress/**.

Build the Progress tab: rank card (XP bar, next rank, mastery requirements with progress), case archive (FlashList; solved cases with score, date, and correct/incorrect), replay (starts a mode='replay' session and, after the reveal, shows the previous theory next to the new one), and character dossiers (characters met, with public descriptions and the cases they appeared in).
Tests: archive renders from progress data; replay starts a replay-mode session; the dossier only lists characters from solved cases.
Finish with the Definition of done report.
```

### WP-24 — Home & library

```text
Follow AGENTS.md. Task: WP-24 in PLAN.md. Owns: apps/mobile/src/features/home/**, apps/mobile/src/features/library/**.

Home: one dominant "Solve a case" CTA (picks the next unplayed case closest to the player's level; the selection function is pure and tested), a "Continue investigation" card if a session is open, and a placeholder slot for the daily case.
Library (Investigate tab): list of cases with difficulty and type filters, plus solved/unsolved badges.
Tests: the selection function (no unplayed cases left → falls back to an archive suggestion); filters.
Finish with the Definition of done report.
```

### WP-25 — Playtest kit

```text
Follow AGENTS.md. Task: WP-25 in PLAN.md. Owns: docs/playtest/**.

Write: a facilitator script (think-aloud, no hints), an observation sheet (time per screen, confusion points, where they look for clues, whether they voluntarily ask for another case), a 6-question post-session survey, a consent note, and a guide to producing and installing an EAS preview build on testers' phones. Also add a results template at docs/playtest/results-template.md with sections matching the PLAN.md P2 exit criteria and the §11 metrics.
Finish with the Definition of done report.
```

**After P2:** run **R3 (P2)** and **R4 (P2)**, then **run the real playtest with 10 people** and put the findings in `docs/playtest/results-p2.md`.

---

# Phase 3 — Procedural engine

### WP-30 — RNG & renderer

```text
Follow AGENTS.md. Task: WP-30 in PLAN.md. Owns: packages/case-engine/src/rng.ts, packages/case-engine/src/render/**.

- rng.ts: a seeded PRNG (mulberry32 or sfc32) with int(min,max), pick(arr), shuffle(arr) (no mutation), weighted(arr), fork(label) for an independent sub-stream.
- render/: renderFact(fact, world, rng) and renderClue(clue, world, rng). Use several phrasing variants per fact kind and clue type (logs render as log lines, testimony as quotes from the source character). Times are always HH:MM. Never mention ids. Names come from world data.
- Update the validator's V11 to use renderClue if it doesn't already. If the validator is outside your scope, list that under Requests.
Tests: determinism (same seed → identical strings, 100 seeds); every fact kind and clue type renders non-empty text with no "undefined" or ids; snapshot tests for a few seeds.
Finish with the Definition of done report.
```

### WP-31 — Template framework

```text
Follow AGENTS.md. Task: WP-31 in PLAN.md. Owns: packages/case-engine/src/generator/core/**, packages/content/pools/**.

1. Pools (JSON + Zod): first names and surnames (diverse, fictional), Vesper City locations with doors and adjacency/travel times, objects and devices, motives, relations. At least 60 names and 15 locations.
2. CaseTemplate interface per SYSTEM_DESIGN §5.1, and generateCase({templateId, seed, difficulty}) implementing the §5.2 pipeline: forked rng streams per step, retry with seed+1 up to 20 times, return { case, attempts, report }, and throw a typed error after 20 failures.
3. Shared helpers: perturbClaim (time shift / place swap) for decoys and lies, injectRedHerrings, deriveClueFromFact.
4. A toy template ("tpl_toy_two_rooms") that proves the pipeline end to end.
Tests: the toy template passes the validator for 1,000 seeds (fast-check); determinism; the retry path is exercised.
Finish with the Definition of done report.
```

### WP-32 / WP-33 / WP-34 — Templates (one session each, can run in parallel)

```text
Follow AGENTS.md. Task: WP-<32|33|34> in PLAN.md — template "<false_alibi | missing_item | forged_message>". Owns: packages/case-engine/src/generator/templates/<name>*.

Design first: write a header comment explaining the template's ground-truth story shape, the slots, which contradiction rules make it solvable, how decoys are built, and how difficulty 1→4 changes it (more red herrings, deeper unlocks, travel-time reasoning at 3+, larger keyEvidence).
Then implement build(). Build the timeline first, then derive clues, then the hypotheses. Use only the core helpers and pools.
Tests:
- fast-check over 1,000 seeds × difficulties 1–4: zero validator errors, measured difficulty within ±1 of the target.
- Generate 10 samples (seeds 1–10, mixed difficulty), render them to markdown in packages/content/samples/<name>/ for human review, and list them in the report.
Finish with the Definition of done report.
```
Then run **R6** on 3 of the generated samples.

### WP-35 — Authoring CLI

```text
Follow AGENTS.md. Task: WP-35a in PLAN.md (Wave 1, lane T). Owns: tools/cli/** EXCEPT tools/cli/src/generate/, publish/, report/, paraphrase/ (later WPs own those).
Create a command registry (tools/cli/src/commands.ts) with each command in its own folder, so later WPs only add a folder plus one append-only registry line.
This is part A: validate, render, playtest, and the publish stub. `generate` is WP-35b (Wave 3, after WP-31), so leave a stub that prints "available after WP-31".
The CLI loads cases from files/globs. Don't depend on packages/content/src/index.ts.

Build the `lastlie` CLI (commander or citty) exposed as `pnpm lastlie`:
- validate <glob...>: exits non-zero on any error, prints formatReport.
- generate --template <id> --count N --difficulty D [--seed S] --out <dir>: writes CaseDefinition JSON plus a summary.
- render <file> [--public]: readable markdown; --public shows only what a player sees at the start.
- playtest <file>: an interactive terminal session that uses the same engine functions (start, list clues, unlock, link, theory, submit, reveal).
- publish: a stub that prints "not implemented until WP-42".
Security: resolve and validate every path so nothing is written outside --out, and never follow symlinks out of the repo.
Add `pnpm lastlie validate "packages/content/cases/**"` to CI.
Tests: an integration test per command against temporary dirs.
Finish with the Definition of done report.
```

### WP-36 — Fingerprint & difficulty calibration

```text
Follow AGENTS.md. Task: WP-36 in PLAN.md. Owns: packages/case-engine/src/generator/fingerprint*, packages/case-engine/src/validator/difficulty*, tools/cli/src/report/**.

- fingerprint(def): a stable hash of (templateId, culprit role, decisive ruleId, sorted location set, liar count).
- `lastlie report --repetition --template X --count 50`: collision rate and the most common fingerprints.
- Calibrate DIFFICULTY_WEIGHTS using the playtest times in docs/playtest/results-*.md (fit by least squares or a documented manual tuning). Record the before and after in docs/difficulty-calibration.md.
- If any template's collision rate is ≥10%, list concrete template changes under Requests.
Finish with the Definition of done report.
```

### WP-37 — (Optional) LLM paraphrase

```text
Follow AGENTS.md. Task: WP-37 in PLAN.md. Owns: tools/cli/src/paraphrase/**.

Add `lastlie paraphrase <file> --out <file>`, which sends ONLY rendered clue and briefing text (never truth, ids, or asserts) to the Claude API (model id from env LASTLIE_LLM_MODEL, key from env ANTHROPIC_API_KEY) and asks for a style-guide-compliant rewrite.
Guard each rewrite: reject it if it adds or removes any time (HH:MM), any proper noun not in the case's characters or locations, or any number. Then re-run validateCase. Write the result to `text` overrides only.
Tests: mock the API; the guard rejects an injected wrong time, a new name, and a removed time. Add a lint rule or test proving no app or server package imports this module.
Finish with the Definition of done report.
```

**After P3:** run **R3 (P3)** and **R4 (P3)**. Mix 5–10 generated cases per template into the local library and run a second playtest.

---

# Phase 4 — Backend & social (Option C: Supabase + Hono)

> If you haven't decided on the backend yet, decide now. Run **B0** if you're not using Option C.

### WP-40 — Database schema & RLS

```text
Follow AGENTS.md. Task: WP-40 in PLAN.md. Owns: supabase/** (migrations, seed, tests, config).

1. supabase init (if needed); local dev with the Supabase CLI.
2. Migrations for the core tables in SYSTEM_DESIGN §8.1 (no † tables), with sensible indexes (case_sessions(user_id, status), case_results(user_id, created_at), cases(status, kind, difficulty)), FKs, CHECK constraints (status enums, difficulty 1–5), and created_at defaults.
3. RLS ON for every table. Policies exactly per the §8.1 table. case_private has NO policies for anon or authenticated (deny all). Use (select auth.uid()) in policies for performance.
4. Revoke direct INSERT/UPDATE/DELETE on sessions, results, progress, and unlocks from anon and authenticated.
5. A profile row is created by a trigger on auth.users insert.
6. seed.sql: game_config defaults, plus case_0001 published (public_payload from toPublicCase, definition in case_private). Generate the seed with a small script, not by hand.
Tests (pgTAP or SQL test scripts run via supabase test db): anon can't select case_private; user A can't select user B's sessions; authenticated can't insert into case_results; published cases are readable and drafts are not.
Finish with the Definition of done report.
```

### WP-41 — API core (Hono)

```text
Follow AGENTS.md. Task: WP-41 in PLAN.md. Owns: supabase/functions/api/** (a single Hono app deployed as one Edge Function), supabase/functions/_shared/**, packages/api-contract/**.

1. packages/api-contract: Zod request and response schemas for start-session, unlock-clue, save-board, submit, get-daily, and a typed error envelope { error: { code, message } }.
2. A single Edge Function "api" running a Hono app with routes POST /sessions, POST /sessions/:id/unlock, PUT /sessions/:id/board, GET /daily. (submit comes in WP-42.)
3. Middleware: request id, JWT verification via Supabase Auth (getUser on the token) → c.var.userId, Zod validation, 64KB body limit, per-user rate limits (60/min, stored in Postgres with a small table plus an atomic upsert, or Upstash if configured), CORS allow-list from env, and an error handler that never leaks stack traces or internal fields.
4. Data access with the service-role client, but EVERY query is scoped to c.var.userId explicitly (authorization in code, because service role bypasses RLS).
5. Engine import: bundle @lastlie/case-engine into the function (esbuild step in package scripts, output to supabase/functions/_shared/engine.js) OR use an npm: specifier. Pick one, document it in SYSTEM_DESIGN.md §8.2, and make `supabase functions serve` work.
6. Keep the Hono app portable: no Deno-only APIs outside one adapter file, so the same app can run on Node later.
Tests: integration tests against local Supabase: happy paths; user B can't touch user A's session (404, not 403, to avoid enumeration); an unlock with unmet prerequisites is rejected; deepScan on every response body.
Finish with the Definition of done report.
```

### WP-42 — Submit & publish

```text
Follow AGENTS.md. Task: WP-42 in PLAN.md. Owns: supabase/functions/api/routes/submit*, a migration for any submit SQL function, tools/cli/src/publish/**.

1. POST /sessions/:id/submit: load the session (own, unsubmitted) and case_private at the session's case_version, then run scoreSubmission and applyResult. Write case_results, mark the session submitted, and update player_progress and player_unlocks in ONE transaction (a Postgres function called via rpc, or a single SQL transaction). It is idempotent: a second call returns the stored result and reveal with no extra XP. Return ScoreResult + Reveal.
2. Timing sanity: if submitted_at - started_at is below a configurable minimum, store flag 'too_fast' on the result (don't reject).
3. `lastlie publish <glob> --env <local|staging|prod>`: validate first (refuse on any error), compute public_payload with toPublicCase, upsert cases + case_private with the service key from env, bump the version if the content changed (store the previous version, because sessions reference case_version), and confirm interactively for prod.
Tests: concurrent double submit (Promise.all) gives one result row; a replay-mode session gives reduced XP; publishing an invalid case fails; the response deepScan passes before submit and the reveal is complete after.
Finish with the Definition of done report.
```

### WP-43 — RemoteGameService

```text
Follow AGENTS.md. Task: WP-43 in PLAN.md. Owns: apps/mobile/src/services/remote/**, apps/mobile/src/services/index.ts.

Implement GameService over the API using fetch, parsing every response with @lastlie/api-contract (reject on a schema mismatch), with TanStack Query for caching and retries (no retries on 4xx).
- saveBoard: an offline queue that persists to MMKV and flushes when back online. Last write wins per session.
- submit: never auto-retried without the same idempotency (it's idempotent server-side, so a retry is safe, but show a clear pending state).
- Production builds: the local service and the dev badge must be impossible (check via app config / __DEV__). Add a test.
Run the WP-14 Maestro flow in remote mode against local Supabase and document how.
Finish with the Definition of done report.
```

### WP-44 — Auth & profiles

```text
Follow AGENTS.md. Task: WP-44 in PLAN.md. Owns: apps/mobile/src/features/auth/**, apps/mobile/src/features/profile/**, apps/mobile/src/lib/supabase*.

- Supabase client with session storage in expo-secure-store (chunked if needed), never in AsyncStorage.
- Anonymous sign-in on first launch. Upgrade with email OTP, Sign in with Apple (required on iOS if other social logins exist), and Google. Linking keeps the same user id.
- First remote launch: migrate local (P2) progress by calling a server endpoint that accepts ONLY case ids plus local results for replay; the server re-scores nothing and grants archive unlocks only, never XP. Document this anti-cheat choice.
- Profile screen: display name (validated length and charset), title from earned titles, privacy toggles, sign out, and "Delete my account" (calls a server route that deletes the user and their rows).
Tests: an anonymous → upgraded flow keeps progress; delete removes rows (integration test).
Finish with the Definition of done report. List any API routes you need under Requests if they are outside your scope.
```

### WP-45 — Challenges & web play

```text
Follow AGENTS.md. Task: WP-45 in PLAN.md. Owns: † challenge migrations, supabase/functions/api/routes/challenges*, apps/mobile/src/features/challenges/**, apps/mobile/app/c/[code].tsx.

1. Tables challenges, challenge_attempts, referrals with RLS (§8.1).
2. POST /challenges (creator must have submitted the session) → a short code (8 chars, unambiguous alphabet, crypto-random) + URL. GET /challenges/:code → case summary only.
3. Guest play: POST /challenges/:code/guest → a signed guest token (HMAC with a server secret, contains challengeId + guestId + exp 7 days). Guest sessions are restricted to that challenge's case. A rate limit applies per IP.
4. Web: /c/[code] in the Expo web build plays the full case screen with no account. After submit, show the result and an "Install to save your progress" CTA with a deferred deep link carrying the guest token; on sign-in, the server attaches the guest result to the account (once only).
5. GET /challenges/:code/compare: only callers who have submitted to this challenge get the hypothesis distribution and most-used clues (aggregates only, no names unless the user is a friend/creator).
6. Result card: react-native-view-shot image with title, score, rank, and "Can you beat me?". It must contain no hypothesis or culprit names. Native share sheet.
Tests: a forged or expired guest token is rejected; compare is denied before submit; the share card component renders no spoiler fields (deepScan the props); a guest result attaches once.
Finish with the Definition of done report.
```

### WP-46 — Analytics & monitoring

```text
Follow AGENTS.md. Task: WP-46 in PLAN.md. Owns: apps/mobile/src/lib/analytics*, apps/mobile/src/lib/sentry*, supabase/functions/_shared/sentry*.

- A typed analytics wrapper with exactly the §11 events (a union type, so no free-form names). PostHog with a consent toggle (default on only where legally fine; document the choice). Use an anonymous distinct id, not an email.
- A prop allow-list: a test fails if any event prop contains email, display name, free text, or hypothesis/clue text (ids only).
- Sentry in the app and the API, with scrubbing of auth headers and request bodies, and release + environment tags.
Finish with the Definition of done report, including the dashboard setup steps for the §11 funnels.
```

### WP-47 — CI/CD

```text
Follow AGENTS.md. Task: WP-47 in PLAN.md. Owns: .github/workflows/**, eas.json, docs/deploy.md.

CI on PR: typecheck, lint, unit tests, coverage gate for case-engine, content validation, supabase start + db tests + API integration tests, gitleaks, and pnpm audit (fail on critical).
On main: EAS preview build (Android + iOS), deploy to the staging Supabase (migrations + functions).
On tag v*: deploy to production behind a manual approval environment.
Secrets only through GitHub environments. Document every secret name in docs/deploy.md (no values).
Finish with the Definition of done report.
```

### WP-48 — Pre-beta security review

```text
Run R3 (Security audit) for phase P4 with this extra scope:
- Threat-model docs/security/threat-model.md: assets (solutions, scores, accounts), actors (curious player, cheater, scraper, attacker), entry points (API routes, guest tokens, deep links, CLI publish), and mitigations.
- Pen-test style checks against local Supabase: enumerate sessions by id, replay submit, alter case_version, unlock by guessing placeholder ids, oversized boards, a flood of guest tokens, a JWT with role tampering, and calling REST endpoints directly with the anon key against every table.
Beta is blocked until the audit has zero open critical or high findings.
```

**After P4:** run **R4 (P4)**, then a private beta of about 50 players.

---

# Phase 5 — Living city

### WP-50 — Daily case

```text
Follow AGENTS.md. Task: WP-50 in PLAN.md.
- A scheduled function (Supabase cron / pg_cron) that fills daily_cases 14 days ahead from a curated pool (status=published, tag daily_eligible, not used in the last 90 days).
- GET /daily returns ONLY today's (UTC) case. Future daily cases are not readable by clients (RLS + route check). Add a test.
- Home daily card + streak display (consecutive days; missing a day never removes XP or unlocks).
Finish with the Definition of done report.
```

### WP-51 — Conspiracy graph backend

```text
Follow AGENTS.md. Task: WP-51 in PLAN.md.
- packages/content/conspiracy/{nodes,edges}.json with Zod schemas; each edge has revealedBy {caseId, clueId}.
- Tables conspiracy_nodes, conspiracy_edges, player_graph_reveals. Clients can read nodes and edges ONLY through a route that joins on the player's reveals. No direct table read of unrevealed edges.
- Submit (WP-42 route) grants reveals for edges whose revealedBy case was just solved correctly, plus "leads" from conspiracyHooks.
- `lastlie publish` also publishes the graph and enforces V12.
Tests: an unrevealed node name never appears in any response for a fresh user.
Finish with the Definition of done report.
```

### WP-52 — Conspiracy map UI

```text
Follow AGENTS.md. Task: WP-52 in PLAN.md. Owns: apps/mobile/src/features/progress/map/**.
A Skia-drawn graph of revealed nodes and edges (simple force layout computed once and cached), pan/zoom, tap → dossier. Unrevealed neighbours show as "?" nodes with no name. Readable with 50+ nodes at 60fps. Include an accessible list view alternative.
Finish with the Definition of done report.
```

### WP-53 — Canonical chapter 1

```text
Follow AGENTS.md and docs/content-style-guide.md. Task: WP-53 in PLAN.md.
First write docs/story/chapter-01.md: chapter premise, how The Quiet is introduced, which graph edges each case reveals, and recurring characters (reuse 2+ characters from authored cases). Then author 3–5 canonical cases (kind='canonical') plus graph content. All must be validator-clean. Each gets an R6 review.
Finish with the Definition of done report.
```

### WP-54 — Push notifications

```text
Follow AGENTS.md. Task: WP-54 in PLAN.md.
Expo Notifications + Expo Push service. Opt-in only (ask after the player finishes their 2nd case, never on first launch). Store push tokens in a table with RLS (own rows). A daily reminder at the player's local time window. One-tap opt-out in Profile. Notification text never contains spoilers.
Finish with the Definition of done report.
```

### WP-55 — Weekly community case

```text
Follow AGENTS.md. Task: WP-55 in PLAN.md.
A weekly case with an open/close window. Only the first attempt counts. Leaderboard = score then submit time, excluding results flagged 'too_fast'. Aggregate theory distribution is hidden until the window closes (server-enforced). Add a Challenges-tab section and tests for window enforcement and first-attempt-only scoring.
Finish with the Definition of done report.
```

**After P5:** run **R3 (P5)** and **R4 (P5)**, then a limited public launch.
