# Kinwell — Parenthood MVP

A reassuring companion for first-time parents across preparation, pregnancy, and the first year. Help people understand what might be happening now or soon, prepare, and then coordinate care. Shared coordination supports this purpose; it is not the primary product.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/together/` — responsive application.
- `artifacts/api-server/src/routes/together.ts` — protected family API.
- `lib/db/src/schema/together.ts` — relational household, membership, record, invitation and audit model.
- `lib/api-spec/openapi.yaml` — API source of truth.
- `docs/SETUP.md` — setup, privacy, integration and public-launch limitations.
- `attached_assets/parenthood-mvp-build-brief_1793737534630.md` — user-supplied product brief.

## Architecture decisions

- Private adult records are not implicitly accessible to household administrators.
- Demo households are isolated from authenticated families and reset without deleting real-user records.
- Google Calendar remains explicitly disconnected with manual scheduling and ICS export until per-user OAuth is configured.
- Clinical and local content is sample material; production health-related launch requires qualified review.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
