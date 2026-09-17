# Vanspire OS

CRM, lead management, retention and billing for car rental and service businesses. Next.js (App Router) + Supabase (Postgres + Auth) + Drizzle ORM.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) |
| Database | Postgres via [Supabase](https://supabase.com) |
| ORM | [Drizzle](https://orm.drizzle.team) |
| Auth | Supabase Auth (email/password) |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| WhatsApp | WhatsApp Cloud API, behind a provider interface (`lib/whatsapp/`) — falls back to console logging without credentials |
| Scheduled jobs | Vercel Cron (`vercel.json`) |

> Next.js 16 renamed `middleware.ts` → `proxy.ts` and other conventions changed from what most training data expects. Before touching routing/proxy/caching code, check `node_modules/next/dist/docs/` rather than assuming prior knowledge — see `AGENTS.md`.

## Getting started

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.example` to `.env.local` and fill in at minimum:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `DATABASE_URL` — Project Settings → Database → Connection string (URI)
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (server-only: `db/seed.ts` and staff invites)
   - `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` and `CRON_SECRET` are optional — see "WhatsApp & retention" below.
3. Install dependencies and apply the schema — see `db/MIGRATIONS.md` (`db:push` doesn't work against this project's Supabase instance).
4. Create your first user in the Supabase dashboard (Authentication → Users → Add user), then link them to a workspace:
   ```bash
   npm run db:seed -- "you@business.com" "Your Name" "Your Business"
   ```
5. Run the app:
   ```bash
   npm run dev
   ```
   Sign in at `http://localhost:3000/login`.

## WhatsApp & retention

Every outbound WhatsApp message (booking confirmation, ready-for-pickup, service reminders, campaigns) goes through `lib/whatsapp/sendWhatsApp()`, which:

- Sends via the **WhatsApp Cloud API** if `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` are set ([setup guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)).
- Otherwise logs to the console (`ConsoleProvider`) — every retention feature still works end-to-end for development/demo without a live WhatsApp account.
- Always writes an audit row to the `whatsapp_messages` table either way, visible on each customer's detail page.

The daily reminder job lives at `app/api/cron/service-reminders/route.ts`, scheduled via `vercel.json`. Protect it in production by setting `CRON_SECRET` (Vercel sends it automatically as a bearer token when the env var is present); without it the route runs unauthenticated, which is fine for local testing only.

`NEXT_PUBLIC_APP_URL` controls the domain used in links sent inside WhatsApp messages (booking status links). On Vercel it falls back to `VERCEL_URL` automatically if unset.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | ⚠️ Currently crashes against this project's Supabase instance — see `db/MIGRATIONS.md` |
| `npm run db:generate` | Generate a SQL migration file from schema changes (safe — doesn't touch the live DB) |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:studio` | Open Drizzle Studio to browse data |
| `npm run db:seed` | Link a Supabase auth user to a new organization |

## Project structure

```
app/
  login/              Public sign-in route (see proxy.ts for the auth gate)
  book/[slug]/         Public slot-booking page, one per org (organizations.slug) — no auth
  status/[token]/       Public booking-status page, one per lead (leads.publicToken) — no auth
  api/cron/            Scheduled jobs (Route Handlers), auth'd via CRON_SECRET bearer token
  (app)/              Authenticated app shell — layout.tsx calls requireUser()
    dashboard/
    leads/            Lead pipeline: page.tsx (server) + pipeline-board.tsx (client) + actions.ts
    customers/
    campaigns/         Retention broadcast tool
    settings/           Org settings (booking link, reminder config) + settings/team (staff)
db/
  schema.ts           Drizzle schema — source of truth for the data model
  index.ts            Drizzle client (server-only)
  seed.ts             Dev-only: link a Supabase auth user to an org
  MIGRATIONS.md        Why db:push is broken here and how to apply schema changes instead
lib/
  auth.ts             requireUser() — resolves the session to an org-scoped profile
  supabase/           Supabase clients: client.ts (browser), server.ts (RSC/actions), proxy.ts (proxy.ts helper), admin.ts (service-role, staff invites)
  whatsapp/            Provider abstraction (cloud-provider.ts, console-provider.ts) + sendWhatsApp() + templates.ts
  slug.ts / tokens.ts / site.ts   Small helpers: org slugs, public tokens, site URL resolution
  utils.ts            cn() class-merging helper
components/
  ui/                 Primitive components (Button, Card, Input, Badge, Select…)
  layout/             Shared layout pieces (PageHeader)
proxy.ts              Auth gate — redirects signed-out visitors, refreshes the session cookie
vercel.json            Cron schedule for the retention-reminder job
drizzle.config.ts     drizzle-kit config
```

## Conventions

- **Every table except `organizations` carries `orgId`.** This is a multi-tenant app — one row in `organizations` per rental/service business. Every query must filter by the signed-in user's `orgId` (from `requireUser()`), never trust an ID from the client alone.
- **Data access is server-only.** Pages fetch with Drizzle directly in Server Components; mutations go through Server Actions in each feature's `actions.ts`. Route Handlers are for things that genuinely need a plain HTTP endpoint (cron jobs) — not CRUD.
- **Public routes are the exception, not the norm.** Only `/login`, `/book/[slug]`, `/status/[token]`, and `/api/cron/*` bypass the auth gate (`lib/supabase/proxy.ts` → `PUBLIC_PATHS`). Anything else under `app/` requires a session.
- **Feature folders, not layer folders.** Route segments under `app/(app)/` own their `actions.ts` and any components specific to them (e.g. `leads/pipeline-board.tsx`). Only put something in `components/` when a second feature needs it.
- **`components/ui/` stays framework-free.** Primitives take `className` and forward props; no business logic, no data fetching.
- **Validate at the boundary.** Server Actions parse `FormData` with Zod before touching the database; trust the parsed value everywhere downstream.
- **External sends go through an interface, not a direct API call.** `lib/whatsapp/` is the pattern to follow if another channel (SMS, email) gets added — a typed interface, a real provider, a no-op/logging fallback, one audit table.
- **Design tokens live in `app/globals.css`.** Colors, fonts — change the palette there, not by hardcoding hex values in components.

## Adding a new feature

1. Add/extend tables in `db/schema.ts`, then apply the change — see `db/MIGRATIONS.md` (`db:push` is currently broken against this project's Supabase instance).
2. Create the route under `app/(app)/<feature>/` with `page.tsx` (server-rendered, scoped to `requireUser().orgId`) and `actions.ts` for mutations.
3. Add the nav entry in `app/(app)/nav-links.tsx`.
4. Reuse `components/ui/*` before adding new primitives.
