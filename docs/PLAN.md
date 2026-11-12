# Feta Show (ፈታ): Phase 0 plan

Status: **GATE 0, awaiting approval.** Decisions referenced as D-n are in [`DECISIONS.md`](../DECISIONS.md).

## 1. Starting point

The repo is an existing pnpm monorepo (`kaba`):

| Path | What's there |
|---|---|
| `apps/web` | Next.js **16.4.5**, React 19.3, Tailwind v4, TS 6, `cacheComponents: true`, `partialPrefetching: true`. Placeholder page that calls the Nest API. |
| `apps/api` | NestJS 12 + Prisma **7.10.1** (`prisma-client` generator, `@prisma/adapter-pg`, `prisma.config.ts`). One `User` model + one migration. |
| root | `docker-compose.yml` (postgres:18-alpine, db `kaba`), root scripts, Node 24 / pnpm 10.30 locally. |

The spec describes **one Next.js app** that owns the DB, auth (Better Auth) and mutations (Server Actions). Proposed approach (D-1): build Feta in `apps/web`, move Prisma into it, and retire `apps/api`. **This needs your OK before Phase 1** because it deletes the Nest app.

## 2. Folder structure (target)

```
kaba/
├─ apps/web/                         # the Feta app (package name: web)
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/
│  │  ├─ seed.ts                     # entry: idempotent, prints summary + creds
│  │  └─ seed/                       # artists.ts, episodes.ts, videos.ts, news.ts,
│  │                                 # artwork.ts (SVG → WebP), settings.ts, users.ts
│  ├─ prisma.config.ts               # schema path, migrations path, seed command
│  ├─ src/
│  │  ├─ proxy.ts                    # optimistic /admin cookie check, locale routing, headers
│  │  ├─ app/
│  │  │  ├─ [locale]/
│  │  │  │  ├─ (site)/               # public site: header/footer layout
│  │  │  │  │  ├─ page.tsx           # Home
│  │  │  │  │  ├─ episodes/ (page, [slug]/page, [slug]/opengraph-image)
│  │  │  │  │  ├─ artists/  (page, [slug]/page, [slug]/opengraph-image)
│  │  │  │  │  ├─ videos/ gallery/ gallery/[slug]/ news/ news/[slug]/
│  │  │  │  │  ├─ about/ join/ privacy/
│  │  │  │  │  └─ not-found.tsx, error.tsx
│  │  │  │  └─ styleguide/page.tsx   # hidden: noindex, not linked, not in sitemap
│  │  │  ├─ admin/                   # English-only, never under [locale]
│  │  │  │  ├─ login/ change-password/
│  │  │  │  └─ (panel)/              # sidebar layout; every page re-checks session
│  │  │  │     ├─ page.tsx           # Dashboard + launch checklist
│  │  │  │     ├─ episodes/ artists/ videos/ media/ gallery/ news/
│  │  │  │     ├─ submissions/ settings/ users/ activity/
│  │  │  ├─ api/
│  │  │  │  ├─ auth/[...all]/route.ts
│  │  │  │  ├─ admin/media/upload/route.ts          # images (multipart form)
│  │  │  │  ├─ admin/media/video/presign/route.ts   # R2 multipart init + part URLs
│  │  │  │  ├─ admin/media/video/complete/route.ts
│  │  │  │  ├─ admin/media/video/dev-upload/route.ts  # local driver: stream to disk
│  │  │  │  └─ admin/submissions/export/route.ts    # CSV
│  │  │  ├─ media/[...key]/route.ts  # local driver file server, immutable cache headers
│  │  │  ├─ sitemap.ts, robots.ts, global-error.tsx, layout.tsx (fonts)
│  │  ├─ components/
│  │  │  ├─ ui/                      # shadcn (dark tokens)
│  │  │  ├─ brand/                   # TibebStrip, Wordmark, VsCard, ArtistCard,
│  │  │  │                           # Fallback (seeded gradient + initials), ComingSoon,
│  │  │  │                           # Ticker, Scoreboard, SpotlightHero, Grain, Reveal
│  │  │  ├─ site/                    # Header, MobileMenu, Footer, CommandSearch,
│  │  │  │                           # VideoPlayer (YT facade / <video> / coming soon),
│  │  │  │                           # Lightbox, ShareButtons, JoinForms
│  │  │  └─ admin/                   # Sidebar, Topbar, DataTable, SaveBar, MediaPicker,
│  │  │                              # Dropzone, RichTextEditor, Repeater, SortableList
│  │  ├─ server/
│  │  │  ├─ queries/                 # public reads: 'use cache' + cacheTag
│  │  │  ├─ actions/                 # admin Server Actions, one file per module
│  │  │  └─ admin-queries/           # uncached admin reads (session-gated)
│  │  ├─ lib/
│  │  │  ├─ db.ts  env.ts (Zod-validated env)  auth.ts  auth-client.ts
│  │  │  ├─ authz.ts                 # requireSession / requireRole, used everywhere
│  │  │  ├─ cache-tags.ts revalidate.ts activity.ts rate-limit.ts
│  │  │  ├─ phone.ts sanitize.ts slug.ts gradient.ts years.ts youtube.ts
│  │  │  ├─ storage/ (types.ts, index.ts, local.ts, r2.ts)
│  │  │  └─ media/ (sniff.ts, process-image.ts)
│  │  ├─ schemas/                    # Zod schemas shared by forms + actions
│  │  ├─ i18n/ (routing.ts, request.ts, navigation.ts)
│  │  └─ messages/ (en.json, am.json)  # every Amharic UI string lives in am.json
│  ├─ assets/fonts/                  # Noto Sans Ethiopic + Unbounded TTF (OFL) for next/og
│  ├─ tests/unit/  tests/e2e/
│  ├─ storage/                       # local media (git-ignored)
│  ├─ Dockerfile
│  └─ playwright.config.ts  vitest.config.ts
├─ deploy/ (nginx/feta.conf, scripts/backup.sh, cloudflare.md)
├─ docs/ (PLAN.md, screens/)
├─ .github/workflows/ci-deploy.yml
├─ docker-compose.yml                # dev Postgres 16
├─ docker-compose.prod.yml           # app + Postgres 16 (named volume)
├─ DECISIONS.md  README.md  .env.example
└─ package.json pnpm-workspace.yaml
```

