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
   - `INTEGRATIONS_ENCRYPTION_KEY` — required for the Integrations page to work (generate with `openssl rand -hex 32`).
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

## Auth & onboarding

- **Signup** (`/signup`) → Supabase `signUp` with the business and owner name in user metadata. If Supabase returns a session (email confirmation off), the workspace is created right away; otherwise the confirmation link goes through `/auth/callback` to `/onboarding`, which creates it (prefilled). `lib/workspace.ts#createWorkspace` is idempotent per login.
- **Every emailed link** (confirmation, recovery, invite) lands on `/auth/callback`, which supports both `?code=` and `?token_hash=&type=` styles and only redirects to same-site paths (`lib/redirects.ts#safeNextPath` — also used by login).
- **Password reset**: `/forgot-password` → email → `/reset-password`. **Staff invites** land on `/reset-password?welcome=1` to set a password. **Removing a teammate** deletes their login too.
- `/settings/account`: change name/password, sign out of every device.
- Login, signup and reset are rate-limited per IP (`lib/rate-limit.ts`).

**Supabase dashboard setup (one-time, can't be done from code):** Authentication → URL Configuration: set **Site URL** to the production URL and add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback` for dev) to **Redirect URLs** — emailed links to any other URL are rejected. Configure custom **SMTP** (Supabase's built-in sender is heavily rate-limited — fine for testing, not for real customers).

## Integrations

Third-party credentials (currently: WhatsApp) are connected through **Settings → Integrations** (`/integrations`) — no code or redeploy needed. The owner pastes a Phone Number ID + Access Token there; it's encrypted (`lib/crypto.ts`, AES-256-GCM, key from `INTEGRATIONS_ENCRYPTION_KEY`) and stored in the `integrations` table, one row per org per provider. The saved token is never sent back to the browser — the form only ever accepts a new one, never displays the old one.

Every outbound WhatsApp message (booking confirmation, ready-for-pickup, service reminders, campaigns) goes through `lib/whatsapp/sendWhatsApp()`, which resolves credentials in this order:

1. **This org's own connection**, from the Integrations page.
2. **Shared fallback** — `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` env vars, if set (useful for a single-tenant deploy, or as a default before any org connects their own).
3. **Console logging** (`ConsoleProvider`) — every retention feature still works end-to-end for development/demo without any live WhatsApp account.

Always writes an audit row to the `whatsapp_messages` table regardless of which path was used, visible on each customer's detail page.

The daily job lives at `app/api/cron/daily/route.ts`, scheduled via `vercel.json`. It's one consolidated route (service reminders + lead follow-up/stale nudges) rather than one cron per concern, to stay within Vercel's free-tier cron quota. Protect it in production by setting `CRON_SECRET` (Vercel sends it automatically as a bearer token when the env var is present); without it the route runs unauthenticated, which is fine for local testing only.

## In-app notifications

Staff get in-app nudges (sidebar unread badge, `/notifications` page) for two things the daily cron checks: a lead's `followUpAt` has arrived, or a lead has had no update in `organizations.staleLeadDays` days (both configurable per org in Settings). `lib/notifications.ts`'s `notify()` dedupes so the same still-true condition doesn't re-notify on every run. No email/SMS yet — see the WhatsApp note above for the pattern to extend this with a real channel later.

`NEXT_PUBLIC_APP_URL` controls the domain used in links sent inside WhatsApp messages (booking status links). On Vercel it falls back to `VERCEL_URL` automatically if unset.

## Billing

Quotations (`/quotations`) and invoices (`/invoices`) are separate tables, not one "documents" table with a type flag — their lifecycles differ (a quotation is draft/sent/accepted/declined; an invoice additionally tracks payment) and converting a quotation copies it into a new invoice row rather than mutating it in place, so the original quote stays intact.

- **Money** is `numeric(12,2)` in Postgres, never a float. Totals are computed once, server-side, in `lib/billing/money.ts#calculateTotals()` and persisted on the row — never recalculated live from line items on every read.
- **Document numbers** (`QUO-0001`, `INV-0001`) come from a per-org counter (`organizations.quotationCounter` / `invoiceCounter`), incremented in one atomic `UPDATE ... RETURNING` (`lib/billing/numbering.ts`) — safe if two staff create documents at the same moment.
- **Payment status** (`draft`/`sent` → `partial` → `paid`) is computed from `amountPaid` vs `total` every time a payment is recorded or removed (`app/(app)/invoices/actions.ts`) — never set by hand. `void` is the one manual status, for a cancelled invoice.
- **Public share links** (`/quote/[token]`, `/invoice/[token]`) follow the same unlisted-token pattern as the booking status page — no login, not indexed, just unguessable enough that only someone with the link (the customer it was sent to) can view it.
- The line-item editor (`components/billing/line-items-editor.tsx`) is shared between quotations and invoices: add/remove rows, live subtotal/GST/total, serializes to one hidden JSON field the server parses with `lib/billing/schema.ts`.

