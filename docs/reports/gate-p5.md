# Phase Gate Report: Phase 5 (P5) — Living City & Meta-Game

> **Gate Reviewer**: Agent 1 (Integrator & Systems Auditor)  
> **Date**: 2026-10-31  
> **Target Phase**: Phase 5 — Daily Rotations, Conspiracy Meta-Graph, Weekly Community Challenges, and Push Notifications  
> **Gate Verdict**: **IN PROGRESS (Awaiting Agent 3 UI WPs)**

---

## 1. Phase Overview & Objectives

Phase 5 delivers the live-service meta-game architecture for "THE LAST LIE: Infinite", turning the procedural deduction engine into a living city with recurring daily engagement, collective weekly investigation, an overarching conspiracy web, and re-engagement loops:

1. **Daily Case Rotation (WP-50 / WP-50s)**: Automated UTC-day case rotation with 14-day fill ahead, 90-day deduplication, strict server-side future date confidentiality, and non-punitive detective streak tracking.
2. **Conspiracy Meta-Graph (WP-51 / WP-51s / WP-53a / WP-53)**: Overarching narrative web connecting the city's corrupt factions ("The Quiet"). Secure 1-hop redaction (`name: null`, `description: null`, `revealed: false`) and 2-hop total omission. Case completion triggers cryptographically verified graph node/edge unlocks.
3. **Canonical Chapter 1 (WP-53)**: 3 authored canonical cases introducing The Quiet (`case_c101`, `case_c102`, `case_c103`), 17 narrative nodes, 18 conspiratorial edges, and full R6 content audits.
4. **Conspiracy Map UI (WP-52)**: Interactive canvas/graph visualization of unlocked clues and shadowy leads, pan/zoom controls, tap-to-inspect dossiers, and accessible list view alternative.
5. **Weekly Community Investigation (WP-55 / WP-55s)**: Synchronous weekly case with open/close time gating, first-attempt-only leaderboard ranking, and strictly withheld aggregate deductions until the case window closes.
6. **Push Notification Infrastructure (WP-54)**: Privacy-first, opt-in notifications (after completing 2 cases), local time daily reminders, zero spoiler leakage in notifications, and one-tap opt-out.

---

## 2. Work Package Completion Audit

| Work Package | Title | Owner / Branch | State on `main` | Verification & Deliverables |
|---|---|---|---|---|
| **WP-50s** | Daily & Weekly Server | Agent 2 (`wp/50s-55s-daily-weekly`) | ✅ Merged | PostgreSQL migrations `20261105000000_daily_weekly.sql`, 14-day fill, UTC date checks, weekly window gate. |
| **WP-50** | Daily Case UI & Streaks | Agent 3 (`wp/50-55-daily-weekly`) | ✅ Merged | Daily case card on Home, streak counter, no streak penalty. |
| **WP-51s** | Conspiracy Graph Backend | Agent 2 (`wp/51s-conspiracy-graph`) | ✅ Merged | Migration `20261106000000_conspiracy_graph.sql`, 1-hop neighbor redaction, submit reveal hooks, CLI publisher. |
| **WP-52** | Conspiracy Map UI | Agent 3 (`wp/52-conspiracy-map`) | ⚪ Queued | Canvas/graph rendering, pan/zoom, '?' neighbor nodes, dossier inspector, accessible list view. |
| **WP-53a** | Conspiracy Content Model | Agent 1 (`main`) | ✅ Merged | Zod schemas for nodes & edges, graph loader, structural validation tests. |
| **WP-53** | Canonical Chapter 1 | Agent 1 (`main`) | ✅ Merged | Story design `docs/story/chapter-01.md`, cases `case_c101`..`c103`, 17 nodes, 18 edges, R6 reviews. |
| **WP-54** | Push Notifications | Agent 3 (`wp/54-push-notifications`) | ⚪ Queued | Expo Notifications setup, permission prompt after Case 2, local time reminders, zero spoiler text. |
| **WP-55s** | Weekly Community Backend | Agent 2 (`wp/50s-55s-daily-weekly`) | ✅ Merged | Window enforcement, first-attempt leaderboard ranking, hidden distribution stats. |
| **WP-55** | Weekly Community UI | Agent 3 (`wp/50-55-daily-weekly`) | ✅ Merged | Challenges tab weekly section, countdown timer, locked distribution until close, leaderboard view. |

---

## 3. Phase 5 Exit Criteria Verification

| Exit Criterion | Target | Verification Method | Status |
|---|---|---|---|
| **Daily Case Date Confidentiality** | Clients cannot read future dates | Tested in `supabase/tests/daily_weekly.test.ts`: future daily dates return 404/redacted | ✅ PASS |
| **Streak Non-Punitiveness** | Missing days does not remove XP/unlocks | Tested in `apps/mobile/tests/daily_weekly_ui.test.tsx` (streak grace preserved) | ✅ PASS |
| **Conspiracy 1-Hop Redaction** | Fresh users see 0 unrevealed names | Tested in `supabase/tests/graph.test.ts`: fresh player sees zero unrevealed node names | ✅ PASS |
| **Conspiracy 2-Hop Omission** | Distant nodes completely absent | Tested in `supabase/tests/graph.test.ts`: nodes >1 hop away omitted from payload | ✅ PASS |
| **Canonical Cases Fair Play** | V1–V16 clean validation | Tested in `packages/content/tests/canonical_cases.test.ts`: 100% clean across all 3 cases | ✅ PASS |
| **Weekly Secrecy Window** | Aggregate distributions hidden before close | Tested in `supabase/tests/daily_weekly.test.ts`: GET distribution returns locked error before closesAt | ✅ PASS |
| **Push Opt-In Privacy** | Explicit opt-in after Case 2 only | Verified in `apps/mobile/src/features/notifications/` and profile settings | ⚪ Pending WP-54 |
| **Push Spoiler Prevention** | Zero clue/culprit text in push bodies | Regex DeepScan on notification templates | ⚪ Pending WP-54 |

---

## 4. Current Phase Gate Status

**Status**: **IN PROGRESS**  
Phase 5 backend systems and canonical content are 100% merged and verified with passing test suites. Awaiting Agent 3's completion of:
1. `wp/50-55-daily-weekly` (Daily UI + Weekly UI)
2. `wp/52-conspiracy-map` (Conspiracy Map Canvas)
3. `wp/54-push-notifications` (Push notification triggers and preferences)
