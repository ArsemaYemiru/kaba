/**
 * Feta Awards seed (spec §9). Idempotent: rows are created when missing and
 * never overwritten. Production creates only staff, site settings and artist
 * profiles, and refuses default passwords.
 *   pnpm --filter awards db:seed   |   pnpm --filter awards db:reset
 */
import "./seed/load-env";

import sharp from "sharp";
import { Prisma } from "../src/generated/prisma/client";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { normalizeEmail } from "../src/lib/email";
import { getEnv } from "../src/lib/env";
import { processImage } from "../src/lib/media/process-image";
import { slugify } from "../src/lib/slug";
import am from "../src/messages/am.json";
import { SiteSettingsSchema, type SiteSettingsData } from "../src/schemas/settings";
import { ALBUMS, artworks, grainTile, HERO_POSTER, OG_IMAGE } from "./seed/artwork";
import { FEATURED_ARTISTS, PUBLISHED_ARTISTS } from "./seed/artists";
import { ABOUT, FAQ, NEWS, PRIVACY, TERMS, VIDEOS } from "./seed/content";
import { GENRES, honoreesFor, SAMPLE_CITATION } from "./seed/edition";

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
  u: { email: string; name: string; password: string; role: "SUPER_ADMIN" | "EDITOR"; emailVerified: boolean; mustChangePassword: boolean; isSample: boolean },
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
        isSample: u.isSample,
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
    const r = await upsertCredentialUser(hash, { ...a, emailVerified: true, mustChangePassword: true, isSample: false });
    ids[a.role] = r.id;
    logins.push({ role: a.role, email: a.email.toLowerCase(), password: r.created ? a.password : "(existing, unchanged)", note: "must change password on first sign-in" });
  }
  return ids as { SUPER_ADMIN: string; EDITOR: string };
}

/* ─────────────────────────── artists ─────────────────────────── */

async function seedArtists() {
  let order = 0;
  for (const a of PUBLISHED_ARTISTS) {
    const slug = slugify(a.nameEn);
    const existing = await prisma.artist.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      await prisma.artist.create({
        data: {
          slug,
          nameEn: a.nameEn,
          nameAm: a.nameAm,
          stageName: a.stageName,
          legalNameEn: a.legalNameEn,
          legalNameAm: a.legalNameAm,
          isGroup: a.isGroup ?? false,
          categories: a.categories,
          genres: a.genres,
          birthYear: a.birthYear,
          deathYear: a.deathYear,
          yearsActive: a.yearsActive,
          isLegend: a.isLegend ?? false,
          featured: FEATURED_ARTISTS.includes(a.nameEn),
          shortBioEn: a.shortBioEn,
          notableWorks: (a.notableWorks ?? []) as Prisma.InputJsonValue,
          socialLinks: [],
          status: "PUBLISHED",
          sortOrder: order,
        },
      });
    }
    order++;
    count("Artist", !existing);
  }
  const rows = await prisma.artist.findMany({ where: { nameEn: { in: FEATURED_ARTISTS } }, select: { id: true, nameEn: true } });
  return FEATURED_ARTISTS.map((n) => rows.find((r) => r.nameEn === n)?.id).filter((v): v is string => !!v);
}

/* ─────────────────────────── media ─────────────────────────── */

async function seedArtwork(uploaderId: string) {
  const ids = new Map<string, string>();
  const grain = grainTile();
  for (const art of artworks()) {
    const png = await sharp(Buffer.from(art.svg))
      .composite([{ input: grain.data, raw: { width: grain.size, height: grain.size, channels: 4 }, tile: true, blend: "overlay" }])
      .png()
      .toBuffer();
    const img = await processImage(png, `sample/${art.slug}`);
    const existing = await prisma.media.findUnique({ where: { storageKey: img.storageKey }, select: { id: true } });
    const file = { url: img.url, variants: img.variants, mimeType: img.mimeType, sizeBytes: img.sizeBytes, width: img.width, height: img.height, blurDataUrl: img.blurDataUrl };
    const row = await prisma.media.upsert({
      where: { storageKey: img.storageKey },
      update: file, // files are regenerated; alt/caption edits are kept
      create: { ...file, type: "IMAGE", storageKey: img.storageKey, alt: art.alt, credit: "Feta Awards (generated artwork)", tags: ["sample", "artwork", ...art.tags], isSample: true, uploadedById: uploaderId },
    });
    ids.set(art.slug, row.id);
    count("Media (sample artwork)", !existing);
  }
  return ids;
}

