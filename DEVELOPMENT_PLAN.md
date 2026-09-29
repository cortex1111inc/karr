# Vanspire OS — Development Plan (remaining work)

This is the complete plan for everything left to build: the pending roadmap phase, integrations, UI updates, and production hardening. It's written for a **fresh Claude Code session (e.g. a cloud session) with no memory of how the app was built so far**, and for the human reviewing that session's work.

Work top to bottom. Workstreams are ordered by dependency and risk — don't skip ahead to Growth features (WS6) before the foundations (WS1–WS4) are in, because later workstreams assume the test harness, error boundaries, responsive shell, and onboarding flow exist.

Check items off here as they ship (`- [x]`), same as `ROADMAP.md`. When a workstream is fully done, also tick its line in `ROADMAP.md`.

---

## 0. Before writing any code

### 0.1 Read these first, in order

1. `CLAUDE.md` — hard rules (multi-tenancy, RLS, money, public routes, schema workflow). **Non-negotiable.**
2. `AGENTS.md` — this is Next.js **16**; APIs differ from most training data. Check `node_modules/next/dist/docs/` before touching routing, caching, or `proxy.ts`.
3. `README.md` — stack, project structure, feature architecture.
4. `ROADMAP.md` — what's shipped and the reasoning behind past decisions.
5. `db/MIGRATIONS.md` — how schema changes are applied here (not `db:push`).

### 0.2 What already exists (as of 2026-09-28, commit `58e7f48` + RLS fix)

Phases 0–5 of `ROADMAP.md` are complete:

| Area | Routes | Notes |
|---|---|---|
| Auth & tenancy | `/login` | Supabase Auth email/password. **No signup, no password reset** — orgs are created only by `npm run db:seed`. |
| Leads/CRM | `/leads`, `/leads/[id]`, `/customers`, `/customers/[id]` | Pipeline board, filters, activity timeline, assignment, convert-to-customer |
| Retention | `/campaigns`, `/book/[slug]`, `/status/[token]` | WhatsApp via `lib/whatsapp/` (console fallback — no live credentials yet) |
| Automation | `/notifications`, `/api/cron/daily` | One consolidated Vercel Cron job |
| Integrations | `/integrations` | WhatsApp credentials per-org, AES-256-GCM encrypted |
| Billing | `/quotations`, `/invoices`, `/quote/[token]`, `/invoice/[token]` | GST, payments, atomic numbering |
| Inventory | `/vehicles`, `/inventory` | Fleet by status; parts by quantity with movement log |
| BI | `/reports`, `/api/export/{leads,customers,invoices}` | KPIs, source/staff breakdowns, CSV |
| Settings | `/settings`, `/settings/team` | Booking link, retention/automation/billing defaults, staff invites |

**What doesn't exist yet** (this plan's scope): tests of any kind, `loading.tsx` / `error.tsx` / `not-found.tsx`, a mobile layout (sidebar is fixed `w-60`, pages use `px-8`, pipeline board is `min-w-[1000px]`), pagination (every list is unbounded), self-serve signup/password reset, Phase 6 (Growth Module), email, online payments, PDF output, error monitoring, backups.

### 0.3 Environment the session needs

A cloud session won't have the local `.env`. Ask the user to provide these as session environment variables (values live in their local `karr/.env` — **never commit them, never echo them into files or commit messages**):

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything | |
| `DATABASE_URL` | Everything server-side | Pooled connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | Staff invites, seed, WS5 signup | Server-only |
| `INTEGRATIONS_ENCRYPTION_KEY` | `/integrations` save + WhatsApp send | Must match what's already been used to encrypt saved credentials, or they become undecryptable |
| `CRON_SECRET` | `/api/cron/daily` auth | |
| `NEXT_PUBLIC_APP_URL` | Optional | Falls back to `VERCEL_URL` |

### 0.4 Guardrails that are easy to violate from a cloud session

- **There is one Supabase project, shared by dev and production.** Any SQL you run hits the live database. Per `CLAUDE.md`, get the user's explicit OK before applying schema-changing SQL. Never run destructive SQL (`DROP`, `TRUNCATE`, `DELETE` without a tight `WHERE`) against it.
- **Test data must be cleaned up** in the same script that creates it (pattern used throughout Phases 1–5: insert → assert → delete).
- **Every new table: `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;`** in the same migration, then verify the anon REST check in `CLAUDE.md` returns `[]`.
- **Don't push secrets.** Before every commit: `git status --short` and eyeball it; `.env*` is gitignored except `.env.example`.
- **Things a cloud session can't do** (ask the user instead of working around them): anything in the Vercel dashboard (env vars, domains, cron settings), the Supabase dashboard (auth email templates, SMTP, redirect URLs, backups), Meta Business Suite (WhatsApp templates/numbers), Razorpay/Resend/Sentry account creation.

