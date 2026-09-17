# Vanspire OS — Build Roadmap

Living checklist for what's built vs. what's next. Check items off as they ship — this file is the source of truth for progress, not a one-time plan.

Phases build on each other; within a phase, items are roughly in build order but not strict.

---

## Phase 0 — Foundation

- [x] Next.js 16 (App Router) + TypeScript + Tailwind v4 scaffold
- [x] Supabase project (Postgres + Auth) wired via `@supabase/ssr`
- [x] Drizzle ORM schema + migrations workflow (`db:push` / `db:generate` / `db:migrate`)
- [x] Multi-tenant data model (`organizations` + `orgId` on every table)
- [x] `requireUser()` — session → org-scoped profile resolution
- [x] Auth gate (`proxy.ts`) — redirects signed-out visitors, refreshes session
- [x] Design tokens (color, type) + `components/ui/` primitives (Button, Card, Input, Select, Badge)
- [x] App shell — sidebar nav, sign-out
- [x] Dev seed script (`db:seed`) to link a Supabase auth user to an org
- [x] Pushed to GitHub (`cortex1111inc/karr`)
- [x] Deployed to Vercel and working end-to-end (env vars + pooled `DATABASE_URL` configured)
- [x] Production Supabase project separated from dev/local — **decision: staying on one shared project for now** (single-user testing phase); revisit before real customer data goes in
- [x] `CRON_SECRET` generated and set (locally in `.env`; **still needs adding to Vercel** → Project Settings → Environment Variables)
- [x] Git commit author fixed to use real email instead of machine hostname

---

## Phase 1 — Lead & CRM Core

- [x] Lead pipeline board (New → Contacted → Quoted → Booked → Lost)
- [x] New-lead capture (name, phone, enquiry, source)
- [x] Stage changes logged to activity history
- [x] Dashboard with live counts (new leads, follow-ups due, booked)
- [x] Customers list (read-only)
- [x] Lead detail page (full activity timeline, notes, edit fields)
- [x] Assign leads to staff (picker, not just "assigned to me")
- [x] Follow-up reminders — set a `followUpAt` date on a lead, surface "due today/overdue" on dashboard and in the board
- [x] Manual "convert to customer" action (lead → `customers` row, keeps history linked)
- [x] Lead search / filter (by stage, source, assignee, date range)
- [x] Customer detail page (profile, vehicle info, full booking/service history, linked leads)
- [x] Edit/delete customer records
- [x] Staff management (invite teammates, assign role: owner/staff)

---

## Phase 2 — Customer Retention

- [x] WhatsApp integration — WhatsApp Cloud API, behind a provider interface (`lib/whatsapp/`) with a console-log fallback so the app works without live credentials; every send audited in `whatsapp_messages`
- [x] Automated "vehicle received" message — fires on lead → customer conversion
- [x] "Ready for pickup" message + status link — one-click staff action on the lead detail page (not state-machine-automatic yet; there's no distinct "job complete" stage until Phase 4 billing exists)
- [x] Service/rental due-date tracking per customer (`nextServiceDueAt`, org-configurable `serviceIntervalDays`)
- [x] Automated reminder — daily Vercel Cron (`/api/cron/service-reminders`), org-configurable message text with `{{name}}` personalization
- [x] Repeat-customer campaign tool (`/campaigns` — audience = all or due-for-service, logged to `campaigns`)
- [x] Slot booking link — public page at `/book/[org-slug]`, no login
- [x] Customer-facing status page — public page at `/status/[token]`, no login

**WhatsApp is on the console-log fallback by design, for now** — decided to hold off wiring up real send until there's a Meta WhatsApp Business account to connect. Everything else runs end-to-end (messages logged, not sent). To go live: set `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` (see `.env.example`).
`NEXT_PUBLIC_APP_URL` is unset but not blocking — `lib/site.ts` falls back to Vercel's `VERCEL_URL` automatically, so booking/status links in messages already resolve correctly in production. Only set it explicitly if a custom domain is added.

---

## Phase 3 — Automation

- [ ] Notification/reminder engine (scheduled jobs — evaluate Vercel Cron vs. Supabase Edge Functions + pg_cron)
- [ ] Task reminders for staff (e.g. "follow up with lead X today") — in-app + optional WhatsApp/email
- [ ] Configurable follow-up workflows (e.g. auto-nudge a lead untouched for N days)
- [ ] Activity/notification feed (in-app, per user)

---

## Phase 4 — Billing & Payments

- [ ] Quotation creation (from a lead, PDF/shareable link)
- [ ] Invoice creation (GST + non-GST), linked to a customer/booking
- [ ] Payment tracking (paid/partial/unpaid status per invoice)
- [ ] Billing history per customer
- [ ] Basic inventory/stock tracking (optional — validate demand before building)

---

## Phase 5 — Business Intelligence

- [ ] Sales dashboard (leads in, conversion rate, revenue — replacing today's placeholder counts)
- [ ] Lead source analytics (which channel converts best)
- [ ] Staff performance (leads handled, conversion rate per staff member)
- [ ] Revenue visibility (by period, by service/rental type)
- [ ] Exportable reports (CSV at minimum)

---

## Phase 6 — Growth Module (from the original offer)

- [ ] Per-org public micro-website / landing page (booking form, service list)
- [ ] Lead source tagging for influencer/marketing campaigns
- [ ] Lead tracking dashboard for the owner (leads in → converted → revenue, filterable by campaign)

---

## Ongoing / Cross-cutting

- [ ] Error monitoring (e.g. Sentry) in production
- [ ] Automated tests for Server Actions and auth/org-scoping (the highest-risk area — a bug here leaks data across tenants)
- [ ] Mobile-responsive pass on every page (pipeline board especially — currently desktop-oriented)
- [ ] Accessibility pass (keyboard nav, focus states, screen reader labels)
- [ ] Backup/restore plan for the database
