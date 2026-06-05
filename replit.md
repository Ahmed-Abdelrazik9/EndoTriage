# EndoTriage

A full-stack clinical endometriosis triaging and management application for healthcare providers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routed to /api)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/endo-app) — routed to /
- API: Express 5 (artifacts/api-server) — routed to /api
- DB: PostgreSQL + Drizzle ORM (lib/db)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec → lib/api-spec/openapi.yaml)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (patients, assessments, management_plans, medications, activity_log)
- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec
- `lib/api-client-react/` — generated React Query hooks (from codegen)
- `lib/api-zod/` — generated Zod schemas (from codegen)
- `artifacts/api-server/src/routes/` — Express route handlers (patients, assessments, management-plans, medications, dashboard)
- `artifacts/endo-app/src/pages/` — React page components
- `artifacts/endo-app/src/index.css` — CSS theme (deep rose HSL palette)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas. Never write fetch calls directly.
- Triage scoring algorithm lives in both the server (canonical, stored in DB) and the frontend (client-side live preview in AssessmentWizard).
- Management plan arrays (medications, surgicalOptions, lifestyleRecommendations) stored as JSON strings in text DB columns; server parses/stringifies on read/write.
- All routes served through the shared Replit reverse proxy: frontend at `/`, API at `/api`. No Vite proxy needed.
- Activity log is append-only; populated by server routes on assessment/plan create.

## Product

- **Patient registry** — register patients with demographics, search/filter by name, stage, triage level
- **Symptom assessment wizard** — 4-step guided assessment capturing 5 pain scores, risk factors, QoL; live triage score preview
- **Triage classification** — scored algorithm produces Urgent/High/Moderate/Routine with Stage I–IV suggestion
- **Management plan builder** — select approach (medical/surgical/combined/watchful waiting), pick from medication library, surgical options, lifestyle recommendations
- **Medication reference library** — 10 approved medications with mechanism, dosage, contraindications, side effects, evidence level (A/B/C), and approved stages
- **Dashboard** — stat cards, triage breakdown bar chart, stage distribution pie chart, recent activity feed

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before touching frontend hooks.
- `pnpm run typecheck` after any lib change; don't rely on editor LSP alone.
- Medications `approvedStages` stored as a JSON string array; client must parse it (the server returns it already parsed).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
