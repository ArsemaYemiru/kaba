> **Note (2026-11-19):** voting, members and the Feta Show coexistence described below are superseded. Feta Awards now recognizes artists by genre (A-76), has staff-only accounts (A-77) and is the only app deployed (A-78). See [DECISIONS.md](DECISIONS.md).

# Feta Awards (ፈታ): Phase 0 plan

Status: **GATE 0, awaiting approval.** Decisions referenced as A-n are in [`DECISIONS.md`](DECISIONS.md) (this folder).

## 1. Starting point and where Feta Awards lives

This repo already contains **Feta Show** (`apps/web`): a finished, committed and deployed site (public site + admin, Phases 0–5), with its own CI (`.github/workflows/checks.yml`, `deploy.yml`) and a production server budget (see `docs/DEPLOYMENT.md`).

Feta Awards is a different product (member accounts, voting, editions, results). The plan builds it as a **second app in the same pnpm monorepo, `apps/awards`**, with its own database, ports, CI job and deployment (A-1). Feta Show is not modified.

About 60% of what the spec needs already exists and is proven in `apps/web`: the dark design system and tibeb/wordmark/hero components, artists directory, Media Library (local + R2 drivers, sharp pipeline, presigned video uploads), gallery, news, videos, the admin shell, editor and data-table toolkit, the server-action authorization guard test, rate limiter and e2e harness. Phase 1 copies these modules into `apps/awards` and adapts them (A-2) rather than extracting shared packages, so the deployed site's build is never touched.

**Please confirm A-1** (or say "replace Feta Show", "new repo" or "add to Feta Show" and the plan changes accordingly).

## 2. Folder structure (target)

```
kaba/
├─ apps/web/                     # Feta Show (unchanged)
├─ apps/awards/                  # Feta Awards (package name: awards)
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/
│  │  ├─ seed.ts                 # prod: staff + settings + artists only
│  │  └─ seed/                   # artists.ts, edition.ts (sample), members.ts (120 voters + cluster),
│  │                             # votes.ts, artwork.ts (SVG → WebP), news.ts, settings.ts, staff.ts
│  ├─ prisma.config.ts
│  ├─ src/
│  │  ├─ proxy.ts                # locale routing; early staff gate (/admin 401/403/redirect);
│  │  │                          # no-store + frame-ancestors on /admin, auth and account routes
│  │  ├─ app/
│  │  │  ├─ [locale]/
│  │  │  │  ├─ (site)/           # public pages (header/footer/phase banner)
│  │  │  │  │  ├─ page.tsx       # Home (phase-aware)
│  │  │  │  │  ├─ awards/ (page → redirect, [year]/, [year]/[category]/, [year]/winners/, archive/)
│  │  │  │  │  ├─ vote/          # ballot (per-user parts dynamic, never shared-cached)
│  │  │  │  │  ├─ nominees/[slug]/ (+ opengraph-image)
│  │  │  │  │  ├─ artists/ artists/[slug]/ videos/ gallery/ gallery/[slug]/ news/ news/[slug]/
│  │  │  │  │  ├─ about/ rules/ privacy/ terms/
│  │  │  │  │  └─ account/ account/ballot/
│  │  │  │  ├─ (auth)/           # sign-in, sign-up, verify, forgot-password, reset-password
│  │  │  │  └─ styleguide/
│  │  │  ├─ admin/               # English only
│  │  │  │  ├─ login → redirect to /sign-in?next=/admin (one sign-in page, spec §5.1)
│  │  │  │  ├─ change-password/  two-factor/
│  │  │  │  └─ (panel)/ dashboard, editions, categories, nominees, results, members, monitor,
│  │  │  │               artists, videos, media, gallery, news, settings, staff, activity
│  │  │  ├─ api/
│  │  │  │  ├─ auth/[...all]/route.ts      # Better Auth (captcha + rate limit on)
│  │  │  │  ├─ ballot/session/route.ts     # Turnstile → signed ballot session cookie
│  │  │  │  ├─ admin/media/{upload,video/presign,video/complete,video/dev-upload}
│  │  │  │  ├─ admin/{results,members,nominees}/export   # CSV
│  │  │  │  └─ search/route.ts             # public index, no counts
│  │  │  ├─ media/[...key]/route.ts        # local driver, Range support
│  │  │  ├─ dev/phase/route.ts             # dev-only phase switcher (404 in production)
│  │  │  └─ sitemap.ts robots.ts
│  │  ├─ components/ brand/ site/ admin/ ui/
│  │  ├─ server/
│  │  │  ├─ queries/             # public, 'use cache' + cacheTag; NEVER select vote counts
│  │  │  ├─ member/              # per-request member reads (ballot state), no shared cache
│  │  │  ├─ voting/              # castVote, ballot session, rules, tally, results, hashing
│  │  │  ├─ actions/             # Server Actions (each starts with authorize/authorizeMember)
│  │  │  └─ admin/               # loaders, usage, slug, monitor queries
│  │  ├─ lib/ (env, db, auth, authz, mail, sms, turnstile, rate-limit (pg | redis),
│  │  │        email-normalize, disposable, phase, time (EAT), storage/, media/, sanitize, revalidate)
│  │  ├─ schemas/  i18n/  messages/ (en.json, am.json)
│  ├─ load/vote.js               # k6 (run via the grafana/k6 Docker image)
│  ├─ tests/unit/  tests/e2e/
│  ├─ Dockerfile  playwright.config.ts  vitest.config.mts  next.config.ts
├─ docs/awards/ (PLAN.md, DECISIONS.md, screens/)
├─ docker-compose.awards.yml     # dev: awards Postgres (5436) + Mailpit (1026/8026) [+ Redis profile]
└─ .github/workflows/awards-checks.yml, awards-deploy.yml   # Phase 9
```

