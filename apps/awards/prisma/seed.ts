/**
 * Feta Awards seed (spec §9). Idempotent: rows are created when missing and
 * never overwritten, so staff edits survive a re-run. It creates only what the
 * admin needs to start: the two staff accounts, the welcome post, default site
 * settings and, once, the starter showcase (artists, the 2026 edition, genres,
 * honorees, an album and news; photos are added in the admin). Production
 * refuses default passwords.
 *   pnpm --filter awards db:seed   |   pnpm --filter awards db:reset
 */
import "./seed/load-env";

import { rm } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "../src/generated/prisma/client";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/email";
import { getEnv } from "../src/lib/env";
import { getLocalStorage } from "../src/lib/storage";
import { slugify } from "../src/lib/slug";
import am from "../src/messages/am.json";
import { SiteSettingsSchema, type SiteSettingsData } from "../src/schemas/settings";
import { ABOUT, FAQ, NEWS, PRIVACY, TERMS } from "./seed/content";
import { ALBUMS, ARTISTS, EDITION, GENRES, SHOWCASE_NEWS } from "./seed/showcase";

const env = getEnv();
const PROD = env.NODE_ENV === "production";

const DEFAULTS = {
  admin: ["admin@fetaawards.com", "Feta#Admin2026"],
  editor: ["editor@fetaawards.com", "Feta#Editor2026"],
} as const;

const tally: Record<string, { created: number; existing: number }> = {};
const count = (model: string, created: boolean, n = 1) => {
  tally[model] ??= { created: 0, existing: 0 };
  tally[model][created ? "created" : "existing"] += n;
};
const logins: { role: string; email: string; password: string; note: string }[] = [];

/* ─────────────────────────── users ─────────────────────────── */

async function hasher() {
  const ctx = await auth.$context;
  return async (password: string) => {
    if (password.length < ctx.password.config.minPasswordLength) throw new Error(`Seed passwords must be at least ${ctx.password.config.minPasswordLength} characters.`);
    const hash = await ctx.password.hash(password);
    if (!(await ctx.password.verify({ hash, password }))) throw new Error("Password hash self-check failed");
    return hash;
  };
}

async function upsertCredentialUser(
  hash: (p: string) => Promise<string>,
  u: { email: string; name: string; password: string; role: "SUPER_ADMIN" | "EDITOR"; emailVerified: boolean; mustChangePassword: boolean },
) {
  const email = u.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    count("User (staff)", false);
    return { id: existing.id, created: false };
  }
  const password = await hash(u.password);
  const user = await prisma.$transaction(async (tx) => {
    const row = await tx.user.create({
      data: {
        email,
        emailNormalized: normalizeEmail(email),
        name: u.name,
        displayName: u.name,
        role: u.role,
        emailVerified: u.emailVerified,
        mustChangePassword: u.mustChangePassword,
      },
    });
    await tx.account.create({ data: { userId: row.id, accountId: row.id, providerId: "credential", password } });
    return row;
  });
  count("User (staff)", true);
  return { id: user.id, created: true };
}

async function seedStaff(hash: (p: string) => Promise<string>) {
  const accounts = [
    { role: "SUPER_ADMIN" as const, name: "Feta Awards Admin", email: process.env.SEED_ADMIN_EMAIL || DEFAULTS.admin[0], password: process.env.SEED_ADMIN_PASSWORD || DEFAULTS.admin[1], def: DEFAULTS.admin[1], envName: "SEED_ADMIN_PASSWORD" },
    { role: "EDITOR" as const, name: "Feta Awards Editor", email: process.env.SEED_EDITOR_EMAIL || DEFAULTS.editor[0], password: process.env.SEED_EDITOR_PASSWORD || DEFAULTS.editor[1], def: DEFAULTS.editor[1], envName: "SEED_EDITOR_PASSWORD" },
  ];
  if (PROD) for (const a of accounts) if (a.password === a.def) throw new Error(`Refusing to seed ${a.role} with the default password in production. Set ${a.envName}.`);
  const ids: Record<string, string> = {};
  for (const a of accounts) {
    const r = await upsertCredentialUser(hash, { ...a, emailVerified: true, mustChangePassword: true });
    ids[a.role] = r.id;
    logins.push({ role: a.role, email: a.email.toLowerCase(), password: r.created ? a.password : "(existing, unchanged)", note: "must change password on first sign-in" });
  }
  return ids as { SUPER_ADMIN: string; EDITOR: string };
}

