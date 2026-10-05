# Operations

## Health & uptime
`GET /api/health` is public and returns `{ "ok": true }` (200) when the app can reach Postgres, `{ "ok": false }` (503) otherwise. No data is exposed. Point an uptime monitor (UptimeRobot / BetterStack free tier) at it with a 5-minute interval.

## Logs & errors
- `lib/log.ts` writes one JSON line per event (`level`, `event`, `time`, fields) with emails and phone numbers masked. Search by `event` in Vercel Logs (e.g. `cron_daily`, `request_error`, `audit_write_failed`).
- `instrumentation.ts#onRequestError` logs every unhandled server error as `request_error` (path without query string, route, digest).
- **Sentry is not installed.** It needs an account/DSN from the owner. To add it later: install `@sentry/nextjs` per its Next 16 guide, call `Sentry.captureRequestError` from `onRequestError`, and keep `beforeSend` scrubbing phone/email like `scrub()` does.

## Audit log
Owner-visible at `/settings/audit` (`audit_log` table, RLS on). Written through `lib/audit.ts#audit()` for: integration save/disconnect, team invite/remove, invoice void/unvoid/delete, payment delete, customer/vehicle/stock deletes. Add a call for any new destructive or credential-touching action.

## Backups (important)
The Supabase **free plan has no point-in-time recovery or downloadable daily backups**. Until the plan is upgraded, take your own dumps:

```bash
# Use the DIRECT connection string (Project Settings → Database), not the pooler.
pg_dump "$DATABASE_URL" --no-owner --format=custom --file="vanspire-$(date +%F).dump"
```

Run weekly at minimum and store the file off the machine (encrypted drive / private bucket). Keep the last 8.

### Restore (test this once into a scratch database)
```bash
createdb vanspire_restore_test
pg_restore --no-owner --dbname=vanspire_restore_test vanspire-YYYY-MM-DD.dump
psql vanspire_restore_test -c "select count(*) from leads;"
```
Auth users live in Supabase's `auth` schema, which `pg_dump` of `public` does not include; a full disaster recovery also needs Supabase's own project backup (paid plans) or re-inviting users.

A scheduled GitHub Action doing the dump needs a database URL secret and a place to store the artifact — set that up only once you've decided where backups should live.

## Scheduled jobs
`vercel.json` runs `/api/cron/daily` at 03:00 UTC. It requires `CRON_SECRET` (Vercel sends it as a Bearer token). Each run logs a `cron_daily` line with the counts.