## 3. Draft Prisma schema

IDs are `String` (cuid) everywhere, because Better Auth generates string IDs. Auth models follow Better Auth's core schema plus the admin plugin fields. `role` is a Prisma enum; Better Auth is configured with `defaultRole: "EDITOR"` and custom roles so it never writes a value outside the enum (D-5).

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role             { SUPER_ADMIN EDITOR }
enum Status           { DRAFT PUBLISHED ARCHIVED }
enum ArtistCategory   { SINGER MUSICIAN ACTOR COMEDIAN DANCER PRODUCER_DJ HOST_MEDIA OTHER }
enum EpisodeType      { GAME_SHOW HOLIDAY_SPECIAL PERFORMANCE BEHIND_THE_SCENES }
enum VideoType        { FULL_EPISODE HIGHLIGHT PERFORMANCE BEHIND_THE_SCENES INTERVIEW }
enum VideoSource      { NONE YOUTUBE UPLOAD }
enum Side             { A B }
enum SubmissionType   { CONTESTANT AUDIENCE SPONSOR }
enum SubmissionStatus { NEW REVIEWED SHORTLISTED ARCHIVED }
enum MediaType        { IMAGE VIDEO }

// ───────── Better Auth (core + admin plugin) ─────────
model User {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  emailVerified      Boolean   @default(false)
  image              String?
  role               Role      @default(EDITOR)
  banned             Boolean   @default(false)   // admin plugin
  banReason          String?
  banExpires         DateTime?
  mustChangePassword Boolean   @default(true)
  isActive           Boolean   @default(true)
  lastLoginAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  sessions   Session[]
  accounts   Account[]
  media      Media[]       @relation("MediaUploader")
  newsPosts  NewsPost[]
  activity   ActivityLog[]
  @@map("user")
}

model Session {
  id             String   @id @default(cuid())
  token          String   @unique
  expiresAt      DateTime
  ipAddress      String?
  userAgent      String?
  impersonatedBy String?
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  password              String?
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("verification")
}

// App-level rate limiting (login failures, join forms, uploads). Postgres-backed
// so limits survive restarts. D-9.
model RateLimit {
  key     String   @id
  points  Int
  expire  DateTime?
}

