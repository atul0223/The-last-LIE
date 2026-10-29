# Definition of Done Report: WP-35a (Authoring CLI: validate, render, playtest)

## Summary
- Implemented core authoring CLI commands for `lastlie` in `tools/cli` using Commander:
  - `lastlie validate <files...>`: Validates authored and generated case JSONs against engine validator (`validateCase`), formatting results with exit code 0 on clean validation and 1 on errors.
  - `lastlie render <file>`: Renders case definition into Markdown formatted mystery document containing briefing, suspect dossiers, facts, and clue prose via `@lastlie/case-engine`.
  - `lastlie playtest <file>`: Interactive terminal detective playtest interface powered by Node `readline`. Features clue exploration, progressive unlock graph, evidence board linking (`link <idA> <idB>`), hypothesis selection (`theory <hypId>`), submission scoring, and full reveal breakdown.
- Installed `commander` and `tsx` for direct CLI execution (`pnpm lastlie`).
- Added strict CLI output security scanner (`deepScan`) verifying that terminal rendering and pre-submission playtest views never leak forbidden keys (`truth`, `claims`, `culpritIds`, `asserts`, `keyEvidence`, `liars`, `seed`, `conspiracyHooks`).
- Verified all CLI subcommands via unit & integration tests in `tools/cli/tests/cli.test.ts`.

## Acceptance Checklist
- [x] **Validate command:** Discovers and validates case files, printing colorized pass/fail reports with error counters and check IDs.
- [x] **Render command:** Outputs clean Markdown document with story setting, suspects, facts, and clue texts.
- [x] **Playtest command:** Interactive session supporting `help`, `clues`, `unlock`, `board`, `link`, `unlink`, `hypotheses`, `theory`, and `submit`.
- [x] **Security & Zero Leaks:** Redacts locked clues and strips ground-truth metadata from the player terminal before submission.
- [x] **CLI Tests:** Automated test suite in `tools/cli/tests/cli.test.ts` covering argument parsing, validation failure reporting, markdown generation, and simulated interactive playtesting.
- [x] **Test suite & CI:** `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` pass clean across all workspace packages.

## Files Changed
- `tools/cli/package.json` (added `commander`, `tsx`)
- `package.json` (added root `lastlie` script)
- `pnpm-lock.yaml`
- `tools/cli/src/bin.ts` (CLI executable entrypoint)
- `tools/cli/src/commands.ts` (Commander command definitions)
- `tools/cli/src/index.ts` (library exports)
- `tools/cli/src/validate/index.ts` (validation logic & reporter)
- `tools/cli/src/render/index.ts` (markdown prose rendering)
- `tools/cli/src/playtest/index.ts` (interactive terminal playtest)
- `tools/cli/src/utils/glob.ts` (cross-platform file expansion)
- `tools/cli/src/utils/security.ts` (CLI deep-scan verification)
- `tools/cli/tests/cli.test.ts` (test suite)
- `docs/reports/WP-35a.md` (created)

## Decisions Made
- **Interactive Playtest UI**: Emulated standard shell REPL using Node's native `readline/promises`, allowing terminal playtesting on Windows, macOS, and Linux without native TUI dependencies.
- **Direct Workspace Script**: Registered `"lastlie": "tsx tools/cli/src/bin.ts"` in root `package.json` to allow convenient execution via `pnpm lastlie <cmd>` across any workspace package.

## Requests
- None.

## Risks / Follow-ups
- WP-35b will build `lastlie generate` command in `tools/cli/src/generate/**`.

## Branch & Worktree
- **Branch:** `wp/35a-cli-core`
- **Worktree:** `C:\Users\user\Documents\lastlie-wt\wp-35a`
