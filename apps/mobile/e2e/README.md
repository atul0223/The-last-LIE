# Mobile End-to-End (E2E) Test Suite (Maestro)

This folder contains mobile end-to-end user journey flows written for [Maestro](https://maestro.mobile.dev/).

---

## 1. Test Flows

- `case_solve_flow.yaml`: Full end-to-end player journey on `case_0001`
  - Launches app with clean state
  - Reads Case Briefing (`case.briefing.*`)
  - Inspects evidence clues and unlocks requested evidence (`case.evidence.*`)
  - Uses the accessible link flow on the Evidence Board (`case.board.*`)
  - Selects hypothesis and key evidence in Theory (`case.theory.*`)
  - Submits theory and asserts reveal score $> 0$ and valid links (`case.reveal.*`)
  - Taps "Next case" navigation
- `case_fail_flow.yaml`: Incorrect hypothesis submission
  - Submits decoy hypothesis
  - Asserts that score reflects the incorrect answer
  - Asserts that the reveal breakdown still presents the ground-truth timeline and culprit

---

## 2. Running Locally

### Prerequisites
1. Install Maestro CLI:
   ```bash
   # macOS / Linux
   curl -FsSL "https://get.maestro.mobile.dev" | bash
   # Windows (via PowerShell)
   # Or via npm:
   npm install -g maestro
   ```
2. Start an Android emulator or iOS simulator.

### Android Run
```bash
# In one terminal: start the Expo development server or build
cd apps/mobile
npx expo run:android

# In another terminal: run Maestro flows
maestro test e2e/case_solve_flow.yaml
maestro test e2e/case_fail_flow.yaml
```

### iOS Run
```bash
# In one terminal:
cd apps/mobile
npx expo run:ios

# In another terminal:
maestro test e2e/case_solve_flow.yaml
maestro test e2e/case_fail_flow.yaml
```

---

## 3. Fast Headless Integration Testing

In environments where mobile device emulators are not available (e.g. standard Linux CI runners without nested virtualization), the full case slot flow is verified headlessly via `apps/mobile/tests/integration_case_flow.test.tsx` which exercises the exact same component interactions and state transitions.