// ───────── Content ─────────
model Media {
  id           String    @id @default(cuid())
  type         MediaType
  storageKey   String    @unique          // random UUID-based key
  url          String
  variants     Json?                      // { "400": key, "800": key, "1600": key }
  mimeType     String
  sizeBytes    Int
  width        Int?
  height       Int?
  durationSec  Float?
  blurDataUrl  String?
  alt          String    @default("")     // required for IMAGE (enforced in Zod)
  caption      String?
  credit       String?
  tags         String[]
  isSample     Boolean   @default(false)
  uploadedById String?
  uploadedBy   User?     @relation("MediaUploader", fields: [uploadedById], references: [id], onDelete: SetNull)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  artistPortraits Artist[]      @relation("ArtistPortrait")
  artistCovers    Artist[]      @relation("ArtistCover")
  artistGallery   ArtistMedia[]
  episodeVideos   Episode[]     @relation("EpisodeVideo")
  episodeThumbs   Episode[]     @relation("EpisodeThumb")
  episodeGallery  EpisodeMedia[]
  videoFiles      Video[]       @relation("VideoFile")
  videoPosters    Video[]       @relation("VideoPoster")
  albumCovers     Album[]
  albumItems      AlbumItem[]
  newsCovers      NewsPost[]
  @@index([type, createdAt])
}

model Artist {
  id             String           @id @default(cuid())
  slug           String           @unique
  nameEn         String
  nameAm         String?
  stageName      String?
  legalNameEn    String?
  legalNameAm    String?
  isGroup        Boolean          @default(false)   // D-11: Jano Band → MusicGroup JSON-LD
  categories     ArtistCategory[]
  shortBioEn     String?
  shortBioAm     String?
  bioEn          String?          // sanitized HTML
  bioAm          String?
  birthYear      Int?
  deathYear      Int?
  yearsActive    String?          // free text, e.g. "2012" → rendered "Active since 2012"
  genres         String[]
  notableWorks   Json             @default("[]")   // [{ title, year?, type? }]
  socialLinks    Json             @default("[]")   // [{ platform, url }]
  portraitId     String?
  portrait       Media?           @relation("ArtistPortrait", fields: [portraitId], references: [id], onDelete: SetNull)
  coverId        String?
  cover          Media?           @relation("ArtistCover", fields: [coverId], references: [id], onDelete: SetNull)
  isLegend       Boolean          @default(false)
  featured       Boolean          @default(false)
  status         Status           @default(DRAFT)
  sortOrder      Int              @default(0)
  seoTitle       String?
  seoDescription String?
  isSample       Boolean          @default(false)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  gallery      ArtistMedia[]
  appearances  EpisodeParticipant[]
  videos       VideoArtist[]
  @@index([status, featured])
  @@index([isLegend])
  @@index([createdAt])
}

model ArtistMedia {
  artistId  String
  mediaId   String
  sortOrder Int    @default(0)
  artist    Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  media     Media  @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  @@id([artistId, mediaId])
}

model Episode {
  id            String       @id @default(cuid())
  slug          String       @unique
  titleEn       String
  titleAm       String?
  season        Int?
  episodeNumber Int?
  type          EpisodeType  @default(GAME_SHOW)
  airDate       DateTime?    @db.Date
  descriptionEn String?
  descriptionAm String?
  videoSource   VideoSource  @default(NONE)
  youtubeUrl    String?
  videoMediaId  String?
  videoMedia    Media?       @relation("EpisodeVideo", fields: [videoMediaId], references: [id], onDelete: SetNull)
  thumbnailId   String?
  thumbnail     Media?       @relation("EpisodeThumb", fields: [thumbnailId], references: [id], onDelete: SetNull)
  winnerSide    Side?
  isTie         Boolean      @default(false)
  featured      Boolean      @default(false)
  status        Status       @default(DRAFT)
  isSample      Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  participants EpisodeParticipant[]
  rounds       EpisodeRound[]
  gallery      EpisodeMedia[]
  videos       Video[]
  albums       Album[]
  @@index([status, type])
  @@index([featured])
  @@index([createdAt])
}

model EpisodeParticipant {
  id        String  @id @default(cuid())
  episodeId String
  episode   Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  side      Side
  artistId  String?
  artist    Artist? @relation(fields: [artistId], references: [id], onDelete: SetNull)
  guestName String?
  order     Int     @default(0)
  // "exactly one of artistId / guestName": Zod + a raw-SQL CHECK in the migration. D-10.
  @@index([episodeId])
  @@index([artistId])
}

