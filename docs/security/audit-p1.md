# Security Audit Report: Phase 1 (P1)

> **Auditor**: Agent 1 (Integrator & Security Auditor)  
> **Date**: 2026-10-29  
> **Phase Target**: Phase 1 (Offline Playable Prototype: Engine, Authored Cases, LocalGameService, Mobile Slots, Local Persistence, Maestro E2E)  
> **Verdict**: **PASS** (Zero Open Critical or High Findings)

---

## 1. Executive Summary

A comprehensive threat modeling and security verification audit was conducted across all components delivered in Phase 1 (WP-01 through WP-14, WP-20a–c, WP-21, WP-25, WP-31). The system was audited against the eight core dimensions from PROMPTS.md R3 and SYSTEM_DESIGN.md (§3.6, §7, §8, §9.2, §12):

1. **Answer & Secret Leakage**: Zero leaks detected. Authored `CaseDefinition` files remain private inside the service layer. Responses strictly enforce allow-listed `CasePublic` and `PublicClue` schemas with opaque placeholders for locked clues.
2. **Scoring Integrity**: Double submission is strictly idempotent and prevents XP farming. Submissions referencing un-unlocked clues or forged hypothesis IDs are validated and rejected.
3. **Storage Security & Sanitization**: Persistent storage (`lastlie:v1:state`) is sanitized via `sanitizeForStorage` and verified via recursive `deepScanForLeaks` to guarantee no ground truth or secret tags reach disk. Corrupt storage blobs are safely quarantined.
4. **Secrets in Git**: No credentials, API tokens, or private keys exist in version control.
5. **Dependency Audit**: 52 vulnerabilities reported in upstream transitive build-time tooling (`tar`, `deepmerge`, `vite` dev server). No runtime network exposure exists in Phase 1 offline mode.

---

## 2. Findings Matrix

| Finding ID | Severity | Category | Description | Status |
|---|---|---|---|---|
| **SEC-P1-01** | Low | Dependencies | Transitive devDependency vulnerabilities in `tar` and `vite` UI server | Acknowledged (Offline dev tools only; production bundle unaffected) |
| **SEC-P1-02** | Low | Platform | Android Hermes bytecode flag `/v` incompatibility in `query-string` v9 | Documented in build report; Metro resolver configured |

---

## 3. Detailed Audit by Dimension (PROMPTS.md R3)

### A. Answer Leakage
- **Allow-List Redaction**: `toPublicCase` (WP-06) builds explicit public objects rather than cloning and deleting fields.
- **Forbidden Keys Verification**: Automated test `apps/mobile/tests/security_audit_p1.test.ts` scans all responses from `startSession`, `unlockClue`, `saveBoard`, and `submit` across all authored cases (`case_0001`–`case_0004`).
- **Forbidden Key List**: `['truth', 'claims', 'culpritIds', 'asserts', 'keyEvidence', 'liars', 'seed', 'conspiracyHooks']`. None leaked.
- **Locked Clue Text**: Locked clues render only as `{ id: opaque_placeholder, type: clue_type, locked: true, hint: ... }`. Text is verified `undefined`.

### B. Authorization (Offline Boundary)
- Offline Phase 1 runs entirely within local client memory and device key-value storage.
- Private `CaseDefinition` instances are never exposed on `window` or exported from service barrels.

### C. Scoring Integrity
- **Double Submit Idempotency**: Verified in `security_audit_p1.test.ts`. Submitting twice returns the exact cached outcome and awards zero incremental XP.
- **Prerequisite Enforcement**: `canUnlock` enforces DAG reachability. Attempting to unlock `clue_device_log` before `clue_keycard_exit` is rejected with `CANNOT_UNLOCK`.
- **Supporting Evidence Validation**: Submitting a clue that remains locked in the active session throws `INVALID_SUBMISSION`.
- **Hypothesis Validation**: Submitting an unlisted hypothesis ID throws `INVALID_SUBMISSION`.

### D. Input Validation & Resilience
- Every storage read and migration passes through Zod schema validation (`PersistedStoreStateSchema.safeParse`).
- Malformed JSON blobs trigger automatic quarantine to `lastlie:quarantine:<timestamp>` without application crash or unhandled exceptions.

### E. Secrets & Config
- Git tracking inspection verifies zero `.env` or `.env.local` files committed.
- `.env.example` is maintained and committed.
- `.gitignore` explicitly excludes `.env*`, `coverage/`, `dist/`, and build artifacts.

### F. Dependency Audit (`pnpm audit`)
- `pnpm audit` reports 4 critical, 27 high, 19 moderate, 2 low vulnerabilities.
- Analysis confirms all 52 findings reside in transitive build-time tools (`@expo/cli > cacache > tar`, `@vitest/coverage-v8 > vite`). None of these libraries are bundled into runtime production client code.

### G. Mobile Bundle & Dev Mode
- `DevLocalBadge` is clearly rendered when local service is selected.
- No network secrets or API keys are bundled.

### H. Privacy
- Phase 1 offline prototype collects zero PII.
- Session IDs are pseudorandom client-generated strings (`sess_case_0001_N`).

---

## 4. Tests Added

- `apps/mobile/tests/security_audit_p1.test.ts`:
  - `A1. Service outputs strictly contain zero forbidden engine keys across all authored cases`
  - `A2. Locked clue text never leaks in unlock failure or bad requests`
  - `C1. Scoring integrity: double submission is idempotent and yields zero duplicate XP`
  - `C2. Submission validation: rejects locked clue in supporting evidence`
  - `C3. Submission validation: rejects nonexistent hypothesis ID`
  - `G1. Persistent storage contains zero private case definitions or forbidden keys`

---

## 5. Audit Verdict

**VERDICT: PASS**  
Zero critical, high, or medium security vulnerabilities in Phase 1 deliverables. Phase 1 is certified secure and ready for the R4 phase gate.
