# Privacy Policy for THE LAST LIE: Infinite

*Last updated: October 31, 2026*

Welcome to **THE LAST LIE: Infinite** ("the App", "we", "us", or "our"), published and operated by **[COMPANY NAME]** ("Company"). We are committed to protecting your personal information and your right to privacy.

This Privacy Policy explains how we collect, use, store, and protect your information when you access or use the App, our services, or visit our website at `https://[DOMAIN]`.

If you have questions or concerns regarding this policy, please contact us at **[CONTACT EMAIL]**.

---

## 1. Information We Collect

We adhere to strict data minimization principles. We collect only what is strictly necessary to provide the deductive investigation game experience, authenticate your account across devices, synchronize your case archive, and maintain fair play.

### A. Information Stored Locally (On Device)
- **Local Progress & Investigation State:** Active case notes, evidence board node positions, clue links, and local solve records are stored locally on your device via secure key-value storage (MMKV / SQLite).
- **Offline Guest Authentication:** In offline or guest mode, an anonymous cryptographic identifier is generated locally to track session continuity without transmitting personal data.

### B. Information Synchronized with Cloud Servers (When Online)
When you connect to online features (such as daily cases, weekly challenges, friend challenges, or cloud backup), we collect:
1. **Account Credentials (Optional):**
   - If you choose to sign in using **Apple Sign-In** or **Google Sign-In**, we receive an authentication token, an account identifier from the provider, and (if shared) your email address. You may choose Apple's "Hide My Email" relay service to keep your personal email private.
   - We do not store or process your external account passwords.
2. **Gameplay & Investigation Records:**
   - Case solve timestamps, accuracy scores, hint deduction penalties, streak counts, and submitted theory hypotheses.
   - Friend challenge attempts and comparative deductive rankings.
3. **Push Notification Tokens (Optional):**
   - If you explicitly opt in to daily reminder notifications, your device push token (APNs for iOS, FCM for Android) is stored to dispatch non-spoiler reminders at your selected local time (default: 09:00).
   - Push tokens are never used for third-party advertising and can be revoked at any time via App Settings or system permissions.
4. **Diagnostic & Telemetry Information:**
   - **PostHog:** Pseudonymous product analytics (e.g., onboarding completion, case drop-off points, performance latencies). IP addresses are anonymized and zero personally identifiable information (PII) is transmitted.
   - **Sentry:** Crash reports and error exceptions. All network request payloads, authorization tokens, usernames, and query strings are actively scrubbed and redacted prior to transmission.

---

## 2. How We Use Your Information

We use collected information solely for legitimate operational purposes:
- **Game Progression & Cloud Sync:** Restoring your rank, badges, case archive, and conspiracy map across devices.
- **Fair Play & Anti-Cheat:** Validating submission integrity on the server to prevent leaderboards and challenge tampering.
- **Daily & Weekly Investigation Rotation:** Calculating streak rewards and aggregating community deduction statistics.
- **Service Stability & Debugging:** Investigating crashes, edge function errors, and performance regressions.

We do **NOT** sell, rent, or monetize your personal data. We do **NOT** display third-party advertisements.

---

## 3. Data Retention and Account Deletion

### A. Retention Period
- We retain gameplay records and account metadata only as long as your account remains active.
- Telemetry and crash logs are retained in aggregated or scrubbed format for a maximum of 90 days.

### B. In-App Account Deletion (Self-Service)
You have the permanent right to delete your account and all associated data at any time:
1. Navigate to **Profile > Settings > Delete Account** within the App.
2. Confirm account deletion.
3. Upon confirmation, our server immediately invokes a transactional deletion procedure (`POST /api/account/delete`) which:
   - Deletes your profile record from `public.profiles`.
   - Purges all case sessions, submissions, board states, challenge attempts, and push tokens.
   - Hard-deletes the authentication record from `auth.users`.
   - Clears local persisted storage on your device.

You may also request complete data deletion by emailing **[CONTACT EMAIL]** with your account details.

---

## 4. Third-Party Service Providers

We utilize trusted infrastructure providers bound by strict data processing and security agreements:
- **Supabase Inc.** (Cloud database, PostgreSQL authentication, Edge functions): [supabase.com/privacy](https://supabase.com/privacy)
- **PostHog Inc.** (Self-hosted / cloud product analytics): [posthog.com/privacy](https://posthog.com/privacy)
- **Functional Software Inc. / Sentry** (Error tracking & stability monitoring): [sentry.io/privacy](https://sentry.io/privacy)
- **Apple Inc. & Google LLC** (Sign-in authentication and native push notification delivery).

---

## 5. Children's Privacy

THE LAST LIE: Infinite is designed for players who enjoy deductive reasoning and mystery logic. We do not knowingly collect personal information from children under the age of 13 (or under 16 in the European Economic Area). If you believe a child has provided us with personal data, please contact **[CONTACT EMAIL]** and we will promptly delete it.

---

## 6. International Data Transfers

Your information may be stored and processed in data centers located in the United States and the European Union. We ensure all cross-border data transfers comply with applicable data protection laws (including GDPR and UK GDPR) using Standard Contractual Clauses.

---

## 7. Contact Us

If you have questions or requests regarding your data or this Privacy Policy, please contact our Data Protection representative:

- **Entity:** [COMPANY NAME]
- **Email:** [CONTACT EMAIL]
- **Website:** `https://[DOMAIN]`