/* ─────────────────────────── news ─────────────────────────── */

async function seedNews(authorId: string) {
  for (const n of NEWS) {
    const slug = slugify(n.title);
    const existing = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      await prisma.newsPost.create({
        data: { slug, titleEn: n.title, excerptEn: n.excerpt, bodyEn: n.body, tags: n.tags, featured: n.featured, status: n.status, publishedAt: n.status === "PUBLISHED" ? new Date() : null, authorId },
      });
    }
    count("NewsPost", !existing);
  }
}

/* ─────────────────────────── showcase ─────────────────────────── */

/**
 * Starter artists, the 2026 edition, its genres and honorees, a gallery album and
 * news (prisma/seed/showcase.ts). Runs once: if any of these artists already
 * exists, staff own the content and nothing is created or recreated, so admin
 * edits and deletions stick. All in one transaction, so a failure leaves nothing half-made.
 */
async function seedShowcase(authorId: string) {
  const slugs = ARTISTS.map((a) => a.slug);
  if (await prisma.artist.count({ where: { slug: { in: slugs } } })) {
    count("Showcase (already seeded, skipped)", false);
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      const artistIds: Record<string, string> = {};
      for (const [i, a] of ARTISTS.entries()) {
        const row = await tx.artist.create({
          data: {
            slug: a.slug,
            nameEn: a.nameEn,
            nameAm: a.nameAm,
            stageName: a.stageName ?? null,
            legalNameEn: a.legalNameEn ?? null,
            categories: a.categories,
            genres: a.genres,
            birthYear: a.birthYear ?? null,
            yearsActive: a.yearsActive ?? null,
            shortBioEn: a.shortBioEn,
            bioEn: a.bioEn,
            notableWorks: a.notableWorks,
            isLegend: a.isLegend ?? false,
            featured: a.featured ?? false,
            status: a.status,
            sortOrder: (i + 1) * 10,
          },
        });
        artistIds[a.slug] = row.id;
      }
      count("Artist", true, ARTISTS.length);

      const edition =
        (await tx.awardEdition.findUnique({ where: { year: EDITION.year } })) ??
        (await tx.awardEdition.create({ data: EDITION }));

      for (const [gi, g] of GENRES.entries()) {
        const category =
          (await tx.awardCategory.findUnique({ where: { editionId_slug: { editionId: edition.id, slug: g.slug } } })) ??
          (await tx.awardCategory.create({
            data: { editionId: edition.id, slug: g.slug, nameEn: g.nameEn, nameAm: g.nameAm, descriptionEn: g.descriptionEn, icon: g.icon, sortOrder: (gi + 1) * 10, status: "PUBLISHED" },
          }));
        count("AwardCategory", true);
        for (const [hi, h] of g.honorees.entries()) {
          const artist = ARTISTS.find((a) => a.slug === h.artist)!;
          await tx.nominee.create({
            data: {
              categoryId: category.id,
              artistId: artistIds[h.artist]!,
              slug: `${EDITION.year}-${g.slug}-${h.artist}`,
              displayNameEn: artist.nameEn,
              displayNameAm: artist.nameAm,
              workTitleEn: h.workTitleEn ?? null,
              blurbEn: h.blurbEn,
              sortOrder: (hi + 1) * 10,
              status: "PUBLISHED",
            },
          });
          count("Honoree", true);
        }
      }

      for (const al of ALBUMS) {
        if (await tx.album.findUnique({ where: { slug: al.slug }, select: { id: true } })) continue;
        await tx.album.create({
          data: { slug: al.slug, titleEn: al.titleEn, titleAm: al.titleAm, descriptionEn: al.descriptionEn, status: al.status, editionId: al.edition ? edition.id : null },
        });
        count("Album", true);
      }

      for (const n of SHOWCASE_NEWS) {
        if (await tx.newsPost.findUnique({ where: { slug: n.slug }, select: { id: true } })) continue;
        await tx.newsPost.create({
          data: { slug: n.slug, titleEn: n.title, excerptEn: n.excerpt, bodyEn: n.body, tags: n.tags, featured: n.featured, editionId: n.edition ? edition.id : null, status: "PUBLISHED", publishedAt: new Date(), authorId },
        });
        count("NewsPost", true);
      }

      // Make 2026 the current edition and spotlight the featured artists, unless staff already chose.
      const settings = await tx.siteSettings.findUnique({ where: { id: 1 }, select: { currentEditionId: true, featured: true } });
      if (settings) {
        const featured = (settings.featured ?? {}) as { nomineeIds?: string[]; artistIds?: string[] };
        await tx.siteSettings.update({
          where: { id: 1 },
          data: {
            currentEditionId: settings.currentEditionId ?? edition.id,
            featured: { nomineeIds: featured.nomineeIds ?? [], artistIds: featured.artistIds?.length ? featured.artistIds : ARTISTS.filter((a) => a.featured).map((a) => artistIds[a.slug]!) },
          },
        });
      }
    },
    { timeout: 60_000 },
  );
}

