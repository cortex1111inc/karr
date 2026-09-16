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
- [ ] Production Supabase project separated from dev/local (or documented single-project flow)

---

## Phase 1 — Lead & CRM Core

- [x] Lead pipeline board (New → Contacted → Quoted → Booked → Lost)
- [x] New-lead capture (name, phone, enquiry, source)
- [x] Stage changes logged to activity history
- [x] Dashboard with live counts (new leads, follow-ups due, booked)
- [x] Customers list (read-only)
- [ ] Lead detail page (full activity timeline, notes, edit fields)
- [ ] Assign leads to staff (picker, not just "assigned to me")
- [ ] Follow-up reminders — set a `followUpAt` date on a lead, surface "due today/overdue" on dashboard and in the board
- [ ] Manual "convert to customer" action (lead → `customers` row, keeps history linked)
- [ ] Lead search / filter (by stage, source, assignee, date range)
- [ ] Customer detail page (profile, vehicle info, full booking/service history, linked leads)
- [ ] Edit/delete customer records
- [ ] Staff management (invite teammates, assign role: owner/staff)

---

## Phase 2 — Customer Retention

- [ ] WhatsApp integration (choose provider: WhatsApp Cloud API vs. a BSP like Gupshup/Interakt)
- [ ] Automated "vehicle received" message on booking
- [ ] Automated "ready for pickup" message + bill link on completion
- [ ] Service/rental due-date tracking per customer (interval configurable per business)
- [ ] Automated 30-day-after reminder with optional offer text
- [ ] Repeat-customer campaign tool (manual send to a filtered customer segment)
- [ ] Slot booking link (public page, no login) — customer picks an open time
- [ ] Customer-facing status page (view booking/service stage via link, no account needed)

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
