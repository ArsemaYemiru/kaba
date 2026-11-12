# Feta Show (ፈታ)

Public site + admin CMS for Feta, the Ethiopian celebrity game show. Next.js 16 app in `apps/web` (pnpm workspace).

> Work in progress, built phase by phase. Plan: [`docs/PLAN.md`](docs/PLAN.md) · decisions: [`DECISIONS.md`](DECISIONS.md). Full setup docs arrive in Phase 8.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # then set BETTER_AUTH_SECRET (32+ chars)
pnpm db:up        # Postgres 16 in Docker on 127.0.0.1:5435
pnpm db:migrate   # create the tables
pnpm db:seed      # sample content + admin logins (prints them at the end)
pnpm dev          # http://localhost:3000
```

## Admin logins (development)

Sign in at http://localhost:3000/admin/login.

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `admin@fetashow.com` | `Feta#Admin2026` |
| Editor | `editor@fetashow.com` | `Feta#Editor2026` |

- You must set a new password on first login (at least 12 characters, not one of these defaults).
- Forgot it? `pnpm --filter web admin:reset-password admin@fetashow.com` restores the default above and asks for a new one again at next login.
- These defaults are for local development only. In production, set `SEED_ADMIN_PASSWORD` and `SEED_EDITOR_PASSWORD`; the seed refuses to use the defaults when `NODE_ENV=production`.
- Super admins can do everything. Editors manage content but can't open Users or Site Settings.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js dev / production build / serve |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint / route types + `tsc` / Vitest unit tests |
| `pnpm test:e2e` | Playwright against a production build (run `pnpm build` first) |
| `pnpm screens` | Styleguide screenshots → `docs/screens/` (build with `ENABLE_STYLEGUIDE=1`) |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:reset` | Apply migrations / seed (safe to re-run) / drop, migrate and seed |

The hidden component gallery lives at `/styleguide` (dev, or production builds made with `ENABLE_STYLEGUIDE=1`).
