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

**WhatsApp still isn't sending real messages, but connecting it no longer needs code.** Originally this was gated on someone editing Vercel env vars; now the workspace owner connects their own Meta WhatsApp Business account directly at **Settings → Integrations** (`/integrations`) — see the Integrations section below. Until that's done, everything still runs end-to-end on the console-log fallback (messages logged, not sent).
`NEXT_PUBLIC_APP_URL` is unset but not blocking — `lib/site.ts` falls back to Vercel's `VERCEL_URL` automatically, so booking/status links in messages already resolve correctly in production. Only set it explicitly if a custom domain is added.

---

## Phase 3 — Automation

- [x] Notification/reminder engine — one consolidated Vercel Cron job (`/api/cron/daily`), deliberately kept to a single route to stay within free-tier cron quotas rather than one job per concern
- [x] Task reminders for staff — in-app only for now (`notifications` table, sidebar unread badge, `/notifications` page); WhatsApp/email left as a later add-on, see note below
- [x] Configurable follow-up workflows — org-editable `staleLeadDays` (Settings page); a lead untouched that long (stage not booked/lost) gets an in-app nudge for its assignee, or the owner if unassigned
- [x] Activity/notification feed — `/notifications`, mark-one/mark-all read, deduped so the daily cron never spams the same still-true condition

**Low-cost by design:** no new paid services added. Reused the existing Vercel Cron + Postgres + WhatsApp-abstraction infra from Phases 1–2. In-app notifications only for now — wiring staff WhatsApp/email alerts later just means calling the already-built `sendWhatsApp()` (or adding an email provider like Resend's free tier) from inside `notify()`, once there's a real reason to.

---

## Cross-phase — Integrations page (no-code connections)

- [x] `integrations` table — per-org, per-provider credentials, encrypted at rest (`lib/crypto.ts`, AES-256-GCM)
- [x] `/integrations` page — owner-only connect/update/disconnect form; staff see read-only status
- [x] WhatsApp credential resolution updated: org's own connection → shared env-var fallback → console logging
- [x] Access tokens are write-only in the UI — saved value is never sent back to the browser, only replaced

This closes the gap where every external integration across Phases 1–3 (in practice, just WhatsApp so far) could only be configured by someone with Vercel/code access. **To actually connect WhatsApp:** sign in as the owner, go to Settings → Integrations, paste the Phone Number ID and Access Token from Meta Business Suite. No redeploy needed — takes effect on the next message sent.

The pattern (typed provider interface + DB-backed per-org credentials + encrypted storage + write-only UI) is what to follow for the next integration, whatever it turns out to be (email, SMS, payments in Phase 4).

---

## Phase 4 — Billing & Payments

- [x] Quotation creation — `/quotations`, from scratch or prefilled from a lead (`/quotations/new?leadId=`); shareable public link at `/quote/[token]`, no login
- [x] Invoice creation (GST + non-GST) — `/invoices`, from scratch or prefilled from a customer (`/invoices/new?customerId=`); public link at `/invoice/[token]`
- [x] Payment tracking — record/remove payments against an invoice; status auto-computed (draft/sent → partial → paid) from `amountPaid` vs `total`, never set by hand
- [x] Billing history per customer — Billing card on the customer detail page, linked invoices with status + total
- [ ] Inventory/stock tracking — **still not built, deliberately.** This item was already flagged "optional — validate demand before building," and that caveat turned out to be load-bearing: what "stock" even means differs completely between a rental business (the vehicles themselves — availability calendars, not consumable counts) and a service center (parts/consumables — reorder points, supplier costs). Building either without knowing which this is would be guessing at a data model, not shipping a feature. Ask when there's a concrete need and which shape it should take.

**Design notes:**
- Quotations and invoices are separate tables, not one "documents" table with a type flag — their lifecycles genuinely differ (a quotation is draft/sent/accepted/declined; an invoice additionally tracks payment). Converting a quotation copies it into a new invoice row rather than mutating in place, so the original quote stays intact.
- Money is stored as `numeric(12,2)`, not floats — line-item amounts and document totals are computed once server-side (`lib/billing/money.ts`) and persisted, never recalculated live from history.
- Document numbers (`QUO-0001`, `INV-0001`) come from a per-org counter incremented in one atomic `UPDATE ... RETURNING` (`lib/billing/numbering.ts`) — safe against two staff creating documents at the same moment, no gaps-vs-races tradeoff to reason about.
- The line-item editor (`components/billing/line-items-editor.tsx`) is shared between quotations and invoices — add/remove rows, live subtotal/GST/total, one hidden JSON field the server parses with the same Zod schema either document type uses.

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
