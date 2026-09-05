# DB failover runbook — Neon → Supabase

## What this covers

The site's primary database is Neon Postgres. When Neon has an outage — usually
because the free-tier data-transfer quota was hit — this runbook restores service
by pointing Vercel at the Supabase standby that receives a full dump every night
at 04:00 UTC (`.github/workflows/backup.yml`).

Cost of failover: **up to 24 hours of writes lost** — anything written to Neon
after the last nightly backup and before the outage will not exist on Supabase.
Acceptable tradeoff for a free-tier redundancy setup.

## Symptoms

- Users can't log in
- Prod endpoints return 500 or redirect to `/api/auth/error?error=Your%20project%20has%20exceeded...`
- Any local `node` script that hits Neon returns `Your project has exceeded the data transfer quota.`

## Failover procedure

**1. Verify Supabase is healthy** — from a local shell:

```bash
psql "$SUPABASE_DATABASE_URL" -c "SELECT COUNT(*) FROM \"User\";"
```

Should print a count within a few seconds. If it errors, Supabase itself is down
(different problem — check https://status.supabase.com).

**2. Check backup freshness** — from the same shell:

```bash
psql "$SUPABASE_DATABASE_URL" -c \
  "SELECT value FROM \"AdminSetting\" WHERE key = 'last_backup_at';"
```

This is the ISO timestamp of the last successful nightly backup. If it's more
than 26 hours old, the last few backups have been failing silently (check the
GitHub Actions Backup workflow). Failing over anyway is still fine — you just
lose a bit more data.

**3. Flip Vercel's DATABASE_URL:**

- Vercel dashboard → project → Settings → Environment Variables
- Find `DATABASE_URL` in **Production**
- Edit — replace value with `SUPABASE_DATABASE_URL`'s value
- Save

**4. Redeploy** so the new env var takes effect:

- Vercel dashboard → Deployments → find the current production deploy
- `…` menu → Redeploy → uncheck "use existing build cache" → Redeploy

Or from CLI:

```bash
cd forex-course
npx vercel@54 --prod --yes
```

**5. Verify prod is up:**

```bash
curl -s https://forexmastery.org/api/auth/csrf | jq
```

Should return a `csrfToken` payload, not an error.

Log in as a real user in the browser as a full sanity check.

## While on Supabase — what to watch

- **The nightly backup workflow will start failing** because it points Neon→
  Supabase and Neon is down. That's expected. Silence it if the Telegram
  alerts get noisy (`.github/workflows/backup.yml` → workflow_dispatch off / disable
  in GitHub UI).
- **New writes on Supabase will not sync back to Neon** — Supabase is now the
  source of truth. Do NOT let the backup workflow run while on Supabase; it
  would overwrite live data with the (now stale) Neon dump.
- **The `AdminSetting.last_backup_at` value** will still show the pre-failover
  timestamp because writes to Neon are blocked — that's fine.

## Failback (Neon quota reset)

**1. Wait for Neon to be reachable** — verify from local:

```bash
psql "$NEON_DATABASE_URL" -c "SELECT COUNT(*) FROM \"User\";"
```

**2. Dump Supabase back into Neon** — reverses the workflow:

```bash
pg_dump \
  --no-owner --no-privileges \
  --clean --if-exists \
  --format=plain \
  "$SUPABASE_DATABASE_URL" \
| psql --single-transaction --set ON_ERROR_STOP=on "$NEON_DATABASE_URL"
```

**3. Flip Vercel's `DATABASE_URL` back to Neon + redeploy** (steps 3-4 above,
in reverse).

**4. Re-enable the backup workflow** in GitHub Actions.

**5. Verify prod:**

```bash
curl -s https://forexmastery.org/api/auth/csrf | jq
```

## Rehearsal (recommended once a quarter)

The runbook is worth nothing if it's never been tested. Once a quarter,
schedule an off-hours window and do the full flip-and-back cycle. Note how long
each step took and update this doc accordingly. First real outage should not
be the first time steps 3-4 are executed.
