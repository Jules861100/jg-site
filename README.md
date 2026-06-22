# TraJeKt

Product Passport network for fragrance launches. Brands and suppliers share
spec sheets, BAT/packshot versions, and lead times on a single multi-tenant
platform.

## Stack

- Next.js (App Router) + Tailwind
- Supabase (Postgres, Auth, Row-Level Security)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project keys
npm run dev
```

Apply the database schema with the Supabase CLI:

```bash
supabase db push
```

## Structure

- `supabase/migrations/` — schema, RLS policies, `current_org_id()`,
  the "last BAT" unique index, and the `get_shared_sheet` / `publish_document`
  RPCs.
- `src/app/` — marketing landing (`/`), auth (`/login`), brand space
  (`/brand`), supplier space (`/supplier`), and the public share link
  (`/share/[token]`).
- `src/app/api/onboard/` — server-only org/profile creation using the
  `service_role` key.
- `src/lib/verification/rules.ts` — rule-based pre-PO checks (stale BAT,
  missing Pantone, deadline at risk).
