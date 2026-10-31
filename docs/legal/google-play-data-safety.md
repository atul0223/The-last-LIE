# Google Play Console — Data Safety Form Responses

*Application:* THE LAST LIE: Infinite  
*Package Name:* `com.[COMPANY NAME_SLUG].thelastlie`  
*Developer Entity:* **[COMPANY NAME]**  
*Contact Email:* **[CONTACT EMAIL]**  
*Privacy Policy URL:* `https://[DOMAIN]/privacy`

---

## Overview Questions

1. **Does your app collect or share any of the required user data types?**
   - **Answer:** Yes.

2. **Is all of the user data collected by your app encrypted in transit?**
   - **Answer:** Yes (All network communication utilizes TLS 1.3 / HTTPS).

3. **Do you provide a way for users to request that their data be deleted?**
   - **Answer:** Yes.
   - **URL for deletion requests:** `https://[DOMAIN]/privacy` (Additionally provided directly in-app under **Profile > Settings > Delete Account**).

---

## Data Types Breakdown

### 1. Personal Info
- **Name:**
  - **Collected?** Yes (Optional display name for investigator profile).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Is this data required or optional?** Optional.
  - **Purpose:** App functionality, Account management.
- **Email Address:**
  - **Collected?** Yes (Optional, when signing in with Google or Apple).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Is this data required or optional?** Optional (Users may play anonymously as Guest).
  - **Purpose:** App functionality, Account management.
- **User IDs:**
  - **Collected?** Yes (Internal pseudonymous Supabase user ID UUID).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Is this data required or optional?** Optional (only generated if signing up or syncing).
  - **Purpose:** App functionality, Account management.

### 2. App Activity
- **App Interactions:**
  - **Collected?** Yes (Case solve completion, clue unlocks, streak progression).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Purpose:** Analytics, App functionality.

### 3. App Info and Performance
- **Crash Logs:**
  - **Collected?** Yes (via Sentry SDK).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Purpose:** Analytics, Diagnostics.
- **Diagnostics:**
  - **Collected?** Yes (Edge function request latencies, network error rates).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Purpose:** Analytics, Diagnostics.

### 4. Device or Other Identifiers
- **Device or other IDs:**
  - **Collected?** Yes (Push notification token FCM, PostHog anonymous device ID).
  - **Shared?** No.
  - **Ephemeral processing?** No.
  - **Purpose:** App functionality (push notification reminders), Analytics.
