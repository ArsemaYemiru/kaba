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
import { voteHash } from "../src/lib/vote-hash";
import am from "../src/messages/am.json";
import { SiteSettingsSchema, type SiteSettingsData } from "../src/schemas/settings";
import { ALBUMS, artworks, grainTile, HERO_POSTER, OG_IMAGE } from "./seed/artwork";
import { FEATURED_ARTISTS, PUBLISHED_ARTISTS } from "./seed/artists";
import { ABOUT, FAQ, NEWS, PRIVACY, RULES, TERMS, VIDEOS } from "./seed/content";
import { CATEGORIES, nomineesFor, VOTABLE } from "./seed/edition";
import { planCluster, planVoting, type PlanVote, type PlanVoter } from "./seed/members";

const env = getEnv();
const PROD = env.NODE_ENV === "production";
const DAY = 86_400_000;

const DEFAULTS = {
  admin: ["admin@fetaawards.com", "Feta#Admin2026"],
  editor: ["editor@fetaawards.com", "Feta#Editor2026"],
  member: "Feta#Member2026",
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
  u: { email: string; name: string; password: string; role: "SUPER_ADMIN" | "EDITOR" | "MEMBER"; emailVerified: boolean; mustChangePassword: boolean; isSample: boolean },
) {
  const email = u.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    count(u.role === "MEMBER" ? "User (demo member)" : "User (staff)", false);
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
        consentAt: u.role === "MEMBER" ? new Date() : null,
        isSample: u.isSample,
      },
    });
    await tx.account.create({ data: { userId: row.id, accountId: row.id, providerId: "credential", password } });
    return row;
  });
  count(u.role === "MEMBER" ? "User (demo member)" : "User (staff)", true);
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

async function seedEdition(now: Date, heroMediaId: string | undefined) {
  const year = currentYearEat(now);
  const existing = await prisma.awardEdition.findUnique({ where: { year } });
  const edition =
    existing ??
    (await prisma.awardEdition.create({
      data: {
        year,
        slug: String(year),
        nameEn: `Feta Awards ${year}`,
        nameAm: `ፈታ ሽልማቶች ${year}`,
        phase: "VOTING_OPEN",
        nomineesAnnouncedAt: new Date(now.getTime() - 10 * DAY),
        votingOpensAt: new Date(now.getTime() - 3 * DAY),
        votingClosesAt: new Date(now.getTime() + 14 * DAY),
        ceremonyAt: new Date(now.getTime() + 21 * DAY),
        heroMediaId,
        status: "PUBLISHED",
        isSample: true,
      },
    }));
  count("AwardEdition (sample)", !existing);

  const categoryIds = new Map<number, string>();
  const nomineeIds = new Map<string, string>(); // "1:0" → id
  for (const c of CATEGORIES) {
    const slug = slugify(c.nameEn);
    let category = await prisma.awardCategory.findUnique({ where: { editionId_slug: { editionId: edition.id, slug } } });
    count("AwardCategory (sample)", !category);
    category ??= await prisma.awardCategory.create({
      data: {
        editionId: edition.id,
        slug,
        nameEn: c.nameEn,
        nameAm: c.nameAm,
        descriptionEn: `Sample category. The organizers will replace it with the official list.`,
        icon: c.icon,
        votingType: c.votingType,
        publicWeight: c.publicWeight,
        juryWeight: c.juryWeight,
        nomineeType: c.nomineeType,
        sortOrder: c.n,
        status: "PUBLISHED",
        isSample: true,
      },
    });
    categoryIds.set(c.n, category.id);
    for (const [i, n] of nomineesFor(c).entries()) {
      let nominee = await prisma.nominee.findUnique({ where: { slug: n.slug } });
      count("Nominee (sample)", !nominee);
      nominee ??= await prisma.nominee.create({
        data: {
          categoryId: category.id,
          slug: n.slug,
          displayNameEn: n.displayNameEn,
          workTitleEn: n.workTitleEn,
          blurbEn: "Sample nominee for demonstration. Fictional and removable with “Remove sample data”.",
          juryScore: n.juryScore,
          sortOrder: n.sortOrder,
          status: "PUBLISHED",
          isSample: true,
        },
      });
      nomineeIds.set(`${c.n}:${i}`, nominee.id);
    }
  }
  return { edition, categoryIds, nomineeIds };
}

/* ─────────────────────────── members & votes ─────────────────────────── */

