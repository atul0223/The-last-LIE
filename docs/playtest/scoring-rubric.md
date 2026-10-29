# Scoring Rubric & Printable Scorecards

This document defines the mathematical scoring model from SYSTEM_DESIGN §7 and provides a printable evaluation scorecard for playtesters and tournament facilitators.

---

## 1. Engine Scoring Formula (SYSTEM_DESIGN §7.2)

The total score $S \in [0, 100]$ for any case submission is computed by:

$$S = \min\left(100, \max\left(0, \left(P_{\text{hyp}} + P_{\text{ev}} + P_{\text{contra}} - P_{\text{penalties}}\right) \times M_{\text{hints}}\right)\right)$$

### Components Breakdown:
1. **Hypothesis Accuracy ($P_{\text{hyp}} \in \{0, 50\}$)**:
   - Correct culprit & core hypothesis: **50 points**.
   - Incorrect hypothesis: **0 points**.

2. **Key Evidence Inclusion ($P_{\text{ev}} \in [0, 25]$)**:
   - Let $K$ be the set of minimal necessary key evidence clues.
   - For each valid key clue included in player's supporting evidence:
     $$P_{\text{ev}} = 25 \times \frac{|\text{supportingClues} \cap K|}{|K|}$$

3. **Decisive Contradictions ($P_{\text{contra}} \in [0, 25]$)**:
   - For each valid pair of contradictory facts identified by the player matching an active engine contradiction rule:
     $$P_{\text{contra}} = \min(25, 12.5 \times N_{\text{valid\_contra}})$$

4. **Penalties ($P_{\text{penalties}}$)**:
   - Spurious / irrelevant clues attached: **-5 points** per spurious clue.
   - False contradiction claim (non-contradictory pair): **-10 points** each.

5. **Hint Multiplier ($M_{\text{hints}} \in [0.5, 1.0]$)**:
   - Unlocked 0 optional hints/requests: **1.0×** (Full score).
   - Unlocked 1 optional hint: **0.85×**.
   - Unlocked 2 optional hints: **0.70×**.
   - Unlocked 3+ optional hints: **0.50×**.

---

## 2. Printable Player Scorecard

```text
================================================================================
                           THE LAST LIE · CASE SCORECARD
================================================================================
Case ID: _________________________       Tester / Detective: ___________________
Case Title: ______________________       Start Time: _________ End: ____________

[ ] HYPOTHESIS SELECTION
    Selected: __________________________________________________________________
    Status:   [ ] Correct (+50 pts)          [ ] Incorrect (+0 pts)     Subtotal: [   ]

[ ] KEY EVIDENCE CITED
    Clue 1: __________________________________   [ ] Valid (+12.5 pts)
    Clue 2: __________________________________   [ ] Valid (+12.5 pts)
    Irrelevant Clues: _____ × (-5 pts)                                  Subtotal: [   ]

[ ] CONTRADICTION PAIRS
    Pair A: __________________ vs __________________   [ ] Valid (+12.5 pts)
    Pair B: __________________ vs __________________   [ ] Valid (+12.5 pts)
    False Claims:     _____ × (-10 pts)                                 Subtotal: [   ]

[ ] MULTIPLIER (Optional Hints Used)
    Hints Used: [ ] 0 (1.0x)   [ ] 1 (0.85x)   [ ] 2 (0.70x)   [ ] 3+ (0.50x)

--------------------------------------------------------------------------------
FINAL CASE SCORE: [      / 100 ]            XP EARNED: [       XP ]
RATING:
[ ] Master Detective (90–100)    [ ] Senior Investigator (75–89)
[ ] Junior Inspector (50–74)     [ ] Cold Case / Acquitted (<50)
================================================================================
```
