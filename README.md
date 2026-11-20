# Feta Awards (ፈታ)

The official Feta Awards website, which recognizes Ethiopian artists genre by genre.
Each yearly edition has genre categories such as Classical, Bati and Afrobeat. Staff place artists into them, each with a citation and an optional featured work.
Every artist in a genre is honored equally: there is no public voting and there are no winners.

It is a Next.js 16 app in `apps/awards` (a pnpm workspace) with an admin CMS. Only staff have accounts.

```bash
pnpm install
pnpm db:up        # Postgres (5436) + Mailpit (8026) for local development
pnpm db:reset     # migrations + sample edition (fictional sample artists)
pnpm dev          # http://localhost:3001  ·  admin at /sign-in
```

| Topic | Where |
| --- | --- |
| Production deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Decisions log | [docs/awards/DECISIONS.md](docs/awards/DECISIONS.md) |
| Feta Show (the earlier site) | Archived on the `first` branch. It is not deployed. |