Dev ports (A-4): app **3001**, Postgres **127.0.0.1:5436**, Mailpit SMTP **1026** / UI **8026**. Feta Show keeps 3000/5435.

## 3. Draft Prisma schema

String cuid ids (Better Auth). Better Auth core + admin (role, banned, banReason, banExpires), two-factor (`twoFactorEnabled` + `TwoFactor`), phone-number (`phoneNumber`, `phoneNumberVerified`) fields are included. `role` is a Prisma enum with Better Auth `defaultRole: "MEMBER"`; the sign-up hook forces `MEMBER` regardless of input (A-8).

```prisma
enum Role            { SUPER_ADMIN EDITOR MEMBER }
enum Status          { DRAFT PUBLISHED ARCHIVED }
enum ArtistCategory  { SINGER MUSICIAN ACTOR COMEDIAN DANCER PRODUCER_DJ HOST_MEDIA OTHER }
enum EditionPhase    { DRAFT NOMINEES_ANNOUNCED VOTING_OPEN VOTING_CLOSED WINNERS_ANNOUNCED }
enum VotingType      { PUBLIC_VOTE JURY HYBRID HONORARY }
enum NomineeType     { PERSON GROUP SONG ALBUM MUSIC_VIDEO FILM SERIES CREATOR OTHER }
enum VideoType       { AWARDS_NIGHT RED_CARPET PERFORMANCE ACCEPTANCE_SPEECH INTERVIEW BEHIND_THE_SCENES }
enum VideoSource     { NONE YOUTUBE UPLOAD }
enum MediaType       { IMAGE VIDEO }
enum VoteEventType   { CAST CHANGED VOIDED RESTORED }

// ───────── Better Auth ─────────
model User {
  id                  String    @id @default(cuid())
  name                String                       // Better Auth name = displayName
  displayName         String
  email               String    @unique
  emailNormalized     String    @unique            // lowercase/trim; gmail: no dots, no +tag
  emailVerified       Boolean   @default(false)
  image               String?
  role                Role      @default(MEMBER)
  phoneNumber         String?   @unique
  phoneNumberVerified Boolean   @default(false)
  twoFactorEnabled    Boolean   @default(false)
  banned              Boolean   @default(false)
  banReason           String?
  banExpires          DateTime?
  newsOptIn           Boolean   @default(false)
  consentAt           DateTime?
  isActive            Boolean   @default(true)
  lastLoginAt         DateTime?
  mustChangePassword  Boolean   @default(false)    // seed sets true for staff
  isSample            Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  sessions Session[]  accounts Account[]  twoFactors TwoFactor[]
  votes Vote[]        voteEvents VoteEvent[] @relation("VoteEventUser")
  // + relations for media uploads, news author, activity, snapshots, overrides, voids
  @@index([createdAt])
  @@index([role])
  @@map("user")
}
model Session      { id String @id @default(cuid()) token String @unique expiresAt DateTime ipAddress String? userAgent String? impersonatedBy String? userId String  /* … */ @@map("session") }
model Account      { /* Better Auth core: providerId, accountId, password, tokens … */ @@map("account") }
model Verification { /* Better Auth core (email OTP codes live here) */ @@map("verification") }
model TwoFactor    { id String @id @default(cuid()) secret String backupCodes String userId String /* … */ @@map("twoFactor") }
model RateLimit    { key String @id  points Int  expire DateTime? }   // app limiter (pg driver)

// ───────── Content (same shape as Feta Show) ─────────
model Media       { /* type, storageKey @unique, url, variants Json?, mimeType, sizeBytes, width?, height?,
                       durationSec?, blurDataUrl?, alt, caption?, credit?, tags[], isSample, uploadedById? */ }
model Artist      { /* all §8 fields + isGroup (MusicGroup JSON-LD) */ nominees NomineeArtist[] }
model ArtistMedia { artistId String  mediaId String  sortOrder Int  @@id([artistId, mediaId]) }

// ───────── Awards ─────────
model AwardEdition {
  id                    String       @id @default(cuid())
  year                  Int          @unique
  slug                  String       @unique                  // "2026"
  nameEn                String
  nameAm                String?
  phase                 EditionPhase @default(DRAFT)
  nomineesAnnouncedAt   DateTime?                             // UTC; shown in EAT
  votingOpensAt         DateTime?
  votingClosesAt        DateTime?
  ceremonyAt            DateTime?
  venue                 String?
  broadcastPartner      String?
  heroMediaId           String?
  showPublicPercentages Boolean      @default(false)
  status                Status       @default(DRAFT)
  isSample              Boolean      @default(false)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  categories AwardCategory[]  votes Vote[]  snapshots ResultSnapshot[]  videos Video[]  albums Album[]  news NewsPost[]
  @@index([phase])
  @@index([status])
}

model AwardCategory {
  id            String      @id @default(cuid())
  editionId     String
  slug          String
  nameEn        String
  nameAm        String?
  descriptionEn String?
  descriptionAm String?
  icon          String      @default("trophy")             // lucide icon name (allow-listed)
  votingType    VotingType
  publicWeight  Int         @default(50)                   // percent; publicWeight + juryWeight = 100 (CHECK)
  juryWeight    Int         @default(50)
  nomineeType   NomineeType
  sortOrder     Int         @default(0)
  status        Status      @default(DRAFT)
  isSample      Boolean     @default(false)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  edition  AwardEdition @relation(fields: [editionId], references: [id], onDelete: Cascade)
  nominees Nominee[]  votes Vote[]  overrides WinnerOverride[]
  @@unique([editionId, slug])
  @@index([editionId, status, sortOrder])
}

model Nominee {
  id             String   @id @default(cuid())
  categoryId     String
  slug           String   @unique
  displayNameEn  String
  displayNameAm  String?
  workTitleEn    String?
  workTitleAm    String?
  imageId        String?
  blurbEn        String?
  blurbAm        String?
  youtubeUrl     String?
  juryScore      Int?                                   // 0–100 (CHECK)
  isWinner       Boolean  @default(false)
  sortOrder      Int      @default(0)
  status         Status   @default(DRAFT)
  isSample       Boolean  @default(false)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  category AwardCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  artists  NomineeArtist[]  videos VideoNominee[]  votes Vote[]
  @@index([categoryId, status, sortOrder])
}
model NomineeArtist { nomineeId String  artistId String  @@id([nomineeId, artistId])  @@index([artistId]) }

model Vote {
  id          String    @id @default(cuid())
  userId      String?                                // null only after account deletion post-lock (§5.1)
  editionId   String
  categoryId  String
  nomineeId   String
  ipHash      String
  uaHash      String
  voidedAt    DateTime?
  voidReason  String?
  voidedById  String?
  isSample    Boolean   @default(false)
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@unique([userId, categoryId])                       // one vote per member per category
  @@index([createdAt])
  @@index([editionId, createdAt])
  // + raw SQL: CREATE INDEX vote_tally ON "Vote"("categoryId","nomineeId") WHERE "voidedAt" IS NULL;
}

model VoteEvent {                                      // append-only (DB trigger blocks UPDATE/DELETE, A-12)
  id            String        @id @default(cuid())
  userId        String?
  editionId     String
  categoryId    String
  fromNomineeId String?
  toNomineeId   String?
  type          VoteEventType
  ipHash        String
  uaHash        String
  actorId       String?                              // admin for VOIDED/RESTORED
  reason        String?
  createdAt     DateTime      @default(now())
  @@index([ipHash, createdAt])
  @@index([userId, createdAt])
  @@index([editionId, createdAt])
}

model ResultSnapshot {
  id          String    @id @default(cuid())
  editionId   String
  lockedAt    DateTime  @default(now())
  lockedById  String
  payload     Json                                    // per category: tallies, shares, jury, scores, ranking, winnerId
  sha256      String                                  // over canonical JSON of payload
  publishedAt DateTime?
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@index([editionId, lockedAt])
}
model WinnerOverride { id String @id @default(cuid())  categoryId String  nomineeId String  reason String  byId String  createdAt DateTime @default(now()) updatedAt DateTime @updatedAt }

// ───────── Media/content with edition links ─────────
model Video        { /* §8 + editionId?, isSample */  nominees VideoNominee[]  artists VideoArtist[] }
model VideoNominee { videoId String  nomineeId String  @@id([videoId, nomineeId]) }
model VideoArtist  { videoId String  artistId  String  @@id([videoId, artistId]) }
model Album        { /* §8 + editionId?, descriptionAm? */ }
model AlbumItem    { id String @id @default(cuid())  albumId String  mediaId String  sortOrder Int  caption String? }
model NewsPost     { /* §8 + editionId?, excerptAm? */ }
model SiteSettings { id Int @id @default(1) /* typed JSON per section: branding, hero, ticker, currentEditionId,
                      featured {nominees[], artists[]}, social, contact, sponsors, seo, footer, pages {about, rules,
                      privacy, terms, faq, isTemplate flags}, voting {requirePhoneVerificationToVote} */ }
model ActivityLog  { id String @id @default(cuid())  userId String?  action String  entityType String  entityId String?  meta Json  createdAt DateTime @default(now()) }
```

