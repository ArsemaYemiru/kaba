# Feta Show (ፈታ)

Public site + admin CMS for Feta, the Ethiopian celebrity game show. Next.js 16 app in `apps/web` (pnpm workspace).

> Work in progress, built phase by phase. Plan: [`docs/PLAN.md`](docs/PLAN.md) · decisions: [`DECISIONS.md`](DECISIONS.md). Full setup docs arrive in Phase 8.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm db:up        # Postgres 16 in Docker (used from Phase 2)
pnpm dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev / production build / serve |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint / route types + `tsc` / Vitest unit tests |
| `pnpm test:e2e` | Playwright against a production build (run `pnpm build` first) |
| `pnpm screens` | Styleguide screenshots → `docs/screens/` (build with `ENABLE_STYLEGUIDE=1`) |

The hidden component gallery lives at `/styleguide` (dev, or production builds made with `ENABLE_STYLEGUIDE=1`).
