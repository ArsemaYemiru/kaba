# kaba

pnpm monorepo:

| App | Path | Stack | Port |
| --- | --- | --- | --- |
| web | `apps/web` | Next.js 16 (App Router, Tailwind 4, React 19) | 3000 |
| api | `apps/api` | NestJS 12 + Prisma 7 (PostgreSQL via `@prisma/adapter-pg`) | 4000 |

## Requirements

- Node.js >= 22
- pnpm 10 (`corepack enable`)
- Docker (for the local Postgres), or your own PostgreSQL

## Getting started

```bash
pnpm install                         # installs everything + generates the Prisma client
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up                           # starts Postgres in Docker
pnpm db:migrate                      # applies Prisma migrations
pnpm dev                             # runs web + api together
```

- Web: http://localhost:3000
- API: http://localhost:4000 (e.g. `GET /users`, `POST /users`)

## Root scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Runs web and api in parallel (watch mode) |
| `pnpm dev:web` / `pnpm dev:api` | Run only one app |
| `pnpm build` | Builds api then web |
| `pnpm start` | Runs the production builds |
| `pnpm lint` / `pnpm test` | Lint all apps / run api tests |
| `pnpm db:up` / `pnpm db:down` | Start / stop the Postgres container |
| `pnpm db:migrate` | `prisma migrate dev` (create + apply migrations) |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Open Prisma Studio |

## Prisma notes

- Schema: `apps/api/prisma/schema.prisma`; config: `apps/api/prisma.config.ts` (Prisma 7 reads `DATABASE_URL` from there, not from the schema).
- The client is generated into `apps/api/src/generated/prisma` (git-ignored) and is injected via `PrismaService`.
