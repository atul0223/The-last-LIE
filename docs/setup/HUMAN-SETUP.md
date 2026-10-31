# HUMAN SETUP MANUAL — THE LAST LIE: Infinite

> **Document:** `docs/setup/HUMAN-SETUP.md`  
> **Author:** Agent 1 (Integrator)  
> **Date:** 2026-10-31  
> **Target Audience:** Project Owner & Operations Lead  
> **Purpose:** The single, definitive, ordered checklist of real-world human actions required to deploy, connect credentials, run database tests, execute device builds, and calibrate production operations.

---

## Overview

All codebase features across engine logic, content generation, mobile client, and backend APIs have been built and verified in offline unit and mock integration environments. To complete the transition to live cloud staging and production environments, follow these **9 sequential steps**.

---

## 1. Local Database & Docker Verification

Because Docker Desktop and the Supabase CLI are not pre-installed on this build machine, local PostgreSQL migrations and Row-Level Security (RLS) policies have been statically tested against memory repositories. Once Docker Desktop is launched, verify the physical PostgreSQL engine:

1. **Install and Launch Docker Desktop:**
   - Download and install Docker Desktop for Windows from [docker.com](https://www.docker.com/products/docker-desktop/).
   - Ensure the Docker daemon is running (whale icon in the system tray).
2. **Start Local Supabase Stack:**
   ```bash
   pnpm db:start
   ```
   *Expected output:* Local PostgreSQL instance at `127.0.0.1:54322`, Studio at `http://127.0.0.1:54323`, and API gateway at `http://127.0.0.1:54321`.
3. **Reset and Apply Migrations:**
   ```bash
   pnpm db:reset
   ```
   *Verifies:* Applies migrations `20261101000000_core_schema.sql` through `20261106000000_conspiracy_graph.sql` and populates seed data.
4. **Execute Native pgTAP RLS Tests:**
   ```bash
   pnpm db:test
   ```
   *Verifies:* Physical enforcement of table security, tenancy boundaries, and stored procedures (`submit_case_session`, `fill_daily_cases_ahead`).

---

## 2. Supabase Cloud Environments (Staging & Production)

1. **Create Supabase Projects:**
   - Log in to [supabase.com](https://supabase.com) and create two projects:
     - `lastlie-staging`
     - `lastlie-prod`
2. **Retrieve API Keys:**
   - In each project dashboard, navigate to **Project Settings** → **API**.
   - Copy:
     - **Project URL** (`https://<project-ref>.supabase.co`)
     - **Project API Keys** → `anon` (public)
     - **Project API Keys** → `service_role` (secret, never expose to client)
3. **Where Keys Go:**

| Key | Local Dev (`.env.local`) | EAS Build Secrets | GitHub Repo Secrets | Target Usage |
|---|---|---|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` | N/A | `SUPABASE_PROD_URL` | Local DB & GitHub Actions CI |
| `SUPABASE_ANON_KEY` | *(from `pnpm db:start`)* | N/A | `SUPABASE_PROD_ANON_KEY` | Auth verification |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from `pnpm db:start`)* | N/A | `SUPABASE_SERVICE_ROLE_KEY` | Edge function deploy & CLI publisher |
| `SUPABASE_STAGING_URL` | `https://staging-ref.supabase.co` | N/A | `SUPABASE_STAGING_URL` | `pnpm lastlie publish --env staging` |
| `SUPABASE_PROD_URL` | `https://prod-ref.supabase.co` | N/A | `SUPABASE_PROD_URL` | `pnpm lastlie publish --env prod` |
| `GUEST_HMAC_SECRET` | 32-char random string | `GUEST_HMAC_SECRET` | `GUEST_HMAC_SECRET` | Edge Function HMAC signing |
| `CORS_ORIGINS` | `*` | N/A | Production domains | Web/App CORS access control |

---

## 3. Expo & EAS Mobile Cloud Builds

1. **Create Expo Account & Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. **Retrieve Expo Access Token:**
   - Go to [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
   - Generate token named `lastlie-ci`.
   - Add to **GitHub Repository Secrets** as `EXPO_TOKEN`.
3. **Configure EAS Project:**
   ```bash
   cd apps/mobile
   eas project:init
   ```
4. **Trigger Cloud Preview Build (Android APK):**
   ```bash
   eas build -p android --profile preview
   ```
   *Expected output:* Downloadable APK link for device testing.

---

## 4. Monitoring & Analytics (Sentry & PostHog)

1. **Sentry Error Tracking:**
   - Create project on [sentry.io](https://sentry.io) for React Native / Expo.
   - Copy client DSN (`https://<key>@sentry.io/<project-id>`).
   - Store as `EXPO_PUBLIC_SENTRY_DSN` in `apps/mobile/.env.local` and EAS environment secrets.
2. **PostHog Product Analytics:**
   - Create project on [posthog.com](https://posthog.com) (US or EU cloud).
   - Copy Project API Key and Host URL (`https://us.i.posthog.com` or `https://eu.i.posthog.com`).
   - Store as:
     - `EXPO_PUBLIC_POSTHOG_API_KEY`
     - `EXPO_PUBLIC_POSTHOG_HOST`

---

## 5. Mobile Identity & Push Notification Credentials

### A. Apple Developer (iOS)
1. **Sign in with Apple:**
   - In Apple Developer Portal, enable "Sign in with Apple" under Identifiers.
   - Set `EXPO_PUBLIC_ENABLE_APPLE_AUTH=true` once provisioned.
2. **Apple Push Notification service (APNs):**
   - Create an APNs Key (.p8 file) under Certificates, Identifiers & Profiles.
   - Upload key to EAS via `eas credentials`.

### B. Google OAuth & Firebase Cloud Messaging (Android)
1. **Google Sign-In:**
   - In Google Cloud Console, configure OAuth 2.0 Client IDs for Android and Web.
   - Set `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH=true`.
2. **Firebase Cloud Messaging (FCM):**
   - In Firebase Console, create project and download `google-services.json` to `apps/mobile/`.
   - Add server key to EAS credentials for push notifications.

---

## 6. Challenge Deep Linking & Domains

1. **Domain Registration:**
   - Register challenge sharing domain (e.g. `lastlie.app`).
2. **Universal Links & App Links Setup:**
   - Host `apple-app-site-association` on `https://lastlie.app/.well-known/apple-app-site-association`.
   - Host `assetlinks.json` on `https://lastlie.app/.well-known/assetlinks.json`.
3. **Custom URL Scheme:**
   - App scheme is configured as `thelastlie://` in `apps/mobile/app.json`.
   - Challenge links format: `https://lastlie.app/c/:code` or `thelastlie://challenge/:code`.

---

## 7. Maestro E2E Device Testing

1. **Install Maestro CLI:**
   - Windows PowerShell:
     ```powershell
     curl -fsSL "https://get.maestro.mobile.dev" | bash
     ```
2. **Run E2E Test Suite on Connected Device / Emulator:**
   ```bash
   # Launch emulator and start Expo
   cd apps/mobile
   npx expo run:android

   # Run automated case resolution flows
   maestro test apps/mobile/e2e/case_solve_flow.yaml
   maestro test apps/mobile/e2e/case_fail_flow.yaml
   ```

---

## 8. Playtest Kit & Difficulty Calibration

1. **Calibrate Generator Difficulty Curves:**
   ```bash
   pnpm lastlie report --calibrate
   ```
   *Outputs:* Distribution curves, discrimination index, and hint penalty calibrations across 1,000 generated cases.
2. **Review Playtest Rubrics:**
   - See `docs/playtest/human-playtest-kit.md` for test session checklists, observational rubrics, and feedback surveys.

---

## 9. Feature Flags Reference ("Turn Features On")

When ready to switch on remote cloud functionality, set these variables:

| Feature Flag | Default | Active Value | Description |
|---|---|---|---|
| `EXPO_PUBLIC_GAME_SERVICE` | `local` | `remote` | Switches client from local offline SQLite/MMKV to remote Supabase Edge API |
| `EXPO_PUBLIC_ENABLE_APPLE_AUTH` | `false` | `true` | Enables Apple Sign-In button in Auth modal |
| `EXPO_PUBLIC_ENABLE_GOOGLE_AUTH` | `false` | `true` | Enables Google Sign-In button in Auth modal |
| `EXPO_PUBLIC_API_URL` | `http://localhost:54321/functions/v1/api` | `https://<ref>.supabase.co/functions/v1/api` | Production backend gateway |
| `EXPO_PUBLIC_SUPABASE_URL` | `http://localhost:54321` | `https://<ref>.supabase.co` | Production Supabase endpoint |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | *(empty)* | `<public_key>` | Production Supabase anonymous key |