/* ─────────────────────────── settings ─────────────────────────── */

/** Default site settings, created once; everything after that is edited in Site Settings. */
async function seedSettings() {
  const data: SiteSettingsData = SiteSettingsSchema.parse({
    branding: { logoId: null },
    hero: { titleEn: "FETA AWARDS", wordmark: "ፈታ", taglineEn: "Celebrating Ethiopian artists, genre by genre.", taglineAm: am.brand.tagline, videoId: null, posterId: null },
    ticker: [],
    currentEditionId: null,
    featured: { nomineeIds: [], artistIds: [] },
    social: {},
    contact: { email: "" },
    sponsors: [],
    seo: { title: "Feta Awards (ፈታ)", description: "Feta Awards recognizes Ethiopian artists across every genre, from Classical to Bati to Afrobeat.", ogImageId: null },
    footer: {},
    pages: {
      about: { bodyEn: ABOUT, isTemplate: true },
      privacy: { bodyEn: PRIVACY, isTemplate: true },
      terms: { bodyEn: TERMS, isTemplate: true },
      faq: FAQ,
    },
  });
  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!existing) {
    const { currentEditionId, ...json } = data;
    await prisma.siteSettings.create({ data: { id: 1, currentEditionId: currentEditionId ?? null, ...(json as unknown as Omit<Prisma.SiteSettingsCreateInput, "id" | "currentEditionId">) } });
  }
  count("SiteSettings", !existing);
}

/* ─────────────────────────── summary ─────────────────────────── */

/** Files of the old generated sample artwork (its rows were removed by the remove_sample_data migration). */
async function removeSampleFiles() {
  const local = getLocalStorage();
  if (local) await rm(path.join(local.root, "sample"), { recursive: true, force: true });
}

async function summary() {
  const [staff, artists, editions, categories, honorees, media, albums, news] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count({ where: { status: "PUBLISHED" } }),
    prisma.awardEdition.count(),
    prisma.awardCategory.count(),
    prisma.nominee.count(),
    prisma.media.count(),
    prisma.album.count(),
    prisma.newsPost.count(),
  ]);
  console.log("\nSeed summary (this run)");
  console.table(tally);
  console.log("Database totals");
  console.table({ Staff: staff, "Artists (published)": artists, Editions: editions, "Genre categories": categories, Honorees: honorees, Media: media, Albums: albums, "News posts": news });
  console.log("Logins");
  console.table(logins);
  if (!PROD) console.log("Mail (dev, staff password resets only): http://localhost:8026");
}

async function main() {
  const started = Date.now();
  const hash = await hasher();
  const staff = await seedStaff(hash);
  await seedNews(staff.SUPER_ADMIN);
  await removeSampleFiles();
  await seedSettings();
  await seedShowcase(staff.SUPER_ADMIN);
  await summary();
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
