# Operations Runbook: Deployment, Rollback & Secret Rotation

*Document Version: 1.0.0 — October 31, 2026*  
*Target Environments:* Staging & Production (`lastlie-staging`, `lastlie-prod`)

---

## 1. Production Deployment Procedure

### A. Prerequisites
- `main` branch status is green on GitHub Actions CI.
- Human operator has verified local Docker tests via `pnpm db:test && pnpm test:api`.

### B. Step-by-Step Deployment

1. **Deploy Database Migrations (Supabase CLI):**
   ```bash
   # Link to target project
   supabase link --project-ref "$SUPABASE_PROJECT_REF"
   
   # Apply pending migrations
   supabase db push
   ```

2. **Publish / Update Server Cases & Pools:**
   ```bash
   # Push new case pool definitions to the database
   pnpm lastlie publish packages/content/cases/pool/case_*.json --env prod --key "$SUPABASE_SERVICE_ROLE_KEY"
   ```

3. **Deploy Hono API Edge Function:**
   ```bash
   # Bundle case engine for edge runtime
   pnpm build:engine

   # Deploy the 'api' function without JWT verification (auth handled by middleware in code)
   supabase functions deploy api --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
   ```

4. **Trigger EAS Native Mobile Builds:**
   ```bash
   # Trigger production preview or release builds
   eas build --platform all --profile production --auto-submit
   ```

---

## 2. Emergency Rollback Procedures

### A. Edge Function Immediate Rollback
If a defect is discovered in `api` edge function:
```bash
# Check git commit history to find previous stable SHA
git checkout <PREVIOUS_STABLE_SHA>

# Re-bundle engine and deploy immediately
pnpm build:engine
supabase functions deploy api --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
```

### B. Database Migration Rollback
If a database migration fails or introduces corruption:
1. Identify the offending migration file in `supabase/migrations/`.
2. Supabase uses forward-only migrations. Create a corrective forward migration (e.g., `20261107000000_revert_bad_column.sql`) that drops or alters the problematic structure.
3. Push using `supabase db push`.
4. If schema state is completely broken, execute a point-in-time recovery (PITR) restore (see `docs/ops/backups.md`).

### C. Mobile Client Emergency Mitigation (Over-The-Air)
For UI regressions that do not change native runtime binaries, deploy an immediate Expo EAS Update:
```bash
eas update --channel production --message "Hotfix: resolve client render regression"
```

---

## 3. Secret Rotation Runbook

Rotate secrets every 90 days or immediately upon suspected credential exposure.

### A. `SUPABASE_SERVICE_ROLE_KEY` Rotation
1. Log into [Supabase Dashboard](https://supabase.com/dashboard) > **Project Settings > API**.
2. Click **Generate new Secret Key (Service Role)**.
3. Immediately update:
   - GitHub Secrets: `SUPABASE_SERVICE_ROLE_KEY`
   - Production Edge Function secrets: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."`
   - Admin CLI publisher environment files.
4. Verify edge functions respond with status 200 via `curl https://<ref>.supabase.co/functions/v1/api/health`.

### B. `GUEST_HMAC_SECRET` Rotation
1. Generate high-entropy 256-bit random hex string:
   ```bash
   openssl rand -hex 32
   ```
2. Update Edge Function secret:
   ```bash
   supabase secrets set GUEST_HMAC_SECRET="<new_key>"
   ```
3. *Note:* Existing anonymous guest challenges generated within the last 15 minutes will require players to refresh or reissue guest tokens.

### C. `EXPO_TOKEN` Rotation
1. Log into [expo.dev](https://expo.dev) > **Account Settings > Access Tokens**.
2. Delete compromised token and generate a new access token.
3. Update GitHub Repository Secrets (`EXPO_TOKEN`).