## Inventory

Two separate features, not one — "stock" means different things for a rental business (the vehicles themselves) and a service center (parts/consumables), so they get different data models rather than one forced-generic "inventory" table:

- **Vehicles** (`/vehicles`) — fleet tracked by `status` (`available`/`rented`/`maintenance`/`retired`), set manually by staff. A lead can be linked to a vehicle (`leads.vehicleId`) once one's assigned; the Vehicle card on a lead's detail page only shows up once the org has added at least one vehicle. No date-based availability/conflict checking — status is the whole model. Registration numbers are unique per org.
- **Stock items** (`/inventory`) — parts/consumables tracked by `quantityOnHand` vs. `lowStockThreshold`. Every change (restock/usage/adjustment) writes a `stock_movements` row rather than only updating the count, so there's an audit trail (`app/(app)/inventory/actions.ts#recordStockMovement`). Not linked to invoice line items yet — invoice line items are still freeform text.
- **Low-stock alerts** — the daily cron flags anything at or below threshold with an in-app notification to the owner (`low_stock` kind), deduped weekly rather than daily.

## Reports

`/reports` is retrospective sales analysis — separate from `/dashboard`, which stays an operational "what needs attention today" view. Covers a selectable date range (7/30/90/365 days):

- **KPIs** — leads in, conversion rate, revenue collected, average deal size.
- **Lead source breakdown** — count and conversion rate per `leads.source`.
- **Staff performance** — count and conversion rate per assignee (or "Unassigned").
- **Revenue by week** and **by type** (rental vs. service/other — proxied via whether the invoice's lead has a `vehicleId`, the same signal Vehicles uses elsewhere; no separate "job type" field exists).
- **CSV export** (`/api/export/leads`, `/api/export/customers`, `/api/export/invoices`) — full data, not date-filtered; also linked from each list page's own header for convenience.

All aggregation happens in JS after fetching the date-range rows (no SQL `GROUP BY`/`date_trunc`) — simpler to read at this data scale, revisit only if row counts ever justify the complexity. "Conversion" means *currently* `stage = 'booked'`, not a true point-in-time funnel — accurate enough for a trend signal, not a precise historical audit (would need a stage-change-history table for that).

## Growth (marketing attribution & micro-site)

- **Tracking links** (`/growth/links`): one per influencer/ad, public URL `/r/[orgSlug]/[code]`. Visiting it records a click (one per visitor per link per 10 min), sets a 30-day `vs_ref` cookie, and redirects to the org's site (or booking page if unpublished). Bookings are credited from `?ref=<code>` first, else the cookie — both resolved within the org only; archived links keep redirecting but stop getting credit. Staff can also attribute a lead manually on the lead form. Named "tracking links" to stay distinct from `campaigns` (WhatsApp broadcasts).
- **Micro-site** (`/growth/website` → public `/site/[orgSlug]`): headline, services with "from ₹", about, hours, address/map, WhatsApp click-to-chat, embedded booking form, 4 accent presets. Owner-entered URLs must be `https://` (`lib/growth-site-schema.ts` — they're rendered on a public page).
- **Growth dashboard** (`/growth`): clicks, leads, booked, conversion, revenue and commission per link. Revenue attribution (`lib/growth-stats.ts`): payment → invoice's lead's link, else the link that first brought in the invoice's customer. Commission: flat ₹ per booked lead, or % of attributed revenue.

## Environments & deployment

One Supabase project currently serves dev and production. Before real customers, create a second project (Supabase dashboard), run `db/sql/000_full_schema.sql` in its SQL editor, and point Production at it.

| Variable | Local | Preview | Production | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dev project | dev project | prod project | public by design; RLS protects data |
| `DATABASE_URL` | dev | dev | prod | direct/pooler URI of the matching project |
| `SUPABASE_SERVICE_ROLE_KEY` | dev | dev | prod | server only |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | omit (falls back to `VERCEL_URL`) | your domain | used in every shared link |
| `INTEGRATIONS_ENCRYPTION_KEY` | any | any | **set once, never rotate casually** | different per environment is fine; saved credentials don't move between them |
| `CRON_SECRET` | optional | optional | **required** | Vercel sends it as a Bearer token; cron only runs on Production |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | optional | — | required for inbound WhatsApp | webhook refuses all calls without the secret |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM` | optional | — | optional | shared fallbacks; per-org credentials on `/integrations` win |

Custom domain checklist: add the domain in Vercel → set `NEXT_PUBLIC_APP_URL` → add it to Supabase Auth → URL Configuration (Site URL and Redirect URLs `https://<domain>/auth/callback`) → update the Meta webhook URL (`/api/webhooks/whatsapp`) and each org's Razorpay webhook URL (shown on `/integrations`).

Monitoring, backups and the audit log: see `db/OPERATIONS.md`.

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
| `npm test` | Unit tests (Vitest) — no database needed; DB tests skip |
| `npm run test:integration` | Real-database tests — only run when `TEST_DATABASE_URL` is set |

## Testing

- **Unit tests** live next to the code (`lib/**/*.test.ts`) and need no database: money math, line-item parsing, CSV escaping, crypto round-trip/tamper detection, slugs, tokens, templates.
- **Integration tests** (`tests/integration/`) run against a real Postgres and are gated on `TEST_DATABASE_URL` — they skip when it's unset and **never** fall back to `DATABASE_URL`. Each run creates a throwaway organization and deletes it (everything cascades from `organizations`). They cover the concurrency-sensitive paths: document numbering, simultaneous payments, parallel stock usage, cross-org rejection.
- `server-only` is aliased to a no-op in `vitest.config.mts`, so `lib/` modules import cleanly in tests.
- Payment and stock logic lives in `lib/billing/payments.ts` and `lib/inventory/stock.ts` (not in server actions) so it's testable and shared with future callers like payment webhooks.
- CI (`.github/workflows/ci.yml`) runs lint, unit tests and a build on every push, using placeholder env vars — no secrets in CI.

## Project structure

```
app/
  login/              Public sign-in route (see proxy.ts for the auth gate)
  book/[slug]/         Public slot-booking page, one per org (organizations.slug) — no auth
  status/[token]/       Public booking-status page, one per lead (leads.publicToken) — no auth
  quote/[token]/         Public quotation view, one per quotation (quotations.publicToken) — no auth
  invoice/[token]/       Public invoice view, one per invoice (invoices.publicToken) — no auth
  api/cron/daily/       The one scheduled job (Route Handler), auth'd via CRON_SECRET bearer token
  api/export/           CSV export Route Handlers (leads, customers, invoices) — see "Reports" below
  (app)/              Authenticated app shell — layout.tsx calls requireUser()
    dashboard/
    leads/            Lead pipeline: page.tsx (server) + pipeline-board.tsx (client) + actions.ts
    customers/
    vehicles/            Rental fleet, tracked by status — see "Inventory" below
    inventory/            Parts/consumables, tracked by quantity — see "Inventory" below
    quotations/         Quotations list/create/detail — see "Billing" below
    invoices/            Invoices list/create/detail + payment recording
    reports/             Sales analytics — see "Reports" below
    campaigns/         Retention broadcast tool
    notifications/      In-app task reminders — mark read/mark all, fed by the daily cron
    integrations/        Connect third-party services through the UI (WhatsApp today) — no code/redeploy
    settings/           Org settings (booking link, reminder config, stale-lead threshold, billing defaults) + settings/team (staff)
db/
  schema.ts           Drizzle schema — source of truth for the data model
  index.ts            Drizzle client (server-only)
  seed.ts             Dev-only: link a Supabase auth user to an org
  MIGRATIONS.md        Why db:push is broken here and how to apply schema changes instead
lib/
  auth.ts             requireUser() — resolves the session to an org-scoped profile
  supabase/           Supabase clients: client.ts (browser), server.ts (RSC/actions), proxy.ts (proxy.ts helper), admin.ts (service-role, staff invites)
  whatsapp/            Provider abstraction (cloud-provider.ts, console-provider.ts) + sendWhatsApp() + templates.ts — checks integrations table first, then env vars
  billing/              money.ts (totals math), numbering.ts (atomic QUO-/INV- numbers), schema.ts (line-item validation)
  notifications.ts      notify() — creates an in-app notification, deduped by source+kind+profile
  crypto.ts             encryptSecret()/decryptSecret() — AES-256-GCM, used to store integration credentials at rest
  csv.ts                 toCsv()/csvResponse() — used by app/api/export/*
  slug.ts / tokens.ts / site.ts   Small helpers: org slugs, public tokens, site URL resolution
  utils.ts            cn() class-merging helper
components/
  ui/                 Primitive components (Button, Card, Input, Badge, Select, CopyLinkButton…)
  billing/              LineItemsEditor — shared add/remove-rows editor used by both quotations and invoices
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
- **Third-party credentials belong on the Integrations page, not in env vars.** Env vars (`WHATSAPP_PHONE_NUMBER_ID` etc.) are a shared fallback only — the per-org path is a row in `integrations`, entered through `/integrations`, encrypted with `lib/crypto.ts` before it touches the database. When adding a new integration, follow this pattern rather than reaching for another env var.
- **Design tokens live in `app/globals.css`.** Colors, fonts — change the palette there, not by hardcoding hex values in components.

## Adding a new feature

1. Add/extend tables in `db/schema.ts`, then apply the change — see `db/MIGRATIONS.md` (`db:push` is currently broken against this project's Supabase instance).
2. Create the route under `app/(app)/<feature>/` with `page.tsx` (server-rendered, scoped to `requireUser().orgId`) and `actions.ts` for mutations.
3. Add the nav entry in `app/(app)/nav-links.tsx`.
4. Reuse `components/ui/*` before adding new primitives.