/* ─────────────────────────── edition ─────────────────────────── */

function currentYearEat(now: Date) {
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: env.APP_TIMEZONE }).format(now));
}

/** Sample edition: genre categories, each honoring fictional sample artists (A-76). */
async function seedEdition(now: Date, heroMediaId: string | undefined) {
  const year = currentYearEat(now);
  const existing = await prisma.awardEdition.findUnique({ where: { year } });
  const edition =
    existing ??
    (await prisma.awardEdition.create({
      data: { year, slug: String(year), nameEn: `Feta Awards ${year}`, nameAm: `ፈታ ሽልማቶች ${year}`, heroMediaId, status: "PUBLISHED", isSample: true },
    }));
  count("AwardEdition (sample)", !existing);

  const honoreeIds = new Map<string, string>(); // "1:0" → id
  for (const g of GENRES) {
    const slug = slugify(g.nameEn);
    let category = await prisma.awardCategory.findUnique({ where: { editionId_slug: { editionId: edition.id, slug } } });
    count("AwardCategory (sample genre)", !category);
    category ??= await prisma.awardCategory.create({
      data: {
        editionId: edition.id,
        slug,
        nameEn: g.nameEn,
        nameAm: g.nameAm,
        descriptionEn: "Sample genre. The organizers will replace it with the official list.",
        icon: g.icon,
        sortOrder: g.n,
        status: "PUBLISHED",
        isSample: true,
      },
    });
    for (const [i, h] of honoreesFor(g).entries()) {
      let artist = await prisma.artist.findUnique({ where: { slug: h.artistSlug }, select: { id: true } });
      count("Artist (sample)", !artist);
      artist ??= await prisma.artist.create({
        data: { slug: h.artistSlug, nameEn: h.artistName, categories: ["MUSICIAN"], shortBioEn: "Fictional sample artist for demonstration.", status: "PUBLISHED", sortOrder: 1000, isSample: true },
        select: { id: true },
      });
      let honoree = await prisma.nominee.findUnique({ where: { slug: h.slug } });
      count("Honoree (sample)", !honoree);
      honoree ??= await prisma.nominee.create({
        data: {
          categoryId: category.id,
          artistId: artist.id,
          slug: h.slug,
          displayNameEn: h.artistName,
          workTitleEn: h.workTitleEn,
          blurbEn: SAMPLE_CITATION,
          sortOrder: h.sortOrder,
          status: "PUBLISHED",
          isSample: true,
        },
      });
      honoreeIds.set(`${g.n}:${i}`, honoree.id);
    }
  }
  return { edition, honoreeIds };
}

/* ─────────────────────────── content ─────────────────────────── */

async function seedVideos(editionId: string) {
  for (const v of VIDEOS) {
    const slug = slugify(v.title);
    const existing = await prisma.video.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) await prisma.video.create({ data: { slug, titleEn: v.title, type: v.type, source: "NONE", editionId, status: "PUBLISHED", publishedAt: new Date(), isSample: true } });
    count("Video (sample)", !existing);
  }
}

async function seedAlbums(mediaIds: Map<string, string>, editionId: string) {
  const arts = artworks();
  for (const album of ALBUMS) {
    const items = arts.filter((a) => a.album === album.slug);
    const existing = await prisma.album.findUnique({ where: { slug: album.slug }, select: { id: true } });
    if (!existing) {
      await prisma.album.create({
        data: {
          slug: album.slug,
          titleEn: album.titleEn,
          descriptionEn: album.descriptionEn,
          coverId: mediaIds.get(items[0]!.slug),
          editionId,
          status: "PUBLISHED",
          isSample: true,
          items: { create: items.map((a, i) => ({ mediaId: mediaIds.get(a.slug)!, sortOrder: i })) },
        },
      });
    }
    count("Album (sample)", !existing);
  }
}

async function seedNews(authorId: string, editionId: string | null) {
  for (const n of NEWS) {
    const slug = slugify(n.title);
    const existing = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      await prisma.newsPost.create({
        data: {
          slug,
          titleEn: n.title,
          excerptEn: n.excerpt,
          bodyEn: n.body,
          tags: n.tags,
          featured: n.featured,
          status: n.status,
          publishedAt: n.status === "PUBLISHED" ? new Date() : null,
          editionId: n.isSample ? editionId : null,
          isSample: n.isSample,
          authorId,
        },
      });
    }
    count("NewsPost", !existing);
  }
}

