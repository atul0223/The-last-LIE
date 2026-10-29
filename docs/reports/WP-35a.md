# WP-35a Report: Authoring CLI Core

> **Author**: Agent 3 (Lane T/E)  
> **Branch**: `wp/35a-cli-core`  
> **Status**: READY

---

## 1. Summary

- **Command Architecture**: Implemented extensible command registry in `tools/cli/src/commands.ts` with subcommands structured in isolated subdirectories (`validate`, `render`, `playtest`, `publish`, and `generate` stub).
- **Validation Command**: `pnpm lastlie validate <glob...>` searches matching case definition JSON files, invokes `@lastlie/case-engine`'s `validateCase` and `formatReport`, and exits with non-zero status code upon validation errors.
- **Render Command**: `pnpm lastlie render <file> [--public]` renders full author dossier (with ground truth, culprit, timeline, assertions) or player-safe initial public briefing/clue dossier (`toPublicCase`) in clean Markdown.
- **Playtest Command**: `pnpm lastlie playtest <file>` enables interactive terminal playtesting simulating gameplay mechanics (`list`, `unlock`, `link`, `theory`, `submit`, `reveal`) while preserving placeholder ID mapping (`locked_1` -> real clue id).
- **Security & Path Sandboxing**: Hardened path resolution (`assertSafePath`) preventing writes outside `--out` and rejecting directory traversal / symlink escapes outside repository boundary.
- **Deps & Scripts**: Registered `pnpm lastlie` script via `tsx` for universal cross-platform TypeScript execution without build steps.

---

## 2. Acceptance Checklist

| Criteria | Status | Evidence |
|---|---|---|
| Command registry (`tools/cli/src/commands.ts`) | ✅ | Commands registered modularly; each in its own directory |
| `validate <glob...>` exits non-zero on errors | ✅ | `cli.test.ts` asserts non-zero exit code on invalid cases, prints `formatReport` |
| `render <file> [--public]` output formatting | ✅ | `cli.test.ts` verifies full author markdown vs redacted public markdown |
| `render --public` zero-leak guarantee | ✅ | Verified `culpritId`, `asserts`, and locked text never leak in public mode |
| `playtest <file>` interactive terminal play | ✅ | Complete REPL playtest lifecycle tested: unlock, board link, theory submission, score reveal |
| `publish` stub | ✅ | Outputs `"not implemented until WP-42"` |
| `generate` stub | ✅ | Outputs `"generate: available after WP-31"` |
| Path safety & symlink containment | ✅ | `assertSafePath` prevents escaping repo root or writing outside designated directories |
| Integration tests against temp dirs | ✅ | `tools/cli/tests/cli.test.ts` covers validate, render, playtest, and symlink security |

---

## 3. Files Changed

From `git diff --name-only main...HEAD`:
- `package.json` (added root `lastlie` script)
- `pnpm-lock.yaml`
- `tools/cli/package.json` (added `commander`, `tsx`)
- `tools/cli/src/bin.ts`
- `tools/cli/src/commands.ts`
- `tools/cli/src/generate/index.ts`
- `tools/cli/src/index.ts`
- `tools/cli/src/playtest/index.ts`
- `tools/cli/src/publish/index.ts`
- `tools/cli/src/render/index.ts`
- `tools/cli/src/utils/glob.ts`
- `tools/cli/src/utils/security.ts`
- `tools/cli/src/validate/index.ts`
- `tools/cli/tests/cli.test.ts`
- `docs/reports/WP-35a.md`

All files are strictly within Owns scope (`tools/cli/**`, root `package.json` dep commit, `docs/reports/WP-35a.md`).

---

## 4. Decisions Made

1. **CLI Execution Engine**: `node --experimental-strip-types` does not resolve extensionless or `.js`-specified TypeScript module imports in workspace ESM packages without custom loaders. Bundled `tsx` inside `tools/cli` to provide stable, zero-transpile execution for `pnpm lastlie`.
2. **REPL Placeholder Preservation**: During terminal playtesting, initial placeholder IDs (e.g. `locked_1`) are remembered in a session map so players can refer to clue placeholders displayed in the terminal when executing `unlock` or `link` commands.

---

## 5. Requests for Integrator / Other Agents

- **Request for Agent 1 (Integrator)**: Add `pnpm lastlie validate "packages/content/cases/**"` to `.github/workflows/ci.yml` PR validation pipeline (as workflow files are owned by Integrator).

---

## 6. Definition of Done Verification

- `pnpm -r typecheck`: PASS (5/5 packages)
- `pnpm -r lint`: PASS (5/5 packages)
- `pnpm -r test`: PASS (35 test files, 339 tests passed)
- Zero any / @ts-ignore without explanation
- Path safety verified with symlink test

---

## 7. Branch & Worktree Path

- **Branch**: `wp/35a-cli-core`
- **Worktree**: `C:\Users\user\Documents\lastlie-wt\wp-35a`