DB-level guards added in the init migration: weights sum to 100; `juryScore` 0–100; partial tally index; `VoteEvent` UPDATE/DELETE trigger; SiteSettings singleton.

## 4. Route list

**Public** (`[locale]`; `en` unprefixed, `/am` from Phase 8):

| Route | Caching |
|---|---|
| `/` | cached shell per phase; member ballot progress streams in per request |
| `/awards` | redirect → current edition |
| `/awards/[year]`, `/awards/[year]/[category]` | cached content; Vote buttons' selected state per request |
| `/awards/[year]/winners` | cached; coming-soon until `WINNERS_ANNOUNCED`; data from the published snapshot |
| `/awards/archive` | cached |
| `/vote` | static nominee lists + per-request ballot (private) |
| `/nominees/[slug]` (+ `opengraph-image`) | cached; OG never includes counts |
| `/artists`, `/artists/[slug]`, `/videos`, `/gallery`, `/gallery/[slug]`, `/news`, `/news/[slug]` | cached (as Feta Show) |
| `/about`, `/rules`, `/privacy`, `/terms` | cached |
| `/sign-in`, `/sign-up`, `/verify`, `/forgot-password`, `/reset-password` | dynamic, no-store, `frame-ancestors 'none'` |
| `/account`, `/account/ballot` | dynamic, no-store |
| `/styleguide` | hidden, 404 in prod unless flagged |
| `/sitemap.xml`, `/robots.txt`, 404, error | |