model EpisodeRound {
  id        String  @id @default(cuid())
  episodeId String
  episode   Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  order     Int
  nameEn    String
  nameAm    String?
  scoreA    Int?
  scoreB    Int?
  @@index([episodeId, order])
}

model EpisodeMedia {           // episode gallery (spec §5 lists "gallery" on episodes)
  episodeId String
  mediaId   String
  sortOrder Int     @default(0)
  episode   Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  media     Media   @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  @@id([episodeId, mediaId])
}

model Video {
  id          String      @id @default(cuid())
  slug        String      @unique
  titleEn     String
  titleAm     String?
  type        VideoType
  source      VideoSource @default(NONE)
  youtubeUrl  String?
  mediaId     String?
  media       Media?      @relation("VideoFile", fields: [mediaId], references: [id], onDelete: SetNull)
  captionsUrl String?     // WebVTT for uploaded video (spec §10)
  posterId    String?
  poster      Media?      @relation("VideoPoster", fields: [posterId], references: [id], onDelete: SetNull)
  episodeId   String?
  episode     Episode?    @relation(fields: [episodeId], references: [id], onDelete: SetNull)
  featured    Boolean     @default(false)
  status      Status      @default(DRAFT)
  publishedAt DateTime?
  isSample    Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  artists     VideoArtist[]
  @@index([status, type])
  @@index([featured])
  @@index([createdAt])
}

model VideoArtist {
  videoId  String
  artistId String
  video    Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
  artist   Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  @@id([videoId, artistId])
  @@index([artistId])
}

model Album {
  id            String      @id @default(cuid())
  slug          String      @unique
  titleEn       String
  titleAm       String?
  descriptionEn String?
  descriptionAm String?
  coverId       String?
  cover         Media?      @relation(fields: [coverId], references: [id], onDelete: SetNull)
  episodeId     String?
  episode       Episode?    @relation(fields: [episodeId], references: [id], onDelete: SetNull)
  status        Status      @default(DRAFT)
  isSample      Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  items         AlbumItem[]
  @@index([status])
}

model AlbumItem {
  id        String  @id @default(cuid())
  albumId   String
  album     Album   @relation(fields: [albumId], references: [id], onDelete: Cascade)
  mediaId   String
  media     Media   @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  sortOrder Int     @default(0)
  caption   String?
  @@index([albumId, sortOrder])
}

model NewsPost {
  id          String    @id @default(cuid())
  slug        String    @unique
  titleEn     String
  titleAm     String?
  excerptEn   String?
  excerptAm   String?
  bodyEn      String    // sanitized HTML
  bodyAm      String?
  coverId     String?
  cover       Media?    @relation(fields: [coverId], references: [id], onDelete: SetNull)
  tags        String[]
  featured    Boolean   @default(false)
  status      Status    @default(DRAFT)
  publishedAt DateTime? // future date + PUBLISHED = scheduled (D-12)
  authorId    String?
  author      User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)
  isSample    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([status, publishedAt])
  @@index([featured])
}

model Submission {
  id        String           @id @default(cuid())
  type      SubmissionType
  status    SubmissionStatus @default(NEW)
  name      String
  email     String?
  phone     String?          // E.164
  payload   Json
  notes     String?
  ipHash    String           // HMAC(ip, BETTER_AUTH_SECRET); raw IPs never stored
  isSample  Boolean          @default(false)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  @@index([type, status, createdAt])
}

model SiteSettings {
  id        Int      @id @default(1)    // single row
  branding  Json     // { logoId? }
  hero      Json     // { titleEn, taglineEn, taglineAm, videoId?, posterId?, ctas[] }
  ticker    Json     // string[]
  featured  Json     // { episodeId?, artistIds[] }
  social    Json     // { telegram?, tiktok?, youtube?, instagram?, facebook?, x? }
  contact   Json     // { email?, phone? }
  sponsors  Json     // [{ name, logoId, url? }]
  seo       Json     // { title, description, ogImageId? }
  about     Json     // { storyEn, storyAm?, faq[], team[] }
  footer    Json     // { textEn?, textAm?, broadcastLine }
  updatedAt DateTime @updatedAt
  // Each Json column is parsed through its own Zod schema on read and write.
}

