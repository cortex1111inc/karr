# Schema changes on this project

`npm run db:push` (`drizzle-kit push`) **crashes** against this Supabase project:

```
TypeError: Cannot read properties of undefined (reading 'replace')
  at .../drizzle-kit/bin.cjs:17861 (checkValue.replace(...))
```

This is `drizzle-kit push`/`pull` failing to introspect a check constraint it
doesn't have full visibility into (Supabase's managed schemas — `auth`,
`storage`, `realtime`, etc. — carry constraints the connected role can't
fully read via `pg_get_constraintdef`). Setting `schemaFilter: ["public"]`
in `drizzle.config.ts` does **not** avoid it — the crash happens in the
constraint-fetching query itself, before the filter is applied. Confirmed
against `drizzle-kit@0.31.10` (current `latest` at the time of writing).

## Workaround: apply schema changes with raw SQL

Until this is fixed upstream (or the project migrates to plain Postgres),
schema changes go through hand-written SQL instead of `db:push`:

1. Edit `db/schema.ts` as normal — it's still the source of truth for the
   TypeScript types Drizzle queries use everywhere else in the app.
2. Write the equivalent `ALTER TABLE` / `CREATE TABLE` statements by hand.
   Use `IF NOT EXISTS` / `DO $$ ... EXCEPTION WHEN duplicate_object ...`
   guards so the script is safe to re-run.
3. Apply it directly:
   ```bash
   node -e "
   require('dotenv/config');
   const fs = require('fs');
   const postgres = require('postgres');
   const sql = postgres(process.env.DATABASE_URL, { prepare: false });
   (async () => {
     await sql.unsafe(fs.readFileSync('path/to/your.sql', 'utf8'));
     console.log('Applied OK');
     await sql.end();
   })();
   "
   ```
4. Verify with a quick introspection query (not `drizzle-kit`):
   ```bash
   node -e "
   require('dotenv/config');
   const postgres = require('postgres');
   const sql = postgres(process.env.DATABASE_URL, { prepare: false });
   (async () => {
     console.log(await sql\`SELECT column_name FROM information_schema.columns WHERE table_name = 'your_table'\`);
     await sql.end();
   })();
   "
   ```
5. Delete the one-off `.sql` file once applied — this doc is the record of
   *how*, `db/schema.ts` + git history is the record of *what*.

`db:generate` (which only diffs against local migration snapshots, no DB
connection) still works — it's only introspection of the *live* database
(`push`, `pull`, and by extension `migrate` on a project with no prior
migration history) that's broken here.

If you move this project off Supabase, or Supabase/drizzle-kit fix the
underlying issue, re-test `db:push` and delete this file.