**Admin** (`/admin/**`, staff only, English): dashboard; `editions` (+`[id]`), `categories`, `nominees` (+ CSV import), `results/[editionId]`, `members` (+`[id]`), `monitor`, `artists`, `videos`, `media`, `gallery`, `news`, `settings` (SUPER_ADMIN), `staff` (SUPER_ADMIN), `activity`, `change-password`, `two-factor`.

**API**: `/api/auth/[...all]` (Better Auth), `/api/ballot/session` (Turnstile → ballot cookie), `/api/search`, `/api/admin/media/*`, `/api/admin/*/export` (CSV), `/api/dev/phase` (dev only). Voting itself is a Server Action (`castVote`).

## 5. Packages (latest stable on npm, 2026-11-18)

Same versions as Feta Show where shared (Next 16.4.6, React 19.3.1, Tailwind 4, Prisma 7.10.1 (npm `latest` for `prisma` is still an 8.0 RC), Zod 4.6.7, next-intl 4.15.1, TanStack Table 8.21.3, Tiptap 3.33.1, dnd-kit, react-dropzone, sharp 0.35.5, file-type, AWS SDK 3.1167, cmdk, embla, lightbox, react-lite-youtube-embed, sonner, sanitize-html, Vitest 5.1, Playwright 1.65).

