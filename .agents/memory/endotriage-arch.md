---
name: EndoTriage architecture
description: Key non-obvious decisions in the EndoTriage clinical app that future sessions should stay consistent with.
---

## Rules

1. **Contract-first**: Always edit `lib/api-spec/openapi.yaml` first, then run `pnpm --filter @workspace/api-spec run codegen`. Never write raw fetch calls in the frontend — use the generated React Query hooks from `@workspace/api-client-react`.

2. **Triage algorithm dual location**: The canonical triage score calculation lives in `artifacts/api-server/src/routes/assessments.ts` and is stored in the DB. The frontend `AssessmentWizard.tsx` has a mirrored client-side version for the live preview only. Keep them in sync when modifying scoring logic.

3. **Array columns as JSON strings**: `management_plans.medications`, `management_plans.surgical_options`, `management_plans.lifestyle_recommendations`, and `medications.approved_stages` are stored as `text` columns containing JSON arrays. The server parses/stringifies them. The client receives them already parsed (the server does `JSON.parse` before returning).

4. **Routing**: Frontend served at `/` (endo-app, port from $PORT). API served at `/api` (api-server, port 8080). The shared Replit proxy handles routing — no Vite proxy config needed.

5. **Activity log**: Append-only table. Populated by server route handlers on assessment creation, plan creation, and plan updates. Dashboard `/api/dashboard/recent-activity` reads from it.

**Why:** These decisions were made during initial build and are load-bearing for the data flow and API contract shape. Changing any of them requires updating both server and client.
