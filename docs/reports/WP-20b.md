# Definition of Done Report: WP-20b

## Summary
- **Authored `case_0003.json`**: Implemented mystery `case_0003` ("The Man from Platform 4"), mysteryType `hidden_identity`, difficulty 2, setting Vesper Central Station (`loc_station`) and The Grand Vesper Hotel (`loc_hotel`) with a 15-minute inter-district travel time.
- **Cast (I–P)**: Irene Frost (`char_irene`), Julian Croft (`char_julian`), Kendra Pike (`char_kendra`), and Lucas Mercer (`char_lucas`).
- **Decisive Contradiction (`presence.travel`)**: Lucas Mercer's alibi claims he was in the hotel lobby until 21:40, but station CCTV places him on Platform 4 at 21:45. The 5-minute gap cannot cover the 15-minute travel time, firing `presence.travel`.
- **Fair-Play & Positive Culprit Evidence (V14 & V15)**: Lucas's declared lie is contradicted by obtainable physical clue `clue_station_cctv`, and the key evidence set contains physical evidence positively identifying culprit `char_lucas`.
- **Walkthrough & Tests**: Authored complete walkthrough in `docs/cases/case_0003-walkthrough.md` and 14 tests in `packages/content/tests/case_0003.test.ts`.

## Acceptance Checklist
- [x] `CaseDefinitionSchema.parse` passes without error.
- [x] `validateCase(parsedCase)` yields zero errors and zero warnings.
- [x] Measured difficulty (`3`) is within $\pm 1$ of target difficulty `2`.
- [x] `toPublicCase` deep scan passes with zero forbidden key, internal tag, or locked text leaks.
- [x] `survivingHypotheses` with all obtainable clues yields only the solution hypothesis (`hyp_lucas_operative`).
- [x] The `presence.travel` contradiction actually fires for the key link between Lucas's testimony and the station CCTV.
- [x] Each decoy is eliminated by a distinct physical clue (`access.presence` and `possess.exclusive`).
- [x] Clue distribution: 8 clues (5 default >= 3, 3 after_clue >= 2, 1 red herring).
- [x] Only owned files modified (`case_0003.json`, `case_0003-walkthrough.md`, `case_0003.test.ts`, `docs/reports/WP-20b.md`).

## Verification Outputs
- `pnpm -r typecheck`: PASS (0 errors across 5 workspace projects)
- `pnpm -r lint`: PASS (0 errors across 5 workspace projects)
- `pnpm -r test`: PASS (237 tests passed)

## Files Changed
- `docs/cases/case_0003-walkthrough.md`
- `packages/content/cases/authored/case_0003.json`
- `packages/content/tests/case_0003.test.ts`
- `docs/reports/WP-20b.md`

## Decisions Made
- Used `loc_station` and `loc_hotel` with mutual 15-minute travel adjacency.
- Structured Lucas's lie so that the link between his testimony and station platform CCTV directly produces `presence.travel`.
- Used `access.presence` to eliminate Decoy 1 (Irene Frost in hotel suite lock records) and `possess.exclusive` to eliminate Decoy 2 (Irene holding safe custody of the ledger).

## Requests & Risks
- None. Ready for merge.