async function seedMembersAndVotes(hash: (p: string) => Promise<string>, now: Date, ed: Awaited<ReturnType<typeof seedEdition>>) {
  const password = process.env.SEED_MEMBER_PASSWORD || DEFAULTS.member;
  const demo = [
    { email: "member1@example.com", name: "Sample Member One", emailVerified: true, note: "verified, voted in 4 categories" },
    { email: "member2@example.com", name: "Sample Member Two", emailVerified: true, note: "verified, no votes yet" },
    { email: "member3@example.com", name: "Sample Member Three", emailVerified: false, note: "unverified (verification gate)" },
  ];
  const demoIds: Record<string, string> = {};
  for (const d of demo) {
    const r = await upsertCredentialUser(hash, { ...d, password, role: "MEMBER", mustChangePassword: false, isSample: true });
    demoIds[d.email] = r.id;
    logins.push({ role: "MEMBER", email: d.email, password: r.created ? password : "(existing, unchanged)", note: d.note });
  }

  // Synthetic history is generated once (skipped when the voters already exist).
  if (await prisma.user.findUnique({ where: { email: "voter001@example.com" }, select: { id: true } })) {
    count("User (synthetic voter)", false, 135);
    return;
  }
  const opensAt = ed.edition.votingOpensAt!;
  const plan = planVoting({ votable: VOTABLE.map((c) => c.n), opensAt, now, announcedAt: ed.edition.nomineesAnnouncedAt! });
  const cluster = planCluster({ now });
  const voters: PlanVoter[] = [...plan.voters, ...cluster.voters];
  const votes: PlanVote[] = [...plan.votes, ...cluster.votes];

  // member1 votes in the first 4 public categories.
  const m1: PlanVoter = { email: "member1@example.com", name: "", createdAt: now, ip: "10.1.1.1", ua: "Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile" };
  VOTABLE.slice(0, 4).forEach((c, i) => votes.push({ voterEmail: m1.email, categoryKey: c.n, nominee: i % 5, castAt: new Date(now.getTime() - (20 - i) * 3600_000) }));

  // Synthetic voters: verified, no credential account (they can never sign in).
  await prisma.user.createMany({
    data: voters.map((v) => ({
      email: v.email,
      emailNormalized: normalizeEmail(v.email),
      name: v.name,
      displayName: v.name,
      role: "MEMBER" as const,
      emailVerified: true,
      consentAt: v.createdAt,
      isSample: true,
      createdAt: v.createdAt,
    })),
  });
  count("User (synthetic voter)", true, voters.length);
  const userIds = new Map((await prisma.user.findMany({ where: { email: { in: voters.map((v) => v.email) } }, select: { id: true, email: true } })).map((u) => [u.email, u.id]));
  userIds.set(m1.email, demoIds[m1.email]!);
  const meta = new Map([...voters, m1].map((v) => [v.email, v]));

  const voteRows: Prisma.VoteCreateManyInput[] = [];
  const eventRows: Prisma.VoteEventCreateManyInput[] = [];
  for (const v of votes) {
    const who = meta.get(v.voterEmail)!;
    const userId = userIds.get(v.voterEmail)!;
    const categoryId = ed.categoryIds.get(v.categoryKey)!;
    const nomineeId = ed.nomineeIds.get(`${v.categoryKey}:${v.nominee}`)!;
    const ipHash = voteHash(who.ip, env.VOTE_HASH_SECRET);
    const uaHash = voteHash(who.ua, env.VOTE_HASH_SECRET);
    const base = { userId, editionId: ed.edition.id, categoryId, ipHash, uaHash, isSample: true };
    if (v.changedFrom) {
      const fromId = ed.nomineeIds.get(`${v.categoryKey}:${v.changedFrom.nominee}`)!;
      voteRows.push({ ...base, nomineeId, createdAt: v.changedFrom.at, updatedAt: v.castAt });
      eventRows.push({ ...base, type: "CAST", toNomineeId: fromId, createdAt: v.changedFrom.at });
      eventRows.push({ ...base, type: "CHANGED", fromNomineeId: fromId, toNomineeId: nomineeId, createdAt: v.castAt });
    } else {
      voteRows.push({ ...base, nomineeId, createdAt: v.castAt, updatedAt: v.castAt });
      eventRows.push({ ...base, type: "CAST", toNomineeId: nomineeId, createdAt: v.castAt });
    }
  }
  await prisma.vote.createMany({ data: voteRows });
  await prisma.voteEvent.createMany({ data: eventRows });
  count("Vote (sample)", true, voteRows.length);
  count("VoteEvent (sample)", true, eventRows.length);
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
    hero: { titleEn: "FETA AWARDS", wordmark: "ፈታ", taglineEn: "Celebrating Ethiopia's brightest stars. Your vote decides.", taglineAm: am.brand.tagline, videoId: null, posterId: o.posterId ?? null },
    ticker: ["Create your account and vote", "Share your favorite nominee"],
    currentEditionId: o.editionId,
    featured: { nomineeIds: o.featuredNomineeIds, artistIds: o.artistIds },
    social: {},
    contact: { email: "" },
    sponsors: [],
    seo: { title: "Feta Awards (ፈታ)", description: "Celebrating Ethiopia's brightest stars. Your vote decides.", ogImageId: o.ogImageId ?? null },
    footer: {},
    pages: {
      about: { bodyEn: ABOUT, isTemplate: true },
      rules: { bodyEn: RULES, isTemplate: true },
      privacy: { bodyEn: PRIVACY, isTemplate: true },
      terms: { bodyEn: TERMS, isTemplate: true },
      faq: FAQ,
    },
    voting: { requirePhoneVerificationToVote: false },
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
  const [staff, members, verified, artists, editions, categories, nominees, votes, voided, events, media, videos, albums, news] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["SUPER_ADMIN", "EDITOR"] } } }),
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.user.count({ where: { role: "MEMBER", emailVerified: true } }),
    prisma.artist.count({ where: { status: "PUBLISHED" } }),
    prisma.awardEdition.count(),
    prisma.awardCategory.count(),
    prisma.nominee.count(),
    prisma.vote.count(),
    prisma.vote.count({ where: { NOT: { voidedAt: null } } }),
    prisma.voteEvent.count(),
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
    "Members (verified / total)": `${verified} / ${members}`,
    "Artists (published)": artists,
    Editions: editions,
    Categories: categories,
    Nominees: nominees,
    "Votes (voided)": `${votes} (${voided})`,
    "Vote events": events,
    Media: media,
    Videos: videos,
    Albums: albums,
    "News posts": news,
  });
  console.log("Logins");
  console.table(logins);
  if (!PROD) console.log("Mail (dev): http://localhost:8026 · 120 synthetic voters + 15-account burst have no password and can't sign in.");
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
    await seedMembersAndVotes(hash, now, ed);
    await seedVideos(ed.edition.id);
    await seedAlbums(media, ed.edition.id);
    await seedNews(staff.SUPER_ADMIN, ed.edition.id);
    const featuredNomineeIds = [1, 2, 3, 4].map((n) => ed.nomineeIds.get(`${n}:0`)!).filter(Boolean);
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
