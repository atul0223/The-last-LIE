# Deployment & CI/CD Guide — THE LAST LIE: Infinite

> **Document Version**: 1.0 (Phase 3 / WP-47)  
> **Audience**: Integrator, Backend Engineers, DevOps, Release Managers

---

## 1. Pipeline Architecture

The CI/CD pipeline runs on GitHub Actions (`.github/workflows/ci.yml`) and enforces strict quality, safety, and security gates before any code merges or deploys.

```
Push to branch (wp/** or main) / PR
   │
   ▼
[Job: check]
   ├─ Scope review (on PR/branch: verify only owned paths modified)
   ├─ Gitleaks Secret Scan (detect credentials, API keys, tokens)
   ├─ Typecheck (tsc --noEmit across all 5 workspace packages)
   ├─ Lint (eslint strict)
   ├─ Test & Coverage Gate (Vitest, >=90% line coverage for case-engine)
   ├─ Content Validation (`lastlie validate "packages/content/cases/**/case_*.json"`)
   └─ Dependency Audit (`pnpm audit --audit-level=critical`)
   │
   ▼ (if push to main and all checks PASS)
[Job: preview-build]
   ├─ Check EXPO_TOKEN secret
   ├─ If EXPO_TOKEN is absent: skips gracefully with notice
   └─ If EXPO_TOKEN is present: runs EAS preview build for Android/iOS
   │
   ▼ (Phase 4 — Commented TODOs)
[Job: deploy-backend]
   ├─ Supabase DB migration push (`supabase db push`)
   └─ Supabase Edge Function deploy (`supabase functions deploy api`)
```

---

## 2. Secrets & Configuration

The table below lists all CI/CD secrets. These must be configured in GitHub: **Repository Settings → Secrets and variables → Actions → Repository secrets**.

| Secret Name | Required For | Phase | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | Gitleaks / Actions | Phase 0+ | Automatically provided by GitHub Actions. Used for PR comments and secret scanning. |
| `EXPO_TOKEN` | EAS Preview Build | Phase 3+ | Expo Application Services personal access token with permissions to build `@lastlie/mobile`. |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI deploy | Phase 4 | Supabase personal access token for programmatic management of projects and Edge Functions. |
| `SUPABASE_PROJECT_ID` | Supabase CLI deploy | Phase 4 | Target Supabase project reference id (e.g. `abcdefghijklmnop`). |
| `SUPABASE_DB_PASSWORD` | DB Migration push | Phase 4 | Password for direct database connection when applying SQL migrations. |

### 2.1 Setting up `EXPO_TOKEN`
1. Log in to [expo.dev](https://expo.dev).
2. Navigate to **Account Settings → Access Tokens**.
3. Create a new token with name `github-actions-preview`.
4. Copy the token and navigate to GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
5. Set Name: `EXPO_TOKEN`, Value: `<token>`.

### 2.2 Setting up Supabase Secrets (Phase 4 Human Action)
Once the production/staging Supabase project is provisioned:
1. Generate an Access Token from the Supabase Dashboard: **Account → Access Tokens**.
2. Retrieve the Project ID from Project Settings: **General → Reference ID**.
3. Add `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, and `SUPABASE_DB_PASSWORD` to GitHub repository secrets.
4. Uncomment the `deploy-backend` job in `.github/workflows/ci.yml`.

---

## 3. Local Verification Commands

Before creating a PR or pushing to a worktree branch, developers can run the exact commands locally:

```bash
# 1. Typecheck all packages
pnpm -r typecheck

# 2. Lint all packages
pnpm -r lint

# 3. Run all unit and integration tests
pnpm -r test

# 4. Run test coverage gate
pnpm --filter @lastlie/case-engine test -- --coverage

# 5. Validate all authored and generated case JSONs
pnpm lastlie validate "packages/content/cases/**/case_*.json"

# 6. Audit dependencies for critical vulnerabilities
pnpm audit --audit-level=critical
```

---

## 4. Mobile Preview Builds (EAS)

The mobile client is configured with Expo Application Services (`eas.json`):

- **development**: Internal build targeting Expo Dev Client with debugging capabilities.
- **preview**: Internal distribution build (`.apk` for Android, ad-hoc `.ipa` for iOS) generated automatically on pushes to `main` when `EXPO_TOKEN` is configured.
- **production**: Store distribution release build with auto-incrementing build numbers.

---

## 5. Rollback Procedures

If a deployment or commit on `main` causes regressions:
1. **Engine / Content regression**: Revert the offending commit on `main` via `git revert -m 1 <merge_sha>`. The CI pipeline will automatically validate the rollback and trigger a new EAS preview build.
2. **Database migration rollback**: Never run destructive rollbacks against production. Instead, create a new numbered migration in `supabase/migrations/` reversing the previous schema change and push forward.
