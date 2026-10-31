# Monitoring, Alerting & Observability Runbook

*Document Version: 1.0.0 — October 31, 2026*  
*Systems Covered:* Sentry (Crash / Error Monitoring), PostHog (Product & Funnel Telemetry), Supabase (Infrastructure Metrics & Cost Caps)

---

## 1. Sentry Alerting Rules & Thresholds

Project Slug: `the-last-lie`  
SDK: `@sentry/react-native` (with PII scrubber configured in `apps/mobile/src/lib/analytics/sentry.ts`)

| Alert Rule Name | Condition | Window | Severity | Action / Destination |
|---|---|:---:|:---:|---|
| **P0: Fatal Crash Spike** | Unhandled crash rate > 1.0% of user sessions | 5 min | Critical | PagerDuty / Telegram / Slack `#alerts-prod` |
| **P1: Edge API 5xx Spike** | Edge function returns HTTP 500/503 > 20 times | 10 min | High | Slack `#alerts-prod` |
| **P1: Submission Failure** | Errors in `RemoteGameService.submit` or `/sessions/:id/submit` > 5 events | 15 min | High | Slack `#alerts-prod` |
| **P2: New Unhandled Exception** | First seen event in production release | Instant | Medium | Slack `#dev-notifications` |
| **P2: Memory Warning / OOM** | Low-memory termination warning events > 50 | 1 hour | Medium | GitHub Issue tracker |

---

## 2. PostHog Dashboards & §11 Funnels

Configured in PostHog Cloud / Self-hosted instance.

### Funnel 1: First-Case Onboarding Completion (Activation)
1. `app_open` (First install / guest launch)
2. `case_started` (`caseId: case_0001`, `mode: starter`)
3. `clue_unlocked` (Evidence board opened)
4. `board_link_created` (First contradiction link formed)
5. `case_submitted` (`caseId: case_0001`, `score >= 70`)
6. `reveal_viewed`
*Target Conversion Rate:* ≥ 65%

### Funnel 2: Second-Case Habituation Loop
1. `reveal_viewed` (`caseId: case_0001`)
2. `next_case_tapped`
3. `case_started` (`caseId: case_0002`)
*Target Conversion Rate:* ≥ 45%

### Funnel 3: Friend Challenge & Viral Referral
1. `challenge_created` (Player creates challenge code `/c/[code]`)
2. `challenge_opened` (`guest: true`)
3. `case_started` (`mode: challenge`)
4. `challenge_completed` (Guest deduction evaluated)
5. `signup_from_challenge` (Guest converts to authenticated account)
*Target Viral K-Factor:* > 0.35

### Funnel 4: Retention & Daily Streak
- **D1 Retention Cohort:** User active on Day 1 following install.
- **D7 Retention Cohort:** User active on Day 7 following install.
- **Streak Grace Utilization:** Track instances where non-punitive streak grace is triggered.

### Dashboard: Case Quality & Balance Monitoring
- Breakdown of `case_reported{reason}` grouped by `templateId` and `difficulty`.
- Average solve duration vs. declared difficulty band.
- Hint usage frequency per template (identifies overly obscure contradiction steps).

---

## 3. Supabase Usage Alerts & Infrastructure Cost Caps

To protect against runaway edge function invocation loops or unexpected denial-of-service billing:

### A. Usage Threshold Alerts
Configure email & webhook notifications in Supabase Dashboard (**Organization Settings > Billing > Alerts**):
- **Database Storage:** Alert at 80% of allocated disk tier (e.g. 6.4 GB on 8 GB tier).
- **Edge Function Invocations:** Alert at 500,000 invocations / month.
- **Database Egress:** Alert at 80% of monthly quota (e.g. 200 GB).
- **Auth Active Users:** Alert at 80% of monthly active user quota (e.g. 40,000 MAU).

### B. Hard Spend Cost Caps
1. In Supabase Dashboard: Navigate to **Billing > Spend Cap**.
2. **Set Spend Cap to ON** (prevents automatic upgrade charges beyond tier allowance).
3. If monthly quota is exhausted, functions throttle gracefully rather than accruing unbounded charges.