/* ─────────────────────────── settings ─────────────────────────── */

async function seedSettings(o: { editionId: string | null; featuredNomineeIds: string[]; artistIds: string[]; posterId?: string; ogImageId?: string }) {
  const data: SiteSettingsData = SiteSettingsSchema.parse({
    branding: { logoId: null },
    hero: { titleEn: "FETA AWARDS", wordmark: "ፈታ", taglineEn: "Celebrating Ethiopian artists, genre by genre.", taglineAm: am.brand.tagline, videoId: null, posterId: o.posterId ?? null },
    ticker: [],
    currentEditionId: o.editionId,
    featured: { nomineeIds: o.featuredNomineeIds, artistIds: o.artistIds },
    social: {},
    contact: { email: "" },
    sponsors: [],
    seo: { title: "Feta Awards (ፈታ)", description: "Feta Awards recognizes Ethiopian artists across every genre, from Classical to Bati to Afrobeat.", ogImageId: o.ogImageId ?? null },
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
  } else if (!PROD) {
    // Create-only, except re-link empty sample references (e.g. after "Remove sample data" + re-seed).
    const hero = existing.hero as Record<string, unknown>;
    const seo = existing.seo as Record<string, unknown>;
    const featured = existing.featured as { nomineeIds?: string[]; artistIds?: string[] };
    await prisma.siteSettings.update({
      where: { id: 1 },
      data: {
        currentEditionId: existing.currentEditionId ?? data.currentEditionId ?? null,
        hero: { ...hero, posterId: hero?.posterId || data.hero.posterId } as Prisma.InputJsonValue,
        seo: { ...seo, ogImageId: seo?.ogImageId || data.seo.ogImageId } as Prisma.InputJsonValue,
        featured: { nomineeIds: featured?.nomineeIds?.length ? featured.nomineeIds : data.featured.nomineeIds, artistIds: featured?.artistIds?.length ? featured.artistIds : data.featured.artistIds } as Prisma.InputJsonValue,
      },
    });
  }
  count("SiteSettings", !existing);
}

/* ─────────────────────────── summary ─────────────────────────── */

async function summary() {
  const [staff, artists, sampleArtists, editions, categories, honorees, media, videos, albums, news] = await Promise.all([
    prisma.user.count(),
    prisma.artist.count({ where: { status: "PUBLISHED", isSample: false } }),
    prisma.artist.count({ where: { isSample: true } }),
    prisma.awardEdition.count(),
    prisma.awardCategory.count(),
    prisma.nominee.count(),
    prisma.media.count(),
    prisma.video.count(),
    prisma.album.count(),
    prisma.newsPost.count(),
  ]);
  console.log("\nSeed summary (this run)");
  console.table(tally);
  console.log("Database totals");
  console.table({
    Staff: staff,
    "Artists (published)": artists,
    "Sample artists": sampleArtists,
    Editions: editions,
    "Genre categories": categories,
    Honorees: honorees,
    Media: media,
    Videos: videos,
    Albums: albums,
    "News posts": news,
  });
  console.log("Logins");
  console.table(logins);
  if (!PROD) console.log("Mail (dev, staff password resets only): http://localhost:8026");
}

async function main() {
  const started = Date.now();
  const now = new Date();
  const hash = await hasher();
  const staff = await seedStaff(hash);
  const artistIds = await seedArtists();

  if (PROD) {
    await seedSettings({ editionId: null, featuredNomineeIds: [], artistIds });
  } else {
    const media = await seedArtwork(staff.SUPER_ADMIN);
    const ed = await seedEdition(now, media.get(HERO_POSTER));
    await seedVideos(ed.edition.id);
    await seedAlbums(media, ed.edition.id);
    await seedNews(staff.SUPER_ADMIN, ed.edition.id);
    const featuredNomineeIds = [1, 2, 3, 4].map((n) => ed.honoreeIds.get(`${n}:0`)!).filter(Boolean);
    await seedSettings({ editionId: ed.edition.id, featuredNomineeIds, artistIds, posterId: media.get(HERO_POSTER), ogImageId: media.get(OG_IMAGE) });
  }
  await summary();
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s${PROD ? " (production: staff, settings and artists only)" : ""}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