New for Awards:

| Purpose | Package | Version |
|---|---|---|
| Auth | better-auth (email-otp, captcha, two-factor, phone-number, admin plugins: all present) | 1.7.25 |
| Email | nodemailer / @types/nodemailer | 10.6.0 / 8.0.2 |
| Turnstile widget | @marsidev/react-turnstile | 1.6.3 |
| Disposable domains | disposable-email-domains-js | 2.2.0 |
| Redis limiter (optional) | ioredis | 6.0.0 |
| Admin charts | recharts (via shadcn chart) | 3.11.0 |
| Motion (vote micro-interactions) | motion | 14.14.0 |
| Load test | k6 via `grafana/k6` Docker image (already pulled) | — |
| Dev mail | Mailpit `axllent/mailpit:v1.31.3` (already pulled) | — |

## 6. Conflicts and risks in the spec

**Needs your confirmation**

1. **Where it lives** (A-1). The repo holds a deployed Feta Show; the plan adds `apps/awards` alongside it, with its own DB, ports, CI and deployment.
2. **Server capacity.** `docs/DEPLOYMENT.md` gives Feta Show 1.75 CPU / 1.6 GiB on a shared server. The k6 target (100 votes/s for 5 min, p95 < 500 ms) is plausible on a dev machine but needs its own CPU/RAM budget in production. Gate 5 will report local k6 numbers; production capacity is a hosting decision.

**Resolved by a decision (change any you disagree with)**