### 0.5 Known gotchas (each cost real time to discover)

| Gotcha | What to do |
|---|---|
| `npm run db:push` crashes (drizzle-kit introspection bug vs. Supabase) | Hand-written SQL applied via `node -e` + `postgres` — see `db/MIGRATIONS.md` |
| `ECONNRESET` / `EAUTHTIMEOUT` on first DB connection | Transient network flakiness — retry once before investigating |
| `import "server-only"` makes `lib/*` modules unrunnable from plain `tsx` scripts | For DB verification scripts, inline the logic under test (or alias `server-only` in the test runner, see WS2) |
| `npx tsc --noEmit` reports `Cannot find name 'LayoutProps'` after deleting `.next` | Those types are generated — run `npx next build` (which typechecks) instead of bare `tsc` |
| Stale `.next/types` references a deleted route | `rm -rf .next` then rebuild |
| Leftover `next dev` holds port 3000 | `pkill -f "next dev"` before starting a new one |
| zsh globs `--include=*.ts` | Quote it: `--include='*.ts'` |
| Adding a value to an existing Postgres enum | `ALTER TYPE <enum> ADD VALUE IF NOT EXISTS '<v>';` — run it as its own statement, not inside a transaction that also uses the new value |

### 0.6 Verification protocol (every workstream)

1. `npx eslint .` — zero warnings.
2. `npx next build` — clean, every expected route listed.
3. `npm test` — once WS2 exists; all green.
4. **Real-DB round trip** for anything touching data: script that inserts test rows, exercises the logic, asserts, deletes.
5. **UI you can't see isn't verified.** If the session has no browser, say so explicitly in the handoff rather than claiming UI works. If it has one, click through the golden path and one edge case, at desktop and ~390px mobile width.
6. Update `README.md` / `CLAUDE.md` / `ROADMAP.md` / this file for anything a future session would otherwise re-derive.
7. Commit per workstream (not one giant commit), message explaining *why*, then push to `origin main`.

---

## Decisions to get from the user before starting the workstream that needs them

Don't guess these — each changes the data model or costs money.

| # | Decision | Needed by | Default if user says "you choose" |
|---|---|---|---|
| D1 | Separate production Supabase project now, or keep one shared DB? | WS12 (ideally before WS5 onboarding brings real customers) | Separate, before first real customer signs up |
| D2 | Online payment gateway | WS8.4 | Razorpay (INR, UPI, GST-friendly, Payment Links API) |
| D3 | Email provider | WS8.2 | Resend (free tier, simple API) |
| D4 | GST invoice format — single "GST x%" (current) or CGST+SGST / IGST split, GSTIN, HSN/SAC per line? | WS9.1 | Ask their accountant; build the split + GSTIN + HSN/SAC as optional fields |
| D5 | Should creating an invoice auto-decrement linked stock items? On create, or on "sent"? | WS9.3 | On create; reversed on void/delete |
| D6 | Micro-site images — URLs only, or upload (Supabase Storage)? | WS6.2 | URLs only first |
| D7 | Error monitoring provider | WS11 | Sentry free tier |

---

## WS1 — Security & correctness hardening (P0)

