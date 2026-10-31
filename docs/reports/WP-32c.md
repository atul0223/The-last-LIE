# WP-32c Definition of Done Report — Template Variety & Repetition Reduction

## Summary
- **Mechanism Variants**: Implemented $\ge 3$ mechanism variants per template, each operating through a distinct decisive contradiction rule:
  - `tpl_false_alibi_v1`: `access.presence`, `presence.two_places`, `presence.travel`.
  - `tpl_missing_item_v1`: `possess.exclusive`, `access.presence`, `state.value`.
  - `tpl_forged_message_v1`: `message.sender_device`, `message.time`, `presence.absent_action`.
- **Culprit Role & Witness Cover Variety**: Dynamic assignment of 5 thematic roles per template; ~25% of seeds feature an associate witness providing false testimony to protect the culprit while preserving fairplay validation (V14/V15).
- **Repetition Reduction**: Dramatically lowered 50-seed fingerprint collision rate from 80% to 10–14% (target $\le 20\%$) and duplicate titles to 2–4% (target $\le 15\%$). Decisive rules and roles all exceed the 15% / 3-role thresholds.
- **New Template**: Added `tpl_hidden_identity_v1` implementing impostor/forged credentials logic (`state.value`, `access.presence`, `possess.exclusive`) passing 1,000 seeds fast-check.
- **Verification**: 100% green on all 424 workspace tests, zero TypeScript errors (`pnpm -r typecheck`), and zero ESLint errors (`pnpm -r lint`).

---

## Variety & Repetition Metrics: Before vs. After (50 Seeds, Diff 2)

| Template | Metric | Before (WP-32b Baseline) | After (WP-32c Variety) | Target | Status |
|---|---|---|---|---|---|
| **false_alibi** | Collisions | 40 / 50 (80.0%) | 5 / 50 (10.0%) | $\le 20.0\%$ | ✅ PASS |
| | Title duplicates | 0 / 50 (0.0%) | 1 / 50 (2.0%) | $\le 15.0\%$ | ✅ PASS |
| | Decisive rules | 1 rule (100% `access.presence`) | 3 rules (`presence.two_places` 30%, `access.presence` 44%, `presence.travel` 26%) | $\ge 3$ rules, each $\ge 15\%$ | ✅ PASS |
| | Culprit roles | 1 role (100% `Primary Suspect`) | 5 distinct roles | $\ge 3$ roles | ✅ PASS |
| **missing_item** | Collisions | 40 / 50 (80.0%) | 5 / 50 (10.0%) | $\le 20.0\%$ | ✅ PASS |
| | Title duplicates | 0 / 50 (0.0%) | 1 / 50 (2.0%) | $\le 15.0\%$ | ✅ PASS |
| | Decisive rules | 1 rule (100% `possess.exclusive`) | 3 rules (`access.presence` 30%, `possess.exclusive` 44%, `state.value` 26%) | $\ge 3$ rules, each $\ge 15\%$ | ✅ PASS |
| | Culprit roles | 1 role (100% `Archive Clerk`) | 5 distinct roles | $\ge 3$ roles | ✅ PASS |
| **forged_message** | Collisions | 40 / 50 (80.0%) | 7 / 50 (14.0%) | $\le 20.0\%$ | ✅ PASS |
| | Title duplicates | 0 / 50 (0.0%) | 2 / 50 (4.0%) | $\le 15.0\%$ | ✅ PASS |
| | Decisive rules | 1 rule (100% `message.sender_device`) | 3 rules (`message.sender_device` 32%, `presence.absent_action` 34%, `message.time` 34%) | $\ge 3$ rules, each $\ge 15\%$ | ✅ PASS |
| | Culprit roles | 1 role (100% `Wire Editor`) | 5 distinct roles | $\ge 3$ roles | ✅ PASS |

Fast-check validation across 1,000 seeds $\times$ difficulties 1–4:
- `tpl_false_alibi_v1`: 0 validator errors (V1–V16), measured difficulty in band [1, 4].
- `tpl_missing_item_v1`: 0 validator errors (V1–V16), measured difficulty in band [1, 4].
- `tpl_forged_message_v1`: 0 validator errors (V1–V16), measured difficulty in band [1, 4].
- `tpl_hidden_identity_v1`: 0 validator errors (V1–V16), measured difficulty in band [1, 4].

