# Database Backup Strategy & Disaster Recovery Drill

*Application:* THE LAST LIE: Infinite  
*Database Engine:* PostgreSQL 15+ (Hosted on Supabase)  
*RPO (Recovery Point Objective):* < 5 minutes (via PITR)  
*RTO (Recovery Time Objective):* < 30 minutes

---

## 1. Backup Architecture & Policies

### A. Point-in-Time Recovery (PITR)
- **Enabled Tier:** Supabase Pro / Team tier.
- **Continuous Archiving:** Write-Ahead Logging (WAL) files are written continuously to cloud object storage.
- **Retention Window:** 7 days rolling point-in-time recovery.
- **Granularity:** Restores database state to the exact second.

### B. Daily Snapshot Dumps
In addition to PITR, automated daily logical dumps are scheduled via Supabase scheduled backups:
- **Frequency:** Every 24 hours at 03:00 UTC.
- **Format:** Standard PostgreSQL `pg_dump` format (`custom` format with table definitions and row data).
- **Retention:** 30 days stored in cold geo-redundant storage.

---

## 2. Disaster Recovery Drill (Quarterly Protocol)

Conduct this drill on the staging environment (`lastlie-staging`) every 90 days.

### Step 1: Record Staging Benchmark
1. Check existing record count:
   ```sql
   SELECT count(*) FROM public.cases;
   SELECT count(*) FROM public.sessions;
   SELECT count(*) FROM public.submissions;
   ```
2. Note the current timestamp $T_0$.

### Step 2: Simulate Failure / Unintended Data Deletion
1. Execute test corruption query on staging:
   ```sql
   DELETE FROM public.challenge_attempts WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

### Step 3: Execute Point-in-Time Recovery (Restore Drill)
1. In Supabase Dashboard: Navigate to **Database > Backups > Point in Time**.
2. Select target recovery time: $T_0 - 1 \text{ minute}$.
3. Choose destination: **Restore to a new project** or **Restore to current project** (staged clone).
4. Initiate restore process (typical duration: 8–15 minutes).

### Step 4: Validate Data Integrity
1. Check that the deleted rows from Step 2 are fully recovered:
   ```sql
   SELECT count(*) FROM public.challenge_attempts;
   ```
2. Run automated backend integration tests:
   ```bash
   pnpm test:api
   ```
3. Confirm RLS policies, functions, and trigger behaviors are intact.
