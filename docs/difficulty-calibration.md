# Difficulty Calibration Report (WP-36)

> **Status**: Pending Human Playtest (Cohorts WP-25)  
> **Source Code**: `packages/case-engine/src/validator/config.ts`  
> **Tooling**: `lastlie report --calibrate`  

---

## 1. Overview & Mathematical Model

The case engine measures case difficulty deterministically using `computeDifficultyMetrics(def: CaseDefinition)`. The metric computes a linear combination of five structural complexity components:

$$\text{rawScore} = \sum_{i=1}^{5} w_i x_i$$

Where:
- $x_1$: `smallestKeyEvidenceSize` — Minimal number of clues required to uniquely identify the solution.
- $x_2$: `nonDefaultKeyCluesCount` — Number of non-default clues (e.g. `after_clue`, `request`, `contradiction`) in that minimal set.
- $x_3$: `redHerringsCount` — Number of distractors / red-herring clues present.
- $x_4$: `hypothesesCount` — Total number of plausible hypotheses presented.
- $x_5$: `needsTravelTime` — Boolean flag indicating whether spatial-temporal transit calculations are required.

The raw score is mapped into integer difficulty bands (1 to 4) per SYSTEM_DESIGN §4.3:
- Difficulty 1: $0.0 \le \text{rawScore} < 10.0$
- Difficulty 2: $10.0 \le \text{rawScore} < 15.0$
- Difficulty 3: $15.0 \le \text{rawScore} < 18.5$
- Difficulty 4: $\text{rawScore} \ge 18.5$

---

## 2. Baseline DIFFICULTY_WEIGHTS

The current production weights defined in `packages/case-engine/src/validator/config.ts` are:

| Component Metric | Current Weight ($w_i$) | Rationale |
|---|---|---|
| `smallestKeyEvidenceSize` | `2.0` | Base deduction complexity; each required link compounds cognitive load. |
| `nonDefaultKeyClues` | `1.5` | Penalty for evidence gating requiring investigative sequencing. |
| `redHerrings` | `1.0` | Cognitive noise and false lead filter overhead. |
| `hypotheses` | `1.0` | Search space breadth during theory elimination. |
| `needsTravelTime` | `3.0` | High-order temporal reasoning requiring route graph evaluation. |

---

## 3. Calibration Fit Against Playtest Data

The calibration CLI (`lastlie report --calibrate`) automatically parses all `docs/playtest/results-*.md` participant logs (recording participant ID, case ID, solve time, and score).

### Current Calibration Run (Reference Fixture)

Because real human playtesting cohorts are pending execution in Phase 2/3, the calibration tool was evaluated against a standard 10-observation reference baseline covering authored cases `case_0001` through `case_0004`:

```text
================================================================
 DIFFICULTY CALIBRATION REPORT
 Samples: 10 observations | Real data: NO (Fixture)
 Note: Pending human playtest (WP-25 cohorts). Evaluated against reference fixture. DIFFICULTY_WEIGHTS left unchanged.
================================================================

WEIGHT COMPARISON (Current vs Proposed Fit):
----------------------------------------------------------------
Component                     Current Weight   Proposed Weight
----------------------------------------------------------------
smallestKeyEvidenceSize        2.00             3.10
nonDefaultKeyClues             1.50             0.00
redHerrings                    1.00             0.00
hypotheses                     1.00             0.00
needsTravelTime                3.00             4.30
----------------------------------------------------------------
ACTION: DIFFICULTY_WEIGHTS left unchanged (pending human playtest).
================================================================
```

---

## 4. Policy Decision

In strict accordance with the standing rules for WP-36:
- **`DIFFICULTY_WEIGHTS` remains unmodified.**
- Real human playtest times from external participants (WP-25) will be collected in `docs/playtest/results-p2.md`.
- Once empirical solve time distributions and dropout rates are logged, an integrator-supervised tuning pass will update `DIFFICULTY_WEIGHTS`.