- [x] **RLS enabled on all 17 `public` tables** (2026-09-28). Before: the public anon key could read/insert/update/delete every tenant's data via `…/rest/v1/<table>`. Verified after: reads return `[]`, writes rejected `42501`, app unaffected.
- [x] **Tenant-isolation audit.** *(2026-09-29: clean — every query either filters by orgId/token/slug directly or follows an org-checked parent lookup in the same function; cron is cross-org by design.)* Grep every `db.select/update/delete` in `app/` and `lib/`; each must filter by `orgId` from `requireUser()` (or, on public routes, by the resource's own public token/slug). Known-correct patterns: `leads/actions.ts#assignLead` (verifies target profile is same-org), `settings/team/actions.ts#removeTeammate`. Watch for: child tables without `orgId` (`quotation_items`, `invoice_items`, `lead_activities`, `stock_movements` reached via a parent id — confirm the parent was org-checked first in the same action).
- [x] **Owner-only actions audit.** *(Done: `requireOwner()` in `lib/auth.ts` now guards deleting invoices, payments, customers, vehicles, stock items; the UI hides those controls from staff.)* Currently gated on `role === "owner"`: team invite/remove, settings, integrations. Decide (with user) whether staff may delete customers/invoices/vehicles/stock items; today any staff member can. At minimum, deletions of financial records (invoices, payments) should be owner-only.
- [x] **Public form abuse protection** *(Done: honeypot, 3s minimum fill time, 5 per 10 min per hashed IP via `lib/rate-limit.ts` + `rate_limits` table — verified correct under 10 parallel calls; phone must be 7–15 digits.)* on `/book/[slug]` (`app/book/[slug]/actions.ts`): honeypot field + minimum-fill-time check (zero cost, no dependency); per-IP rate limit (in-memory is useless on serverless — use a small `rate_limits` table keyed by IP hash + window, or Vercel's firewall if on a paid plan). Validate phone format.
- [x] **Cron/campaign timeouts.** *(Done: `maxDuration = 60` on the cron route and campaigns page; WhatsApp section capped at 200/run (self-advancing), notification sections at 2000; campaigns capped at 500 recipients, sent 5 at a time.)* `app/api/cron/daily/route.ts` and `app/(app)/campaigns/actions.ts#sendCampaign` loop sequentially over rows and call WhatsApp per row — large orgs will hit the serverless function time limit. Add `export const maxDuration = ...` (check Next 16 docs for the current route segment config name/limits), process in bounded batches, and make the cron resumable (it already is idempotent thanks to `notify()` dedupe and `nextServiceDueAt` rolling forward).
- [ ] **Verify Vercel env vars** *(needs the user — can't be done from code)*: `CRON_SECRET` and `INTEGRATIONS_ENCRYPTION_KEY` were generated locally and the user was asked to add them to Vercel — confirm they did. Without `CRON_SECRET` the cron endpoint is unauthenticated in production; without the encryption key, saving an integration fails.
- [x] **Security headers** *(Done: X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy on all routes; `X-Robots-Tag: noindex` on /status, /quote, /invoice. Strict CSP deferred — needs per-request nonces.)* in `next.config.ts`: `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, a basic CSP. Public token pages (`/status`, `/quote`, `/invoice`) should send `X-Robots-Tag: noindex` so shared links don't get indexed.

**Acceptance:** anon REST check returns `[]` for every table; a written list in the commit message of every data-access site reviewed; booking form rejects a honeypot-filled submission; cron has a batch cap.

---

## WS2 — Test harness

No tests exist. Every later workstream should land with tests, so this comes early.

- [x] Add **Vitest** (`vitest`, `@vitest/coverage-v8`), `npm test` / `npm run test:watch` scripts, `vitest.config.ts` with the `@/*` path alias and **`server-only` aliased to an empty module** (otherwise every `lib/` import throws outside Next).
- [x] **Unit tests (pure, no DB) — write these first:** *(31 tests)*
  - `lib/billing/money.ts` — `calculateTotals` (GST on/off, rounding to 2dp, many-line accumulation), `formatCurrency`
  - `lib/billing/schema.ts` — `parseLineItems` (malformed JSON, empty array, negative price)
  - `lib/csv.ts` — quotes, commas, newlines, `Date`, `null`
  - `lib/slug.ts`, `lib/tokens.ts`, `lib/whatsapp/templates.ts`
  - `lib/crypto.ts` — round trip; wrong key fails; malformed input throws
- [x] **DB integration tests** *(6 tests incl. concurrent payments + concurrent stock usage; payment/stock logic moved to `lib/billing/payments.ts` + `lib/inventory/stock.ts`, which also fixed a lost-update race in both)* — gated behind `TEST_DATABASE_URL`; **skip (not fail) when unset, and never default to `DATABASE_URL`** (that's production). Cover: `nextDocumentNumber` concurrency (fire 20 in parallel, assert 20 unique sequential numbers), payment status transitions, stock movement math, `notify()` dedupe. Once D1 (separate DB) is decided, point `TEST_DATABASE_URL` at a throwaway Supabase branch/project or local Postgres.
- [x] **Tenant isolation tests** *(at the lib level — cross-org payment and stock movement both rejected; server actions are thin wrappers over these)*: call actions as user A with an id belonging to org B → must no-op or error, never mutate. Needs a way to stub `requireUser()` (inject via module mock).
- [ ] Optional later: **Playwright** e2e for login → create lead → convert → invoice → payment.
- [x] Add a GitHub Actions workflow: lint + build + unit tests on push/PR (no DB secrets in CI unless a test DB exists).

**Acceptance:** `npm test` runs green locally with no DB; CI green on push.

---

## WS3 — App-shell UX foundations

- [x] `app/(app)/loading.tsx` (skeleton matching the page header + card layout) and per-route `loading.tsx` for heavy pages (`/reports`, `/leads`).
- [x] `app/(app)/error.tsx` (client component, "Something went wrong" + retry via `reset()`), `app/global-error.tsx`, `app/not-found.tsx` (and styled 404 for public token pages — currently they call `notFound()` into the default Next page).
- [x] **Toast feedback** for mutations. *(`components/ui/toast.tsx`, no dependency; `useActionToast` for forms; wired into every create/update/delete/status action)* Today most actions give no confirmation (e.g. "Save changes" just re-renders). Build a tiny `components/ui/toast.tsx` (context + portal, no dependency) or use `sonner` if a dependency is acceptable. Wire into: settings saves, lead edit, invite, record payment, stock movement, status changes.
- [x] **Replace `window.confirm`** (used in 8 delete/disconnect buttons) with a reusable `components/ui/confirm-dialog.tsx` built on the same native `<dialog>` pattern the app already uses.
- [x] **Pagination** *(50/page with total count on customers, invoices, quotations, inventory, vehicles, notifications; leads board capped at 300 most recent with a notice)* for `/leads` (board: cap per column with "show more"), `/customers`, `/invoices`, `/quotations`, `/inventory`, `/notifications` (already `limit 50`), movement/payment history lists. Cursor or `?page=` with `limit/offset`; a shared `components/ui/pagination.tsx`.
- [x] **Consistent empty states** — one `components/ui/empty-state.tsx` (title, description, primary action) replacing the ad-hoc "No X yet" cards.
- [x] Extract the repeated native-`<dialog>` boilerplate *(into `FormDialog` in `components/ui/dialog.tsx`; full-screen sheet on mobile)* (6 copies: `leads/new-lead-dialog`, `leads/[id]/convert-dialog`, `invoices/[id]/record-payment-dialog`, `vehicles/new-vehicle-dialog`, `inventory/new-stock-item-dialog`, `inventory/[id]/record-movement-dialog`) into `components/ui/dialog.tsx`.

**Acceptance:** throwing inside any `(app)` page shows the error boundary, not a blank page; every mutation shows a toast; no list renders more than one page of rows.

---

## WS4 — Responsive layout & navigation redesign (UI update)

The app is desktop-only today. Business owners will use it on phones at the service counter.

- [x] **App shell** (`app/(app)/app-shell.tsx`): below `lg`, a top bar (menu button, logo, notifications bell with unread count) opens navigation in a native `<dialog>` drawer — focus trap + Escape for free; closes on link tap and backdrop tap; safe-area insets respected. Shared `components/layout/logo.tsx`.
- [x] **Grouped navigation** — 12 flat links today (14 after WS6), too many to scan. Proposed groups:
  - *(top)* Dashboard, Notifications
  - **Sales:** Leads, Customers, Quotations, Invoices
  - **Operations:** Vehicles, Inventory
  - **Growth:** Campaigns, Reports, *(WS6)* Website, Tracking links
  - **Workspace:** Integrations, Settings
- [x] **Page padding** `px-8` → `px-4 sm:px-6 lg:px-8` everywhere (24 occurrences); long share URLs wrap (`break-all`).
- [x] **Pipeline board**: horizontal scroll-snap columns below `xl` (one column per swipe on phones), 5-column grid from `xl` up.
- [x] **Tables → cards on mobile**: the line-item editor is now a CSS grid that stacks into one card per line on phones, with a visible label per field. Read-only tables (reports, invoice/quotation detail) stay tables inside their own `overflow-x-auto` container — acceptable for read-only data.
- [x] **Dialogs full-screen on mobile** (done in WS3's `FormDialog`).
- [x] **Page headers** wrap on narrow widths; actions group wraps too.
- [x] **Dashboard refresh**: 30-day KPIs (leads in, booked, revenue collected) with change vs the previous 30 days, outstanding balance, and a "Needs attention" section listing follow-ups due, unpaid invoices and low-stock items with direct links.
- [ ] Dark mode — **not planned**; don't add unless asked.

**Acceptance:** every `(app)` route usable at 390px width without horizontal page scroll (only tables/boards may scroll inside their own container); keyboard can open/close the drawer.

---

## WS5 — Self-serve onboarding & auth completeness

Right now a new business can't sign up — someone has to run `db:seed`. This blocks selling the product.

- [x] **`/signup`** (public): *(done — workspace is created by `lib/workspace.ts#createWorkspace` immediately if Supabase returns a session, otherwise after email confirmation via `/onboarding`, prefilled from signup metadata; existing-email case detected via empty `identities`; rate-limited)* business name, owner name, email, password → `supabase.auth.signUp` → on success, server action (service role, `lib/supabase/admin.ts`) creates `organizations` (with `uniqueSlug`) + owner `profiles` row. Handle the "email confirmation required" case (depends on the Supabase project's Auth setting — ask user which it is).
- [x] **`/auth/callback`** route handler: *(handles both `?code=` and `?token_hash=&type=` links; invalid/expired → `/login?error=link`)* `exchangeCodeForSession` for email-confirmation, magic-link, invite and recovery links (check current `@supabase/ssr` docs for Next 16). `/auth` is already in `PUBLIC_PATHS`.
- [x] **Forgot / reset password**: *(same response whether or not the email exists; rate-limited)* `/forgot-password` (`resetPasswordForEmail` with `redirectTo` → `/auth/callback?next=/reset-password`), `/reset-password` (`updateUser({ password })`). Add both to `PUBLIC_PATHS` where needed.
- [x] **Invite acceptance**: *(invites now pass `redirectTo` → callback → `/reset-password?welcome=1`; removing a teammate also deletes their login, so they can't sign back in)* staff invited via `/settings/team` get a Supabase invite email; link must land on a "set your password" page, not the login page. Their `profiles` row already exists (created at invite time).
- [x] **Account page** `/settings/account`: change name, change password, sign out everywhere.
- [x] **First-run onboarding checklist** *(5 steps derived from data; owner can hide via `organizations.onboarding_dismissed_at`)* on the dashboard for a brand-new org: add first lead, share booking link, connect WhatsApp, set GST default, invite a teammate. Dismissible; derived from data (not a new table) where possible.
- [x] Update `lib/auth.ts#requireUser` redirect for "session exists but no profile" (currently `/login?error=no-profile`) to route into onboarding instead.
- [ ] **Supabase dashboard config the user must do** *(still needed — see README → Auth setup)* (list it for them): Site URL + redirect URLs (`https://<domain>/auth/callback`), SMTP (Supabase's built-in email is rate-limited heavily — Resend SMTP works here, ties into D3), email templates.

**Acceptance:** a brand-new email can sign up, confirm, land in an empty workspace, and invite a teammate who can set a password and sign in — end to end, without `db:seed`.

---

## WS6 — Phase 6: Growth Module

From `ROADMAP.md` Phase 6. **Naming collision to avoid:** the existing `campaigns` table is *WhatsApp retention broadcasts* (Phase 2). Marketing attribution here uses **"tracking links"** in code and UI to keep them distinct.

### 6.1 Tracking links (influencer/marketing attribution)

Schema:

```sql
CREATE TABLE IF NOT EXISTS tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,                -- "Rahul (Instagram) — Onam offer"
  code text NOT NULL,                -- short, URL-safe, unique per org
  channel text,                      -- influencer / instagram_ads / google / flyer / other
  partner_name text,                 -- the influencer, if any
  commission_type text,              -- none / flat / percent (optional, for payout reporting)
  commission_value numeric(10,2),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tracking_links_org_code_idx ON tracking_links (org_id, code);
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS tracking_link_id uuid REFERENCES tracking_links(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_tracking_link_idx ON leads (tracking_link_id);
```

- [ ] `/growth/links` — CRUD, copy-link button (reuse `components/ui/copy-link-button.tsx`), archive.
- [ ] **Short redirect** `/r/[orgSlug]/[code]` (public): look up link, set a first-party cookie (`vs_ref=<linkId>`, ~30 days), redirect to the org's micro-site (6.2) or `/book/[slug]`.
- [ ] **Capture**: `/book/[slug]` accepts `?ref=<code>` or reads the cookie; `submitBooking` stores `tracking_link_id` and sets `source` to `website` (keep `source` as the channel enum; the link is the finer attribution).
- [ ] **Manual attribution**: lead create/edit forms get an optional "Tracking link" select, for walk-ins who mention an influencer.
- [ ] Add `/r` to `PUBLIC_PATHS`.

### 6.2 Per-org public micro-website

Schema (one row per org; URLs only for images unless D6 says otherwise):

```sql
CREATE TABLE IF NOT EXISTS org_sites (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  published boolean NOT NULL DEFAULT false,
  headline text,
  tagline text,
  about text,
  phone text,
  whatsapp_number text,              -- for a wa.me click-to-chat button
  address text,
  map_url text,
  hours text,
  hero_image_url text,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{name, description, priceFrom}]
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_sites ENABLE ROW LEVEL SECURITY;
```

- [ ] **Public page `/site/[slug]`** (reuse `organizations.slug`): hero, services grid with "from ₹X", about, hours/address/map link, WhatsApp click-to-chat, embedded booking form (reuse `app/book/[slug]/booking-form.tsx`, passing through the tracking ref). Unpublished → 404. `generateMetadata` for title/description/OG. Mobile-first — this is what influencer traffic lands on.
- [ ] **Editor `/growth/website`**: form for every field, services list editor (add/remove/reorder rows — same interaction pattern as `LineItemsEditor`), publish toggle, "View live site" link. Zod validation; `services` validated as an array schema, not trusted as raw JSON.
- [ ] Design: follow the brand direction in `../docs/landing-page.html` (warm neutrals, `#78BB45` accent, Inter Tight / Inter) but restrained — it's the *business's* site, not Vanspire's marketing page. Consider 2–3 accent presets the owner can pick.
- [ ] Add `/site` to `PUBLIC_PATHS`.
- [ ] Later (not now): custom domains per org (needs Vercel domains API + DNS — defer).

### 6.3 Growth dashboard

- [ ] **`/growth`** — per tracking link, for a date range (reuse `/reports` range picker): clicks (optional — needs a `tracking_link_clicks` table written by `/r/...`; cheap to add, decide with user), leads, booked, conversion rate, **revenue** (payments → invoices → leads.tracking_link_id), and **commission owed** if `commission_type` set.
- [ ] Add a "By tracking link" section to `/reports` too, and a `tracking_link` column to the leads CSV export.
- [ ] Owner-facing summary card on the dashboard: "This month: N leads from partners → ₹X revenue."

**Acceptance:** create a link → open `/r/<slug>/<code>` in a fresh browser → book via the micro-site → lead shows the link → convert, invoice, record payment → `/growth` shows 1 lead, 1 booked, the revenue, and the commission.

---

## WS7 — Automation completion

- [ ] **Lead stage history** (needed for accurate funnels in WS10 and for automations): `lead_stage_changes (id, org_id, lead_id, from_stage, to_stage, changed_by, changed_at)` + RLS; write it from `updateLeadStage`, `convertLeadToCustomer`, and anywhere else stage changes. Backfill not possible for past changes — note that in reports.
- [ ] **Vehicle status automation**: when a lead with a `vehicleId` moves to `booked`, set the vehicle `rented`; when the rental ends (WS9.4 dates) the daily cron sets it back to `available`. Today status is purely manual.
- [ ] **Auto-nudge escalation**: stale leads (Phase 3) escalate to the owner if still stale after 2× `staleLeadDays`.
- [ ] **Unpaid invoice reminders**: daily cron flags invoices `sent`/`partial` older than N days (new org setting `invoiceReminderDays`); in-app notification to owner + optional WhatsApp/email to the customer with the `/invoice/[token]` link (and the WS8.4 pay link).
- [ ] **Notification preferences** per profile: which kinds they get, and via which channel (in-app always; email/WhatsApp optional once WS8 lands).

---

## WS8 — Integrations expansion

Keep the established pattern (`README.md` → Integrations): typed provider interface, real provider + console fallback, per-org encrypted credentials in `integrations`, write-only secrets in the UI, an audit table per channel. Extend `integration_provider` with `ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS '<name>';`.

### 8.1 WhatsApp — required before real messages can go out

- [ ] **Message templates.** Meta only allows free-form text inside the 24-hour customer-service window. Service reminders, campaigns and unpaid-invoice nudges are business-initiated, so **they will be rejected in production** as currently written (`lib/whatsapp/cloud-provider.ts` sends `type: "text"`; the file's own comment flags this). Add `sendTemplate(to, templateName, languageCode, params)` to the provider interface; store per-org template names per message kind (new `integration_settings` jsonb on `integrations`, or a `whatsapp_templates` table); fall back to text only for `ready_for_pickup`/replies. The user must create and get templates approved in Meta Business Suite — give them the exact template bodies/variables to submit.
- [ ] **"Send test message"** button on `/integrations` (to the owner's own number).
- [ ] **Inbound webhook** `/api/webhooks/whatsapp` (verify token handshake + signature) → auto-create a lead from an unknown number, append a `whatsapp` activity for a known lead. This is the highest-leverage lead-capture feature for this market. Update delivery status on `whatsapp_messages`.

### 8.2 Email (D3 — default Resend)

- [ ] `lib/email/{types,resend-provider,console-provider,index}.ts` mirroring `lib/whatsapp/`; `email_messages` audit table (+ RLS).
- [ ] Uses: "Email quote/invoice" buttons on detail pages (link to public page; attach PDF after WS9.2), staff notification digests (WS7 preferences), unpaid-invoice reminders.
- [ ] Integrations card: API key + from-address, test send. Domain verification happens in the provider's dashboard — tell the user.

### 8.3 Staff alert delivery

- [ ] `lib/notifications.ts#notify()` fans out to email/WhatsApp per the recipient's preferences (WS7). Staff need a phone number field on `profiles` for WhatsApp alerts.

### 8.4 Online payments (D2 — default Razorpay)

- [ ] Credentials on `/integrations` (key id, key secret, webhook secret — all encrypted).
- [ ] **Refactor first:** move payment-recording logic out of `app/(app)/invoices/actions.ts#recordPayment` into `lib/billing/payments.ts#applyPayment(orgId, invoiceId, amount, method, meta)` so the webhook and the manual form share the exact same status-transition code.
- [ ] "Pay now" on `/invoice/[token]` → create a payment link for the balance due (verify the current Razorpay Payment Links API in their docs), store `provider_payment_link_id` on `invoices`.
- [ ] Webhook `/api/webhooks/razorpay`: verify the HMAC signature, **idempotency** (unique `provider_payment_id` on `payments`), then `applyPayment`. Add `/api/webhooks` to `PUBLIC_PATHS` — signature verification is the auth.
- [ ] Add `upi`/`card` method mapping from the gateway payload; add `online` source flag to payments.

### 8.5 Integrations page redesign

- [ ] Card grid: WhatsApp, Email, Payments (and future), each with status badge, connect/update/disconnect, test action, and a "what this powers" line. Owner-only edits (existing rule).

---

## WS9 — Billing & inventory enhancements

- [ ] **9.1 Org billing profile + GST compliance (D4)**: legal name, GSTIN, address, state, logo URL, invoice terms/footer on `organizations` (or `org_billing_profiles`). Optional per-line HSN/SAC code; CGST+SGST vs IGST split based on place of supply. Show on public quote/invoice pages. Confirm the required format with the user's accountant before building the split.
- [ ] **9.2 PDF / print**: low-cost first — a print stylesheet on `/quote/[token]` and `/invoice/[token]` plus a "Download PDF" button using `window.print()`. Server-generated PDF (for email attachments) only if WS8.2 needs it; evaluate a library then.
- [ ] **9.3 Stock-linked line items (D5)**: line items optionally reference `stock_item_id` (new nullable column on `invoice_items`/`quotation_items`); the line-item editor gets a "pick from inventory" option that fills description/price. On invoice create (per D5), write a `usage` stock movement per linked line via the existing `recordStockMovement` logic (refactor it into `lib/inventory/` so it's callable outside the action); reverse on void/delete.
- [ ] **9.4 Rental date ranges & vehicle availability**: `rental_start`/`rental_end` on leads (or a `bookings` table if a lead can span several vehicles — ask); conflict check when assigning a vehicle; `/vehicles/calendar` week view; per-day rate × days pre-fills the quotation.
- [ ] **9.5 Quotation acceptance by the customer**: "Accept" / "Request changes" buttons on `/quote/[token]` → status `accepted` + owner notification. Public mutation keyed on the token only; rate-limit it.
- [ ] **9.6 Credit notes / refunds** (partial reversal of a paid invoice) — ask whether needed before building.

---

## WS10 — Business intelligence upgrades

- [ ] Rebuild conversion metrics on `lead_stage_changes` (WS7): true point-in-time funnel (new → contacted → quoted → booked), time-to-convert, drop-off per stage. Keep the old approximation labelled for periods before history existed.
- [ ] Add a lightweight chart component (bars/line) — no heavy library unless justified — for revenue trend and lead volume.
- [ ] Previous-period comparison deltas on every KPI.
- [ ] Date-range-filtered CSV export as an *additional* option (current full export stays — see `CLAUDE.md`).
- [ ] Outstanding receivables report (sum of `total - amountPaid` for `sent`/`partial`, aging buckets 0–30/31–60/60+).

---

## WS11 — Observability, backups, operations

- [ ] **Error monitoring (D7)**: Sentry for Next.js — check the current SDK's Next 16 / `proxy.ts` support in their docs before installing. Capture server action errors and route handler errors; scrub PII (phone numbers, emails) before send.
- [ ] Structured logging helper; log every cron run's result object.
- [ ] `/api/health` (public, no data): DB reachability check for uptime monitoring.
- [ ] **Backups**: Supabase free tier has no point-in-time recovery. Minimum viable: a scheduled GitHub Action running `pg_dump` against a read-only role, storing encrypted artifacts with a retention limit — or upgrade the Supabase plan. Document restore steps in `db/BACKUPS.md` and **test a restore** into a scratch DB.
- [ ] Audit log for sensitive owner actions (integration changes, team changes, invoice void/delete).

---

## WS12 — Environments & deployment (D1)

- [ ] If D1 = separate: create a production Supabase project, replay all schema via a consolidated SQL script built from `db/schema.ts` (write it as `db/sql/000_full_schema.sql`, RLS included), point Vercel Production env vars at it, keep the current project for Preview/dev.
- [ ] Consolidate the migration story: now that schema is stable, generate a baseline with `npm run db:generate` (it doesn't touch the DB, so it works despite the `db:push` bug) and keep hand-applied SQL files numbered under `db/sql/` going forward, so a new environment can be rebuilt deterministically.
- [ ] Vercel: env var matrix per environment (table in `README.md`), cron only on Production, preview deployments pointed at the non-prod DB.
- [ ] Custom domain + update `NEXT_PUBLIC_APP_URL` and Supabase auth redirect URLs.

---

## WS13 — Accessibility & polish

- [ ] Every form input has a `<label>` (most do via `Label`), errors linked with `aria-describedby`, `role="alert"` already used for form errors — keep consistent.
- [ ] Visible focus styles on all interactive elements (`Button`, `Select`, links in lists); dialogs trap focus and return it on close (native `<dialog>` mostly handles this — verify).
- [ ] Status badges don't rely on color alone (they include text — keep it that way).
- [ ] Color contrast check on `text-faint` (`#9a978a` on `#fbfaf6` is likely below 4.5:1 for body text — use `text-muted` for anything meaningful).
- [ ] `lang`, page `<title>`s per route via `metadata`.

---

## Global definition of done

A workstream is done when:

1. Its checklist items here are ticked, and the matching `ROADMAP.md` line updated.
2. Lint clean, build clean, tests green (WS2 onward).
3. Any new table has RLS enabled and passed the anon REST check.
4. Every query is org-scoped; every public route is scoped by its own token/slug.
5. Real-DB round-trip verified with test data cleaned up.
6. UI verified in a browser at desktop and mobile width, **or** the handoff states plainly that it wasn't.
7. `README.md` / `CLAUDE.md` updated with anything a future session would otherwise have to rediscover.
8. Committed (one commit per coherent piece, message explains *why*) and pushed to `origin main`. No secrets in the diff.

## Suggested session breakdown

Each line is roughly one focused session. Stop and hand back at each boundary with a short summary of what shipped, what was verified, and what's unverified.

1. WS1 (hardening) + WS2 (test harness)
2. WS3 (UX foundations)
3. WS4 (responsive shell + nav + dashboard refresh)
4. WS5 (signup, reset, invites, onboarding)
5. WS6.1 + WS6.2 (tracking links + micro-site)
6. WS6.3 + WS7 (growth dashboard, stage history, automations)
7. WS8.1 + WS8.2 (WhatsApp templates/webhook, email)
8. WS8.4 + WS8.5 (payments, integrations redesign)
9. WS9 (billing/inventory enhancements)
10. WS10 + WS11 + WS12 + WS13 (BI upgrades, ops, environments, a11y)
