@AGENTS.md

# Vanspire OS

CRM/lead-management/retention/billing platform for car rental and service businesses. See `README.md` for setup, stack, and project structure — read it before making structural changes.

Quick facts an agent needs before editing:

- **Multi-tenant.** Every table except `organizations` has `orgId`. Every query must scope to `requireUser().orgId` — never trust a client-supplied org/customer/lead ID without also filtering by it.
- **Data layer is server-only.** Server Components fetch with Drizzle directly; mutations are Server Actions in each feature's `actions.ts`. Don't add API routes for CRUD.
- **File convention is `proxy.ts`, not `middleware.ts`** (Next.js 16 renamed it — see AGENTS.md above). Don't reintroduce a `middleware.ts`.
- Before running `npm run db:push` / `db:generate` / `db:migrate` against a real (non-empty) database, confirm with the user — these are schema-affecting and `db:push` can be destructive.
- Design tokens (colors, fonts) live in `app/globals.css` under `@theme inline` — extend there, don't hardcode hex values in components.
