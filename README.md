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

> Next.js 16 renamed `middleware.ts` → `proxy.ts` and other conventions changed from what most training data expects. Before touching routing/proxy/caching code, check `node_modules/next/dist/docs/` rather than assuming prior knowledge — see `AGENTS.md`.

## Getting started

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `DATABASE_URL` — Project Settings → Database → Connection string (URI)
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (used only by `db/seed.ts`, never shipped to the client)
3. Install dependencies and push the schema:
   ```bash
   npm install
   npm run db:push
   ```
4. Create your first user in the Supabase dashboard (Authentication → Users → Add user), then link them to a workspace:
   ```bash
   npm run db:seed -- "you@business.com" "Your Name" "Your Business"
   ```
5. Run the app:
   ```bash
   npm run dev
   ```
   Sign in at `http://localhost:3000/login`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push the Drizzle schema straight to the database (fast iteration, dev only) |
| `npm run db:generate` | Generate a SQL migration file from schema changes |
| `npm run db:migrate` | Apply generated migrations (use this in place of `db:push` once you have real data) |
| `npm run db:studio` | Open Drizzle Studio to browse data |
| `npm run db:seed` | Link a Supabase auth user to a new organization |

## Project structure

```
app/
  login/              Public sign-in route (see proxy.ts for the auth gate)
  (app)/              Authenticated app shell — layout.tsx calls requireUser()
    dashboard/
    leads/            Lead pipeline: page.tsx (server) + pipeline-board.tsx (client) + actions.ts
    customers/
db/
  schema.ts           Drizzle schema — source of truth for the data model
  index.ts            Drizzle client (server-only)
  seed.ts             Dev-only: link a Supabase auth user to an org
lib/
  auth.ts             requireUser() — resolves the session to an org-scoped profile
  supabase/           Supabase clients: client.ts (browser), server.ts (RSC/actions), proxy.ts (proxy.ts helper)
  utils.ts            cn() class-merging helper
components/
  ui/                 Primitive components (Button, Card, Input, Badge, Select…)
  layout/             Shared layout pieces (PageHeader)
proxy.ts              Auth gate — redirects signed-out visitors, refreshes the session cookie
drizzle.config.ts     drizzle-kit config
```

## Conventions

- **Every table except `organizations` carries `orgId`.** This is a multi-tenant app — one row in `organizations` per rental/service business. Every query must filter by the signed-in user's `orgId` (from `requireUser()`), never trust an ID from the client alone.
- **Data access is server-only.** Pages fetch with Drizzle directly in Server Components; mutations go through Server Actions in each feature's `actions.ts`. No client-side data fetching, no API routes for CRUD — only reach for a Route Handler when something genuinely needs a plain HTTP endpoint (webhooks, etc).
- **Feature folders, not layer folders.** Route segments under `app/(app)/` own their `actions.ts` and any components specific to them (e.g. `leads/pipeline-board.tsx`). Only put something in `components/` when a second feature needs it.
- **`components/ui/` stays framework-free.** Primitives take `className` and forward props; no business logic, no data fetching.
- **Validate at the boundary.** Server Actions parse `FormData` with Zod before touching the database; trust the parsed value everywhere downstream.
- **Design tokens live in `app/globals.css`.** Colors, fonts — change the palette there, not by hardcoding hex values in components.

## Adding a new feature

1. Add/extend tables in `db/schema.ts`, run `npm run db:push` (or `db:generate` + `db:migrate` once there's real data to protect).
2. Create the route under `app/(app)/<feature>/` with `page.tsx` (server-rendered, scoped to `requireUser().orgId`) and `actions.ts` for mutations.
3. Add the nav entry in `app/(app)/nav-links.tsx`.
4. Reuse `components/ui/*` before adding new primitives.
