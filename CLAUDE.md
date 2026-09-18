@AGENTS.md

# Vanspire OS

CRM/lead-management/retention/billing platform for car rental and service businesses. See `README.md` for setup, stack, and project structure — read it before making structural changes.

Quick facts an agent needs before editing:

- **Multi-tenant.** Every table except `organizations` has `orgId`. Every query must scope to `requireUser().orgId` — never trust a client-supplied org/customer/lead ID without also filtering by it.
- **Data layer is server-only.** Server Components fetch with Drizzle directly; mutations are Server Actions in each feature's `actions.ts`. Don't add API routes for CRUD.
- **File convention is `proxy.ts`, not `middleware.ts`** (Next.js 16 renamed it — see AGENTS.md above). Don't reintroduce a `middleware.ts`.
- `npm run db:push` crashes against this project's Supabase instance (a drizzle-kit introspection bug, unrelated to schema content). Schema changes go through hand-written SQL instead — see `db/MIGRATIONS.md` before touching `db/schema.ts`. Confirm with the user before applying any schema-changing SQL to a real (non-empty) database.
- Direct `postgres`/Supabase connections from this network occasionally throw `ECONNRESET` on the first attempt (confirmed transient — retry succeeds). Don't treat a single `ECONNRESET` as a code bug; retry once before investigating further.
- **Public routes are the exception.** Only `/login`, `/book/[slug]`, `/status/[token]`, `/api/cron/*` bypass the auth gate (`lib/supabase/proxy.ts` → `PUBLIC_PATHS`). Never fetch or mutate org data on a public route without scoping through the resource's own lookup key (org slug, lead's public token) — there's no `requireUser()` to fall back on there.
- **Outbound WhatsApp always goes through `lib/whatsapp/sendWhatsApp()`**, never a direct fetch to Meta's API from feature code — it's what keeps every send audited in `whatsapp_messages` and keeps the app working without live credentials (console fallback). Follow the same provider-interface pattern for any other external channel (SMS, email) added later.
- **Third-party credentials go in the `integrations` table via `/integrations`, not env vars.** Env vars (`WHATSAPP_*`) are only the shared fallback when no org has connected its own. New integration = new row type there, encrypted with `lib/crypto.ts` (`encryptSecret`/`decryptSecret`) before it touches the DB — never store a raw token/secret in a text column, and never echo a saved secret back to the client (the form only accepts a replacement, never displays the old value).
- Design tokens (colors, fonts) live in `app/globals.css` under `@theme inline` — extend there, don't hardcode hex values in components.