3. **Unverified members must be able to sign in.** Better Auth's `requireEmailVerification` would block sign-in entirely, but the spec wants unverified members to browse and to see "Verify your email to vote" (and `member3` demos it). So sign-in stays open; **voting** is gated on `emailVerified` (A-5).
4. **Google sign-in doesn't work in in-app browsers.** Google blocks OAuth in embedded webviews (Telegram, TikTok, Facebook) with `disallowed_useragent`, so §3.5 "auth works in in-app browsers" can't hold for Google. Plan: detect in-app browsers, hide the Google button there and show "Open in your browser" help; email/password and the email code work everywhere (A-6).
5. **One sign-in page for staff and members** (spec §5.1) replaces Feta Show's separate `/admin/login`. Staff keep `mustChangePassword` and optional TOTP (`/admin/two-factor`); the checklist flags SUPER_ADMINs without it (A-7).
6. **Role can never come from the client.** Better Auth `additionalFields.role` gets `input: false`, the `user.create.before` hook forces `MEMBER`, and the admin plugin's HTTP role/ban endpoints are restricted to SUPER_ADMIN; a test asserts sign-up and profile updates can't set a role (A-8).
7. **Email normalization.** Lowercase + trim for everyone; Gmail/Googlemail also drop dots and `+tags`. Enforced by a unique `emailNormalized` index set in the create hook, so concurrent sign-ups can't race past it (A-9).
8. **Turnstile on Better Auth endpoints** via the `captcha` plugin (sign-up, sign-in, password reset). Test keys always pass in dev; the launch checklist flags test keys in production. CSP must allow `challenges.cloudflare.com` (A-10).
9. **Ballot session.** `POST /api/ballot/session` verifies a Turnstile token server-side and sets an HMAC-signed, httpOnly cookie `{userId, exp=30min}`; `castVote` rejects missing, expired or foreign sessions. In the k6 environment a non-production-only `TURNSTILE_BYPASS=1` skips siteverify; the server refuses to start with it in production (A-11).
10. **Vote writes.** One transaction: re-check every §5.2 rule using the DB clock (`now()`), upsert on `(userId, categoryId)`, append a `VoteEvent` (CAST or CHANGED, skipped when re-voting the same nominee). The unique index makes duplicates impossible under load; the k6 run also counts duplicates (A-12).
11. **No count leaks.** Public queries are built from select lists that never include tallies; tallies live only in `server/voting/tally.ts` (admin + locked snapshot). Tests scan HTML, RSC payloads, `/api/search`, sitemap and OG responses for tally numbers before publication (A-13).
12. **Per-user state vs caching.** Public pages are cached shells; the member's ballot state is read per request inside `<Suspense>` and never placed in a `'use cache'` scope. Auth/account/vote responses get `Cache-Control: private, no-store` (A-14). (From Feta Show: Partial Prefetching off so unknown slugs return real 404s; early status codes come from the proxy.)
13. **Account deletion.** While voting is open: the member's votes in the open edition are deleted with the account, and their vote events are kept for auditing with `userId` cleared. After results are locked: votes keep counting with `userId = null`. Locked snapshots never change (A-15).
14. **Phase machine.** DRAFT → NOMINEES_ANNOUNCED → VOTING_OPEN → VOTING_CLOSED → WINNERS_ANNOUNCED, one step at a time; going back needs a reason and is logged. Opening voting requires both dates; publishing winners requires a locked snapshot (A-16).
15. **Results.** Hybrid score = publicShare × w_p + (jury/100) × w_j; JURY = jury only; HONORARY = the admin-entered recipient (stored as a single `Nominee` row in that category, so winners, OG and archive treat every category the same). Ties: highest jury score, then earliest cast vote; overrides need a reason. Snapshot hash = SHA-256 of canonical JSON (sorted keys) (A-17).
16. **Rate limits.** Postgres limiter by default (same atomic upsert as Feta Show), Redis when `REDIS_URL` is set: 20 vote actions/min/member, 60/min/IP, 5 sign-ups/h/IP, plus Better Auth's own limiter on auth endpoints. Client IP from the proxy-set `X-Real-IP` only (A-18).
17. **Countdown hydration.** The server renders the target timestamp and a static date in EAT; the ticking numbers start on the client to avoid hydration mismatches; reduced motion keeps it static (A-19).
18. **Motion package.** Used only for the vote/selection micro-interactions; scroll reveals keep Feta Show's CSS/IntersectionObserver approach, which never hides content from crawlers or no-JS users (A-20).
19. **Amharic strings** (taglines, category names, glossary) all go in `messages/am.json` and are flagged for native review.
20. **Phone OTP.** Pluggable `SmsProvider` (`console` in dev logs the code). Off unless `SMS_PROVIDER` is configured; `requirePhoneVerificationToVote` defaults off.
21. **Seed volume.** 120 synthetic voters + 15-account cluster are created directly in Postgres with unusable password hashes (no Better Auth calls), ~600 votes and matching VoteEvents with timestamps spread over the voting window, so `db:reset` stays fast.