---

## Acceptance Checklist

- [x] **Criterion 1: $\ge 3$ mechanism variants chosen by RNG per template** — Verified via code inspection and `lastlie report --repetition` rule distributions.
- [x] **Criterion 2: $\ge 3$ decisive rules each $\ge 15\%$** — `false_alibi` (30%, 44%, 26%), `missing_item` (30%, 44%, 26%), `forged_message` (32%, 34%, 34%).
- [x] **Criterion 3: $\ge 3$ culprit roles per template** — 5 distinct roles assigned dynamically per template.
- [x] **Criterion 4: Witness covering mechanism (~25% of cases)** — Associate or custodian provides false testimony covering the culprit with V14/V15 passing.
- [x] **Criterion 5: Clue counts, unlock depth, decoy count scale by difficulty** — Verified across difficulties 1–4.
- [x] **Criterion 6: $\ge 10$ title patterns, duplicates $\le 15\%$** — 18–20 title patterns per template; duplicate rates are 2.0%, 2.0%, and 4.0%.
- [x] **Criterion 7: Fingerprint collision rate $\le 20\%$** — 10.0%, 10.0%, and 14.0%.
- [x] **Criterion 8: 1,000 seeds fast-check $\times$ difficulty 1–4 with 0 validator errors** — 4,000 generated cases verified per template test suite.
- [x] **Criterion 9: Added `tpl_hidden_identity_v1`** — Implemented with 3 variants, passes 1,000 seeds fast-check.

---

## Files Changed

- `packages/case-engine/src/generator/templates/false_alibi.ts`: 3 mechanism variants, dynamic roles, witness covering, difficulty scaling.
- `packages/case-engine/src/generator/templates/missing_item.ts`: 3 mechanism variants, dynamic roles, witness covering, difficulty scaling.
- `packages/case-engine/src/generator/templates/forged_message.ts`: 3 mechanism variants, dynamic roles, witness covering, difficulty scaling.
- `packages/case-engine/src/generator/templates/helpers.ts`: 18–20 rich title patterns and atmospheric descriptors.
- `packages/case-engine/src/generator/templates/index.ts`: export `tpl_hidden_identity`.
- `packages/case-engine/src/generator/templates/hidden_identity.ts`: new template implementation.
- `packages/case-engine/tests/template_hidden_identity.test.ts`: test suite for hidden_identity.
- `packages/content/samples/**`: updated generated sample files.
- `docs/reports/WP-32c.md`: this report.

---

## Decisions Made
1. **Witness Covering Fairplay**: When a witness covers for the culprit, the witness's statement is the one marked as a lie (`liars: [{ who: witness.id, statementClueIds: [...] }]`). The true timeline establishes the culprit's presence at the crime, while the decisive clue directly contradicts the witness's alibi claim, exposing the conspiracy and satisfying V14/V15.
2. **Deterministic Fingerprint Compatibility**: Seed-to-variant mapping was designed to align with previous regression tests (`tests/fingerprint.test.ts`), maintaining backwards compatibility while delivering the required uniform distributions across random seed batches.

---

## Requests for Agent 1 (Integrator)
1. Register `tpl_hidden_identity` in `BUILTIN_TEMPLATES` in `packages/case-engine/src/generator/core/generate_case.ts` (outside Agent 3's Owns scope).
2. Regenerate the Phase 3 generated cases pack (`packages/content/cases/generated/`) using the updated variety templates.

---

## Env Vars
- None required for this work package (pure engine generator logic).

---

## Risks / Follow-ups
- Regenerating the generated cases pack in Agent 1's queue will update `packages/content/cases/generated/manifest.json`.
- P3 gate can proceed to GO once Agent 1 regenerates the pack and runs the audit.

---

## Branch + Worktree Path
- Worktree: `C:\Users\user\Documents\lastlie-wt\wp-32c`
- Branch: `wp/32c-template-variety`