model ActivityLog {
  id         String   @id @default(cuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action     String   // login | create | update | publish | unpublish | delete | ...
  entityType String
  entityId   String?
  meta       Json     @default("{}")
  createdAt  DateTime @default(now())
  @@index([createdAt])
  @@index([entityType, entityId])
  @@index([userId])
}
```

Fields added beyond spec §7 (all optional, all logged): `Artist.isGroup`, `Artist.isSample`, `Episode.isSample`, `EpisodeMedia` (spec lists an episode gallery but no model), `Media.variants`, `Video.captionsUrl`, `NewsPost.excerptAm`, `Album.descriptionAm`, `RateLimit`, `User.banned*` (Better Auth admin plugin).

## 4. Route list

**Public** (all under `[locale]`; `en` has no prefix, `am` is `/am/...` from Phase 7):

| Route | Rendering |
|---|---|
| `/` | static shell + cached data (tags: settings, episodes, artists, videos, albums) |
| `/episodes` | cached; filters/search/sort/page via `searchParams` behind Suspense |
| `/episodes/[slug]` | `generateStaticParams` + cached; OG image |
| `/artists`, `/artists/[slug]` | same pattern; OG image |
| `/videos` | cached; modal player client-side |
| `/gallery`, `/gallery/[slug]` | cached; lightbox client-side |
| `/news`, `/news/[slug]` | cached; scheduled posts hidden until `publishedAt` |
| `/about`, `/join`, `/privacy` | cached / static |
| `/styleguide` | hidden, `noindex`, 404 in production unless `ENABLE_STYLEGUIDE=1` |
| `/sitemap.xml`, `/robots.txt`, 404, error | |
| `/media/[...key]` | local-driver file server, `Cache-Control: public, max-age=31536000, immutable` |

**Admin** (`/admin/**`, dynamic, English only):
`/admin/login`, `/admin/change-password`, `/admin` (dashboard), `/admin/{episodes,artists,videos,gallery,news}` (list) + `/new` + `/[id]` (edit), `/admin/media`, `/admin/submissions` (+ `/[id]`), `/admin/settings`, `/admin/users`, `/admin/activity`.

**API / route handlers**: `/api/auth/[...all]`, `/api/admin/media/upload`, `/api/admin/media/video/{presign,complete,dev-upload}`, `/api/admin/submissions/export`. Everything else is a Server Action.

## 5. Packages (latest stable on npm as of 2026-11-12)

| Purpose | Package | Version |
|---|---|---|
| Framework | next / react / react-dom | 16.4.6 / 19.3.1 / 19.3.1 (bump from 16.4.5/19.3.0) |
| Language | typescript | 6.0.3 (already installed) |
| CSS | tailwindcss, @tailwindcss/postcss | 4.3.5 |
| UI | shadcn (CLI) | 4.23.0 |
| Icons / motion | lucide-react / motion | 1.72.0 / 14.12.0 |
| DB | prisma, @prisma/client, @prisma/adapter-pg | 7.10.1 (npm `latest` for `prisma` is an 8.0 RC, skipped) |
| Auth | better-auth | 1.7.22 |
| Validation / forms | zod / react-hook-form / @hookform/resolvers | 4.6.7 / 7.92.0 / 7.0.6 |
| Rich text | @tiptap/react, @tiptap/starter-kit, @tiptap/pm | 3.33.1 |
| Sanitize | sanitize-html | 2.18.2 |
| Images | sharp / file-type | 0.35.5 / 22.3.0 |
| Storage (R2) | @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | 3.1167.0 |
| Video | react-lite-youtube-embed | 3.7.0 |
| Admin UX | @tanstack/react-table | 8.x (D-14), 9.3.1 is latest |
| | @dnd-kit/core / @dnd-kit/sortable | 6.3.1 / 10.0.0 |
| | react-dropzone / sonner / cmdk | 20.2.0 / 2.0.8 / 1.1.1 |
| Public UX | embla-carousel-react / yet-another-react-lightbox | 8.6.0 / 3.33.0 |
| | canvas-confetti | 1.9.4 |
| i18n | next-intl | 4.15.1 |
| Rate limit | rate-limiter-flexible | 11.4.1 |
| Tests | vitest / @playwright/test / @axe-core/playwright | 5.1.0 / 1.65.0 / 4.14.0 |
| Scripts | tsx | 4.23.15 |
| Lighthouse (Phase 6) | lighthouse (run via npx, not a dependency) | latest |

## 6. Conflicts and risks in the spec

**Needs your decision**

1. **Existing NestJS API vs. a single Next.js app.** The spec's auth, Server Actions and `revalidateTag` flow all live inside Next.js. Keeping Nest would mean either a second auth system or proxying every mutation. Recommendation: retire `apps/api` (D-1).
2. **Postgres 16 vs. 18.** The spec says 16; the repo runs 18. Nothing in the stack needs 18. Recommendation: use 16 as specified, with a fresh `feta` database and volume. The existing `pgdata` volume holds PG18 data and can't be opened by 16, so it is left alone rather than reused (D-2).

**Resolved by a decision (no action needed unless you disagree)**

3. **`cacheComponents: true` changes "ISR + revalidateTag".** Public reads become `'use cache'` functions with `cacheTag`. Admin Server Actions call `updateTag` (read-your-own-writes); route handlers use `revalidateTag(tag, "max")`. Session reads must sit behind `<Suspense>`, which affects the admin layout (D-3).
4. **CSP vs. static pages.** A nonce-based CSP forces every page to render dynamically, which defeats the cached public site and hurts the Lighthouse target. Plan: strict nonce CSP on `/admin/**` only (already dynamic); a static-header CSP on public pages that allows YouTube and the analytics host and uses `'unsafe-inline'` for scripts only where Next requires it (D-8).
5. **Phase 7 i18n retrofit.** Moving every public route under `[locale]` in Phase 7 would be a large rewrite. Plan: create the `[locale]` segment and next-intl in Phase 1 with only `en` enabled, so Phase 7 only adds `am` and translations (D-6).
6. **Seeding through Better Auth with sign-up disabled.** `disableSignUp` blocks `signUpEmail`. The seed will use Better Auth's own context (`auth.$context` → `password.hash` + internal adapter) so hashes match what login verifies (D-5).
7. **Better Auth roles.** The admin plugin defaults to `admin`/`user` string roles. It will be configured with access-control roles `SUPER_ADMIN`/`EDITOR` and `defaultRole: "EDITOR"`. Deactivation sets `isActive=false`, bans via the admin plugin and revokes all sessions (D-5).
8. **"On Feta" will be empty at launch.** None of the 13 published artists appear in any seeded episode or video; only the draft contestants do. The "Appeared on Feta" toggle and badge will show a branded empty state until an admin publishes a contestant profile. This follows from §8 and is not a bug.
9. **Betty G's "active since 2012"** vs. the rule against "–present": rendered as "Active since 2012".
10. **"Jesica vs Solomon"** is stored as guest names; "Solomon" is not linked to Solomon Tekalign (§8.3: first-name-only participants stay guests).
11. **Spec has no group flag**, but Jano Band needs `MusicGroup` JSON-LD. Added `Artist.isGroup` (D-11).
12. **OG images with Amharic.** `next/og` can't use `next/font`. Noto Sans Ethiopic and Unbounded TTFs (SIL OFL) will be committed under `assets/fonts/` (D-13).
13. **Lighthouse ≥ 90 on mobile** with three font families (Ethiopic is large) and a hero video. Mitigations: Ethiopic subset via `next/font`, `display: swap` with metric fallbacks, the poster image as the LCP element, the video never loads on mobile or Save-Data. Running Lighthouse locally against `next start` won't reproduce Cloudflare/Nginx caching, so Gate 6 scores are local measurements.
14. **@tanstack/react-table v9** is out but shadcn's data-table recipe targets v8. Pin v8 unless v9 works with the recipe when checked in Phase 5 (D-14).
15. **R2 multipart uploads** need the bucket CORS to expose `ETag`. This goes in the deploy notes; it can't be verified without real R2 credentials. Gate 5 tests the local driver; the R2 driver gets unit tests against a mocked S3 client.
16. **Standalone Docker build inside a pnpm monorepo** needs `outputFileTracingRoot` set to the repo root and Prisma's engine files copied in. Handled in Phase 8.
17. **Screenshots need a browser.** Playwright's Chromium will be installed (`pnpm exec playwright install chromium`) for the gates.
