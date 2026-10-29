# WP-35b Report: Authoring CLI Generate

> **Author**: Agent 3 (Lane T/E)  
> **Branch**: `wp/35b-cli-generate` (STACKED ON `wp/35a-cli-core`)  
> **Status**: READY

---

## 1. Summary

- **Procedural Case Generation**: Implemented `lastlie generate --template <id> --count N --difficulty D [--seed S] --out <dir>` in `tools/cli/src/generate/index.ts`.
- **Dynamic Template Discovery**: Dynamically resolves registered templates from `@lastlie/case-engine` (`BUILTIN_TEMPLATES` plus any exported `CaseTemplate` objects), supporting both canonical IDs (`tpl_toy_two_rooms`, `tpl_false_alibi_v1`, `tpl_missing_item_v1`) and user-friendly aliases (`toy`, `false_alibi`, `missing_item`, etc.).
- **Deterministic Batch Generation**: Generates deterministic cases using seeded RNG forks; auto-increments seeds `(S, S+1, ...)` for batch generation.
- **Output Artifacts**: Writes individual `<case_id>.json` CaseDefinition files and an aggregated `summary.json` containing generation metadata: `seed`, `attempts`, `measuredDifficulty`, `fingerprint` (when available via WP-36), and detailed case entries.
- **Path Sandboxing & Security**: Rigorously guards `--out <dir>` and target filenames via `assertSafePath` and directory traversal checks to prevent writing outside designated output directories or escaping the repository.
- **Integration Tests**: Added `tools/cli/tests/generate.test.ts` verifying single and multi-case generation, template alias resolution, validation failure handling, and path security.

---

## 2. Acceptance Checklist

| Criteria | Status | Evidence |
|---|---|---|
| `lastlie generate --template <id> --count N --difficulty D [--seed S] --out <dir>` | ✅ | Verified CLI options and execution via Commander and `runGenerate` |
| Writes CaseDefinition JSON | ✅ | Each generated case written as `<case_id>.json` matching schema and passing `validateCase` |
| Writes `summary.json` (seed, attempts, measured difficulty, fingerprint if available) | ✅ | `summary.json` records `seed`, `attempts`, `measuredDifficulty`, and `fingerprint` (hooked for WP-36) |
| Works with toy template (`tpl_toy_two_rooms` / `toy`) | ✅ | Verified in `generate.test.ts` and CLI manual test |
| Works with real templates as merged (`false_alibi`, `missing_item`) | ✅ | Verified in `generate.test.ts` via dynamic registry lookup |
| Dynamic template lookup without hard-coding | ✅ | Implemented `getTemplateRegistry` inspecting `@lastlie/case-engine` exports |
| Security: never write outside `--out`, no escaping repo | ✅ | Tested in `generate.test.ts` asserting `SecurityError` on traversal attempts |
| Integration tests against temporary dirs | ✅ | `tools/cli/tests/generate.test.ts` (8 passed) |

---

## 3. Files Changed

From `git diff --name-only main...HEAD`:
- `tools/cli/src/generate/index.ts`
- `tools/cli/tests/generate.test.ts`
- `docs/reports/WP-35b.md`
*(Note: branch is stacked on `wp/35a-cli-core`)*

---

## 4. Decisions Made

1. **Flexible Template Lookup**: Created `getTemplateRegistry` that dynamically inspects all templates from `@lastlie/case-engine` and provides normalized aliases (stripping `tpl_` prefix and `_v1` suffix). This allows users to invoke `--template false_alibi` or `--template tpl_false_alibi_v1` interchangeably.
2. **Dual-level Summary Schema**: `summary.json` provides both top-level metadata (`seed`, `attempts`, `measuredDifficulty`, `fingerprint`) for single-case checks and a `cases` array with per-case details for multi-case runs.
3. **Optional Fingerprint Hook**: Dynamically detects `fingerprint(def)` from `@lastlie/case-engine` so that as soon as WP-36 implements and exports it, `generate` will populate fingerprints without code changes.

---

## 5. Requests for Integrator / Other Agents

- None.

---

## 6. Definition of Done Verification

- `pnpm -r typecheck`: PASS (5/5 packages)
- `pnpm -r lint`: PASS (5/5 packages)
- `pnpm -r test`: PASS (38 test files, 357 tests passed)
- Zero `any` / `@ts-ignore`

---

## 7. Branch & Worktree Path

- **Branch**: `wp/35b-cli-generate` (STACKED ON `wp/35a-cli-core`)
- **Worktree**: `C:\Users\user\Documents\lastlie-wt\wp-35b`
