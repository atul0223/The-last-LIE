# Definition of Done Report: WP-20a

## Summary
- **Fair-Play Fix (V14)**: Added `clue_courier_access_log` recording Daniel Holt scanning his badge at the North Dock turnstile reader at 20:18. This directly refutes his false alibi (`clue_daniel_testimony`) claiming he was in the exhibition hall from 20:15 to 20:30 via `access.presence`.
- **Culprit Positive Evidence (V15)**: Added `clue_courier_access_log` to `truth.keyEvidence`, providing positive physical evidence placing culprit `char_daniel` at the scene of the theft.
- **Documentation & Tests**: Updated `docs/cases/case_0002-walkthrough.md` and added test cases in `packages/content/tests/case_0002.test.ts` verifying V14 and V15 compliance.

## Acceptance Checklist
- [x] `CaseDefinitionSchema.parse` passes without error.
- [x] `validateCase(parsedCase)` yields 0 errors.
- [x] Measured difficulty is within $\pm 1$ of 1 (`measuredDifficulty = 2`).
- [x] `toPublicCase` deep scan passes with zero leaks.
- [x] `survivingHypotheses` with all obtainable clues yields only `hyp_daniel_stole`.
- [x] `clue_courier_access_log` contradicts `clue_daniel_testimony` via `access.presence`.
- [x] Key evidence contains physical clue with culprit ID (`char_daniel`).
- [x] Only owned files modified (`case_0002.json`, `case_0002-walkthrough.md`, `case_0002.test.ts`, `docs/reports/WP-20a.md`).

## Verification Outputs
- `pnpm -r typecheck`: PASS (0 errors across 5 workspace projects)
- `pnpm -r lint`: PASS (0 errors across 5 workspace projects)
- `pnpm -r test`: PASS (151 tests passed)

## Files Changed
- `docs/cases/case_0002-walkthrough.md`
- `packages/content/cases/authored/case_0002.json`
- `packages/content/tests/case_0002.test.ts`
- `docs/reports/WP-20a.md`

## Decisions Made
- Added `clue_courier_access_log` as an `after_clue` unlock following `clue_daniel_testimony`, matching the rhythm where suspect testimonies lead to checking reader logs.
- Expanded key evidence set to include `clue_courier_access_log` so positive physical evidence of the culprit is mandatory to complete the case.

## Requests & Risks
- None. Ready for merge.
