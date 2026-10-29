# Definition of Done Report: WP-35b (Authoring CLI: generate)

## Summary
- Implemented `lastlie generate` command in `tools/cli/src/generate/index.ts` allowing batch procedural mystery generation via Commander.
- Supports template resolution across all registered engine templates (`tpl_false_alibi_v1`, `tpl_missing_item_v1`, `tpl_forged_message_v1`, `tpl_toy_two_rooms`).
- Configurable parameters:
  - `--template <id>`: Target template ID.
  - `--count <n>`: Number of distinct cases to generate.
  - `--difficulty <d>`: Difficulty level 1–4.
  - `--seed <s>`: Base PRNG seed (auto-increments across generated batches).
  - `--out <dir>`: Target output directory.
- Enforces strict validation: Every generated case must pass `validateCase` with 0 errors and measured difficulty matching target difficulty within $\pm 1$.
- Produces individual JSON files formatted per schema and outputs a consolidated `manifest.json` cataloging case IDs, seeds, generation attempts, and measured metrics.
- Added comprehensive unit and integration tests in `tools/cli/tests/generate.test.ts`.

## Acceptance Checklist
- [x] **CLI generate command:** Generates cases with specified template, count, difficulty, and seed.
- [x] **Validator integration:** Rejects invalid cases and asserts 0 validator errors before saving.
- [x] **Manifest generation:** Creates `manifest.json` indexing all generated files with metadata.
- [x] **Safety & Sanitization:** Enforces path boundaries via `assertSafePath` to prevent directory traversal outside workspace boundaries.
- [x] **CLI Tests:** Automated tests covering batch generation, invalid template handling, custom output paths, and manifest integrity.
- [x] **Test suite & CI:** `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test` pass clean across all workspace packages.

## Files Changed
- `tools/cli/src/generate/index.ts` (implemented batch generation logic)
- `tools/cli/tests/generate.test.ts` (created)
- `docs/reports/WP-35b.md` (created)

## Decisions Made
- **Dynamic Template Discovery**: Dynamically resolves all registered templates from `@lastlie/case-engine`, allowing new templates to immediately become available via CLI without modifying `tools/cli`.
- **Manifest Catalog**: Generated batches include a `manifest.json` describing each generated case's ID, file path, seed, attempts, and measured difficulty.

## Requests
- None.

## Risks / Follow-ups
- Ready to execute batch generation for Phase 3 content pack (Item (d)).

## Branch & Worktree
- **Branch:** `wp/35b-cli-generate`
- **Worktree:** `C:\Users\user\Documents\lastlie-wt\wp-35b`
