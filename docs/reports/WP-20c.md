# Definition of Done Report: WP-20c

## Summary
- **Authored `case_0004.json`**: Implemented mystery `case_0004` ("The Midnight Edition"), mysteryType `forged_message`, difficulty 3, setting The Vesper Chronicle Newsroom (`loc_newsroom`) and North Gate Lithograph & Print Shop (`loc_printshop`).
- **Cast (Q–Z)**: Quinn Harper (`char_quinn`), Roland Finch (`char_roland`), Silas Thorne (`char_silas`), and Toby Crane (`char_toby`).
- **Decisive Contradiction (`state.value`)**: Avoided `message` facts pending NEXT-2 contract task. Decisive contradiction is established via `state.value`: Toby Crane claimed `obj_rotary_press.status` was `'approved_original'` at 23:15, while optical sensor telemetry recorded `'forged_altered'` at 23:15.
- **Fair-Play & Positive Culprit Evidence (V14 & V15)**: Toby's declared lie is contradicted by obtainable physical clue `clue_press_optical_sensor`, and the key evidence set contains physical clue `clue_composing_cctv` positively placing culprit `char_toby` at the rotary press.
- **Walkthrough & Tests**: Complete walkthrough written in `docs/cases/case_0004-walkthrough.md` and 14 tests in `packages/content/tests/case_0004.test.ts`.

## Acceptance Checklist
- [x] `CaseDefinitionSchema.parse` passes without error.
- [x] `validateCase(parsedCase)` yields zero errors and zero warnings.
- [x] Measured difficulty (`3`) matches target difficulty `3` (`delta = 0`).
- [x] `toPublicCase` deep scan passes with zero leaks.
- [x] `survivingHypotheses` with all obtainable clues yields only the solution hypothesis (`hyp_toby_forged`).
- [x] The `state.value` contradiction actually fires for the key link between Toby's statement and the optical sensor.
- [x] Each decoy is eliminated by a distinct physical clue (`access.presence` and `possess.exclusive`).
- [x] Clue distribution: 8 clues (5 default >= 3, 3 after_clue >= 2, 1 red herring).
- [x] No `message` facts used.
- [x] Only owned files modified (`case_0004.json`, `case_0004-walkthrough.md`, `case_0004.test.ts`, `docs/reports/WP-20c.md`).

## Verification Outputs
- `pnpm -r typecheck`: PASS (0 errors across 5 workspace projects)
- `pnpm -r lint`: PASS (0 errors across 5 workspace projects)
- `pnpm -r test`: PASS (250 tests passed across workspace)

## Files Changed
- `docs/cases/case_0004-walkthrough.md`
- `packages/content/cases/authored/case_0004.json`
- `packages/content/tests/case_0004.test.ts`
- `docs/reports/WP-20c.md`

## Decisions Made
- Used `state.value` on `obj_rotary_press.status` between `clue_toby_testimony` and `clue_press_optical_sensor` as instructed when NEXT-2 is pending.
- Configured 10-minute transit adjacency between `loc_newsroom` and `loc_printshop` so that travel metrics combined with 3 key clues and 2 non-default clues yield exactly difficulty 3.

## Requests & Risks
- None. Ready for merge.
