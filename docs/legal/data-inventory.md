# Data Inventory & Privacy Governance

*Document Version: 1.0.0 — October 31, 2026*  
*Application:* THE LAST LIE: Infinite  
*Entity:* **[COMPANY NAME]**  
*Contact:* **[CONTACT EMAIL]**  
*Domain:* `https://[DOMAIN]`

---

## 1. Inventory of Collected Data Elements

| Category | Data Field | Source | Purpose | Legal Basis (GDPR) | Storage Location | Retention |
|---|---|---|---|---|---|---|
| **Account Identity** | User ID (`uuid`) | Supabase Auth | Unique account anchor | Contract performance | Supabase PostgreSQL (`auth.users`) | Duration of account lifecycle |
| **Account Identity** | Email Address *(Optional)* | Apple / Google OAuth | Cloud account recovery, multi-device sync | Consent / Contract | Supabase PostgreSQL (`auth.users`, `public.profiles`) | Until account deletion |
| **Account Identity** | Display Name | User Input / OAuth | Investigator name on cards & leaderboards | Consent | Supabase PostgreSQL (`public.profiles`) | Until account deletion |
| **Game State** | Case Sessions & Solves | Game Engine / Player | Track solved mysteries, rank, XP, badges | Contract performance | Supabase PostgreSQL (`public.sessions`, `public.submissions`) | Until account deletion |
| **Game State** | Board Configurations | Player | Evidence canvas node links and positions | Contract performance | Supabase PostgreSQL (`public.board_states`) & Local MMKV | Until account deletion |
| **Game State** | Challenge Records | Player | Friend deduction comparisons & leaderboard | Legitimate interest | Supabase PostgreSQL (`public.challenges`, `public.challenge_attempts`) | 180 days post-challenge expiration |
| **Engagement** | Push Notification Token *(Optional)* | Device APNs / FCM | Local-time daily case reminders (09:00) | Consent (Opt-in) | Supabase PostgreSQL (`public.push_tokens`) | Revoked on opt-out or account deletion |
| **Analytics** | Anonymous Device ID | PostHog SDK | Product health, retention funnels, UI flow | Legitimate interest | PostHog Cloud / Self-hosted EU | 90 days rolling |
| **Crash Telemetry** | Stack Traces & Error Logs | Sentry SDK | Bug remediation & crash diagnosis | Legitimate interest | Sentry Cloud (PII scrubbed) | 90 days rolling |

---

## 2. Sensitive Data & Anti-Leak Guarantees

- **No Financial Data:** All purchases or subscriptions (if enabled in future) are handled directly by Apple App Store and Google Play Store via In-App Purchases (IAP). The app never touches credit cards or payment credentials.
- **Zero Precise Geolocation:** The app does not request or access GPS location.
- **Zero Biometric / Health Data:** No camera, microphone, health, or biometric sensors are ever requested.
- **Zero Advertising ID:** No IDFA (iOS) or GAID (Android) is gathered or shared with advertising brokers.
- **Answer Redaction:** As mandated by `SYSTEM_DESIGN.md §3.6`, case truth values, secret seeds, and culprit IDs are never delivered to client devices for server cases until complete submission.

---

## 3. Account Deletion Workflow (`POST /api/account/delete`)

When the user taps **Delete Account** in the in-app Profile settings:
1. Client issues authenticated `POST /api/account/delete`.
2. Backend verifies JWT and triggers an atomic database deletion transaction:
   - Deletes all records in `public.profiles`, `public.submissions`, `public.sessions`, `public.board_states`, `public.challenge_attempts`, `public.conspiracy_player_nodes`, and `public.push_tokens` referencing the `user_id`.
   - Calls Supabase Admin API to purge `auth.users` row.
3. Client receives confirmation, flushes local MMKV/SQLite caches, and resets app state to first-launch onboarding.
