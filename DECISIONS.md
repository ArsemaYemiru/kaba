# Decisions log

Choices made where the spec was silent, ambiguous or conflicted with the repo. Newest entries go at the bottom.

| ID | Phase | Decision | Why |
|---|---|---|---|
| D-1 | 0 | Build Feta inside `apps/web`; move Prisma there; retire the NestJS `apps/api` (**pending your approval at Gate 0**). | The spec puts auth, Server Actions and cache invalidation inside Next.js. A separate Nest API would duplicate auth and add a hop to every mutation. |
| D-2 | 0 | Postgres 16 (as specified) with db/user `feta`, new volume `feta_pgdata`. The old `pgdata` (PG18) volume is left untouched. | Matches the spec and `.env.example`. PG18 data can't be opened by PG16. |
| D-3 | 0 | Keep `cacheComponents: true`. Public reads use `'use cache'` + `cacheTag`; Server Actions call `updateTag`; route handlers call `revalidateTag(tag, "max")`. Session reads sit behind `<Suspense>`. | This is how Next 16 does ISR/tag revalidation with Cache Components; `revalidateTag(tag)` with one argument is deprecated. |
| D-4 | 0 | Prisma 7.10.1 with `prisma-client` generator and `@prisma/adapter-pg`; seed command in `prisma.config.ts`. | Already used in the repo; npm `latest` for `prisma` is an 8.0 RC. |
| D-5 | 0 | Better Auth admin plugin with custom roles `SUPER_ADMIN`/`EDITOR`, `defaultRole: "EDITOR"`, `disableSignUp: true`. Seed creates users via `auth.$context` (password hasher + internal adapter). Deactivate = `isActive=false` + ban + revoke sessions. | Hashes must match Better Auth's verifier; sign-up endpoint is disabled. |
| D-6 | 0 | Public routes live under `app/[locale]` from Phase 1, with next-intl configured for `en` only until Phase 7. `localePrefix: "as-needed"` (no `/en`). Admin stays English at `/admin`. | Avoids moving every route in Phase 7. |
| D-7 | 0 | IDs are cuid strings across all models. | Better Auth generates string IDs; one convention is simpler. |
| D-8 | 0 | Nonce-based strict CSP on `/admin/**` only; static-header CSP on public pages. `frame-ancestors 'none'` on admin. | Nonces force dynamic rendering, which would defeat the cached public site. |
| D-9 | 0 | App rate limits (login failures 5/15 min per IP+email, Join 5/h per IP, uploads) use `rate-limiter-flexible` with a Postgres-backed `RateLimit` table. IPs are HMAC-hashed before storage. | Survives restarts; no Redis needed for a single-instance deploy. |
| D-10 | 0 | "Exactly one of artistId / guestName" enforced in Zod and by a raw SQL `CHECK` constraint added in the migration. | Prisma can't express XOR constraints. |
| D-11 | 0 | Added `Artist.isGroup`. | Needed to emit `MusicGroup` vs `Person` JSON-LD (Jano Band). |
| D-12 | 0 | News scheduling = `status: PUBLISHED` + future `publishedAt`; public queries filter `publishedAt <= now`, and the cache life for news lists is short (5 min). | No cron needed. |
| D-13 | 0 | Commit Noto Sans Ethiopic + Unbounded TTFs (SIL OFL) under `apps/web/assets/fonts/` for `next/og`. | `next/og` can't use `next/font`; fetching fonts at render time is fragile. |
| D-14 | 0 | Pin `@tanstack/react-table` to v8 unless v9 works with shadcn's data-table recipe (checked in Phase 5). | The shadcn recipe targets v8. |
| D-15 | 0 | Ethiopian phone numbers: custom normaliser (`+2519…`, `+2517…`, `09…`, `07…` → E.164), not libphonenumber. | The spec defines the exact accepted formats; avoids a ~150 KB dependency. |
| D-16 | 1 | Gate 0 approved: `apps/api` deleted; root scripts point at `apps/web`; dev Postgres is now `postgres:16-alpine` with db/user `feta`. | Per D-1 / D-2. |
| D-17 | 1 | Kept shadcn's new `cn` package (published by shadcn from `shadcn-ui/cn`) instead of `clsx` + `tailwind-merge`. | The CLI's default in shadcn 4.23; one dependency instead of two. |
| D-18 | 1 | Social icons come from `simple-icons` (CC0). | lucide-react v1 removed brand logos. |
| D-19 | 1 | No `app/layout.tsx`: `[locale]/layout.tsx` is a root layout (and `/admin` will get its own in Phase 4). Unknown public paths hit `[locale]/[...rest]` → branded 404. | Lets `<html lang>` follow the locale and keeps admin out of the public chrome. |
| D-20 | 1 | `/styleguide` returns 404 in production unless built with `ENABLE_STYLEGUIDE=1`; Playwright screenshots run against such a build. | The page is static, so the flag is read at build time. Dev always shows it. |
| D-21 | 1 | `noUncheckedIndexedAccess` on top of `strict`. `typecheck` runs `next typegen` first so route types (`PageProps<…>`) are never stale. | Stricter TS per rule 5. |
| D-22 | 1 | Red and green fills always carry dark text (`#0A0A0C`): white on `#FF3B4E` is 3.5:1 and fails AA for small text. | WCAG AA (spec §3.2). |
| D-23 | 1 | Home page is a Phase 1 shell (hero + ticker with spec copy); Phase 3 wires it to Site Settings and adds the other sections. Header search icon is added with the command palette in Phase 3 rather than shipped inert. | No dead controls on public pages. |
| D-24 | 2 | Dev Postgres is published on **127.0.0.1:5435** (override with `FETA_DB_PORT`), not 5432. | The host already runs its own Postgres on 5432 (and other projects use 5433/5434/5442). Bound to localhost only. |
| D-25 | 2 | Seed passwords are **quoted** in `.env.example` (`SEED_ADMIN_PASSWORD="Feta#Admin2026"`). | dotenv treats an unquoted `#` as a comment, so the spec's unquoted values load as `Feta`. Caught by the seed's own min-length check. |
| D-26 | 2 | Seed is **create-only**: rows are created when their slug/email/key is missing and never overwritten. Existing users keep their password (the credentials table says so). Seeded artwork files are regenerated each run; their Media rows keep any alt/caption edits. | Safe to re-run against a database admins have edited. |
| D-27 | 2 | Seeded artwork uses deterministic storage keys (`sample/<slug>-<width>.webp`); real uploads use random UUID keys (Phase 5). | Lets the seed upsert media idempotently. |
| D-28 | 2 | Admin users are created with Prisma inside a transaction, with the hash from Better Auth's `ctx.password.hash` (self-verified with `ctx.password.verify` before writing). | `disableSignUp` blocks the sign-up API; this keeps hashes identical to what login verifies. |
| D-29 | 2 | Artwork grain is a tiled noise overlay composited in sharp, not an SVG `feTurbulence` filter. | The filter made rasterising ~5× slower (seed 38 s → 15 s). |
| D-30 | 2 | The `R2` storage driver and the dev video upload route arrive in Phase 5; `STORAGE_DRIVER=r2` fails fast with a clear message until then. | Phase 2 scope is the local driver. |
| D-31 | 2 | "Remove sample data" (Phase 5) must also clear Site Settings references to sample media (hero poster, OG image), because those point at seeded artwork. | Seeded settings use sample artwork per §8.6. |
| D-32 | 2 | Extra DB guards in the init migration: participant XOR `CHECK` (blank guest names count as empty) and a `SiteSettings` singleton `CHECK (id = 1)`. | Data integrity beyond what Prisma can express. |
| D-33 | 2 | `prisma migrate reset` is blocked by Prisma when run by an AI agent unless the user consents per run. | Prisma safety feature; `pnpm db:reset` works normally when you run it yourself. |
| D-34 | 3 | Public reads are `'use cache'` functions with `cacheTag` (`lib/cache-tags.ts`) and `cacheLife("days")`; news uses `"minutes"` so scheduled posts appear on time. Pages prerender with ISR; filter pages stream results behind `<Suspense>`. | Cache Components (D-3); admin writes in Phase 5 invalidate by tag. |
| D-35 | 3 | **Production builds need the database** (detail pages are prerendered from `generateStaticParams`). | Affects the Docker build in Phase 8 (build with DB access, or build-time fallback). |
| D-36 | 3 | `partialPrefetching` is **off**. | With it on, unknown slugs (drafts, typos) stream a 200 fallback shell before `notFound()` runs (soft 404). Off, they return a real 404 (verified by curl). |
| D-37 | 3 | `Reveal` re-implemented as progressive enhancement (IntersectionObserver + CSS); content is never hidden server-side. `motion` package removed. | Motion's `initial={{opacity:0}}` rendered sections invisible until JS ran: the Featured matchup was blank in screenshots, and would be for crawlers, no-JS visitors and Lighthouse. A no-JS e2e test now guards this. |
| D-38 | 3 | Images use Next's optimiser with `images.localPatterns: /media/**`; stored 400/800/1600 variants remain for OG/R2 use. | Responsive `srcset` without a custom loader. |
| D-39 | 3 | Rate limiting is a single atomic Postgres upsert on `RateLimit` (`lib/rate-limit.ts`), not `rate-limiter-flexible`. | One query, no extra dependency; refines D-9. |
| D-40 | 3 | Client IP comes **only from `X-Real-IP`** in production (Nginx overwrites it; Phase 8 config restores the Cloudflare client IP via `real_ip`). `CF-Connecting-IP`/`X-Forwarded-For` from clients are ignored in production. | Otherwise anyone can spoof a new IP per request and bypass the Join/login limits. |
| D-41 | 3 | Join forms are fully implemented now (RHF + Zod on client, re-validated in a Server Action, honeypot, 5/hour/IP, E.164 phones, confetti off under reduced motion). Phase 6 adds the admin inbox view and polish. | A public page with dead forms would break "no broken controls". |
| D-42 | 3 | Join forms validate **on submit**, then re-validate on change. | Blur-time error messages shifted the Send button mid-click so the submit was lost (found by e2e). |
| D-43 | 3 | Command palette loads a small published-only index from `/api/search` on first open; filtering is word-prefix (custom cmdk `filter`). | cmdk's default fuzzy match returned unrelated episodes (e.g. "mulatu" → "Solomon Tekalign vs Berhanu Tesfaye"). |
| D-44 | 3 | `<html class="dark">` is always set and `dark:` maps to it. | shadcn components style themselves with `dark:`; without this, light-OS visitors got light controls. |
| D-45 | 3 | "Latest" episode order: air date → season → episode number → creation order. With no air dates seeded, Traffic Police vs Taxi Drivers (seeded last) shows as the latest matchup. | No invented dates; admins set air dates to control order. |
| D-46 | 3 | `<html data-hydrated>` marker (set after hydration) used by e2e tests before interacting. | Clicks before hydration are dropped; fixes intermittent test failures without arbitrary sleeps. |
