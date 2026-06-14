# OnePulse Porteføljeverktøy

A full-stack Norwegian portfolio management and impact measurement SaaS for teams of 5–20 managing digitalization/AI projects. Authenticated with Clerk, powered by Claude AI, with PDF/Excel export.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/oneco run dev` — run the frontend (port 20505, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY` (optional — AI degrades gracefully)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/oneco), wouter router, shadcn/ui, recharts, Tailwind 4
- API: Express 5 (artifacts/api-server, port 8080)
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (Replit-managed)
- AI: Anthropic Claude (claude-opus-4-5)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, projects, tasks, activity, effects, costs, links, audit)
- `artifacts/api-server/src/routes/` — Express route handlers (users, projects, tasks, activity, effects, costs, links, portfolio, ai, reports, audit)
- `artifacts/oneco/src/pages/` — React pages (portfolio, projects, project-detail, my-work, admin, home)
- `artifacts/oneco/src/components/` — Shared UI components

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod validators. Never edit generated files.
- Codegen post-processes `lib/api-zod/src/index.ts` to strip the barrel types export (Orval regenerates it with a stale types ref — the `printf` in codegen script is intentional).
- Clerk proxy middleware runs before Express body parsers; uses `publishableKeyFromHost` for multi-domain support.
- AI routes gracefully degrade with a fallback response when `ANTHROPIC_API_KEY` is absent.
- Role-based access: `systemRole` on users table (`admin` | `user`). Project-level roles in `project_members` (`prosjektleder` | `medlem`).

## Product

- **Portfolio dashboard** — KPI cards, 4 interactive charts (savings timeline, status pie, unit bar, savings by project)
- **Project CRUD** — full lifecycle, status tracking, business unit, goal/savings targets
- **Project detail** — tabs: Dashboard, Tasks (kanban + list), Activity log, Effects/savings, Costs, Documents
- **Kanban tasks** — drag status, priority, assignee, due date, overdue highlighting
- **Effect tracking** — savings entries with AI text parsing (`Tolk fritekst`)
- **AI features** — project status summary, portfolio chat panel, effect text parser (all via Claude)
- **Role-based access** — admin panel for user management + audit log; project member roles
- **Exports** — Excel portfolio report, HTML project report

## User preferences

- Norwegian language throughout the UI
- Primary brand color: #4A1F55 (deep purple)
- Inter font, clean modern sans-serif hierarchy
- Left sidebar navigation, responsive mobile
- No emojis in the UI

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- The codegen script patches `lib/api-zod/src/index.ts` after Orval — this is intentional, do NOT revert
- Query hooks require explicit `queryKey` in the `query` options object (React Query v5)
- Hook args: `useListTasks(projectId, params?, options?)` — first arg is always a `number`, not `{projectId}`
- Mutation args: `useUpdateTask().mutate({ projectId, id, data })` — `projectId` is always required

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/clerk-auth/` for Clerk configuration details
