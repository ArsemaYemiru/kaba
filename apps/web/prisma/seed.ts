/**
 * Feta Show seed (spec §8). Idempotent: content is created only when its
 * slug/email/key is missing, so re-running never overwrites admin edits.
 *   pnpm db:seed   - seed
 *   pnpm db:reset  - drop, migrate, seed
 */
import "./seed/load-env";

import sharp from "sharp";
import { Prisma } from "../src/generated/prisma/client";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/db";
import { getEnv } from "../src/lib/env";
import { processImage } from "../src/lib/media/process-image";
import { slugify } from "../src/lib/slug";
import am from "../src/messages/am.json";
import { SiteSettingsSchema, type SiteSettingsData } from "../src/schemas/settings";
import { ALBUMS, artworks, grainTile, HERO_POSTER, OG_IMAGE } from "./seed/artwork";
import { DRAFT_CONTESTANTS, FEATURED_ARTISTS, PUBLISHED_ARTISTS } from "./seed/artists";
import { EPISODES } from "./seed/episodes";
import { NEWS } from "./seed/news";
import { VIDEOS } from "./seed/videos";

const DEFAULTS = {
  adminEmail: "admin@fetashow.com",
  adminPassword: "Feta#Admin2026",
  editorEmail: "editor@fetashow.com",
  editorPassword: "Feta#Editor2026",
} as const;

type Counter = { created: number; existing: number };
const tally: Record<string, Counter> = {};
function count(model: string, created: boolean) {
  tally[model] ??= { created: 0, existing: 0 };
  tally[model][created ? "created" : "existing"]++;
}

// ─────────────────────────── users ───────────────────────────
type SeededUser = { role: "SUPER_ADMIN" | "EDITOR"; email: string; password: string; id: string; created: boolean };

function seedAccounts() {
  const env = getEnv();
  const accounts = [
    {
      role: "SUPER_ADMIN" as const,
      name: "Feta Admin",
      email: (process.env.SEED_ADMIN_EMAIL || DEFAULTS.adminEmail).toLowerCase(),
      password: process.env.SEED_ADMIN_PASSWORD || DEFAULTS.adminPassword,
      isDefault: (p: string) => p === DEFAULTS.adminPassword,
    },
    {
      role: "EDITOR" as const,
      name: "Feta Editor",
      email: (process.env.SEED_EDITOR_EMAIL || DEFAULTS.editorEmail).toLowerCase(),
      password: process.env.SEED_EDITOR_PASSWORD || DEFAULTS.editorPassword,
      isDefault: (p: string) => p === DEFAULTS.editorPassword,
    },
  ];
  if (env.NODE_ENV === "production") {
    for (const a of accounts) {
      if (a.isDefault(a.password)) {
        throw new Error(
          `Refusing to seed ${a.role} with the default password in production. Set ${a.role === "SUPER_ADMIN" ? "SEED_ADMIN_PASSWORD" : "SEED_EDITOR_PASSWORD"}.`,
        );
      }
    }
  }
  return accounts;
}

async function seedUsers(): Promise<SeededUser[]> {
  const ctx = await auth.$context;
  const out: SeededUser[] = [];
  for (const a of seedAccounts()) {
    if (a.password.length < ctx.password.config.minPasswordLength) {
      throw new Error(`${a.role} seed password must be at least ${ctx.password.config.minPasswordLength} characters.`);
    }
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) {
      count("User", false);
      out.push({ role: a.role, email: a.email, password: a.password, id: existing.id, created: false });
      continue;
    }
    // Hash with Better Auth's own hasher so login verification matches (§8.1).
    const hash = await ctx.password.hash(a.password);
    if (!(await ctx.password.verify({ hash, password: a.password }))) throw new Error("Password hash self-check failed");

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email: a.email, name: a.name, role: a.role, emailVerified: true, mustChangePassword: true, isActive: true },
      });
      await tx.account.create({ data: { userId: u.id, accountId: u.id, providerId: "credential", password: hash } });
      return u;
    });
    count("User", true);
    out.push({ role: a.role, email: a.email, password: a.password, id: user.id, created: true });
  }
  return out;
}

// ─────────────────────────── media ───────────────────────────
async function seedArtwork(uploaderId: string) {
  const bySlug = new Map<string, string>();
  const grain = grainTile();
  const grainInput = { raw: { width: grain.size, height: grain.size, channels: 4 as const } };
  for (const art of artworks()) {
    const baseKey = `sample/${art.slug}`;
    const png = await sharp(Buffer.from(art.svg))
      .composite([{ input: grain.data, ...grainInput, tile: true, blend: "overlay" }])
      .png()
      .toBuffer();
    const img = await processImage(png, baseKey);
    const existing = await prisma.media.findUnique({ where: { storageKey: img.storageKey } });
    const data = {
      type: "IMAGE" as const,
      url: img.url,
      variants: img.variants,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      width: img.width,
      height: img.height,
      blurDataUrl: img.blurDataUrl,
    };
    const media = await prisma.media.upsert({
      where: { storageKey: img.storageKey },
      // Files are regenerated deterministically; keep any alt/caption edits.
      update: data,
      create: {
        ...data,
        storageKey: img.storageKey,
        alt: art.alt,
        caption: null,
        credit: "Feta Show (generated artwork)",
        tags: ["sample", "artwork", ...art.tags],
        isSample: true,
        uploadedById: uploaderId,
      },
    });
    count("Media", !existing);
    bySlug.set(art.slug, media.id);
  }
  return bySlug;
}

// ─────────────────────────── artists ───────────────────────────
async function seedArtists() {
  const byName = new Map<string, string>();
  let order = 0;
  for (const a of PUBLISHED_ARTISTS) {
    const slug = slugify(a.nameEn);
    const existing = await prisma.artist.findUnique({ where: { slug }, select: { id: true } });
    const artist = await prisma.artist.upsert({
      where: { slug },
      update: {},
      create: {
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
        sortOrder: order++,
      },
    });
    count("Artist (published)", !existing);
    byName.set(a.nameEn, artist.id);
  }
  for (const name of DRAFT_CONTESTANTS) {
    const slug = slugify(name);
    const existing = await prisma.artist.findUnique({ where: { slug }, select: { id: true } });
    const artist = await prisma.artist.upsert({
      where: { slug },
      update: {},
      create: { slug, nameEn: name, categories: ["OTHER"], genres: [], status: "DRAFT", sortOrder: order++ },
    });
    count("Artist (draft contestant)", !existing);
    byName.set(name, artist.id);
  }
  return byName;
}

// ─────────────────────────── episodes ───────────────────────────
async function seedEpisodes(artistIds: Map<string, string>) {
  const bySlug = new Map<string, string>();
  const contestants = new Set(DRAFT_CONTESTANTS);
  const participant = (name: string, side: "A" | "B") =>
    contestants.has(name) ? { side, order: 0, artistId: artistIds.get(name)! } : { side, order: 0, guestName: name };

  for (const e of EPISODES) {
    const title = `${e.a} vs ${e.b}`;
    const slug = slugify(title);
    const existing = await prisma.episode.findUnique({ where: { slug }, select: { id: true } });
    const ep = await prisma.episode.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        titleEn: title,
        season: 1,
        type: e.type,
        status: "PUBLISHED",
        videoSource: "NONE",
        featured: e.featured ?? false,
        participants: { create: [participant(e.a, "A"), participant(e.b, "B")] },
      },
    });
    count("Episode", !existing);
    bySlug.set(title, ep.id);
  }
  return bySlug;
}

// ─────────────────────────── videos ───────────────────────────
async function seedVideos(artistIds: Map<string, string>, episodeIds: Map<string, string>) {
  const now = new Date();
  for (const v of VIDEOS) {
    const slug = slugify(v.title);
    const existing = await prisma.video.findUnique({ where: { slug }, select: { id: true } });
    await prisma.video.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        titleEn: v.title,
        type: v.type,
        source: "NONE",
        status: "PUBLISHED",
        publishedAt: now,
        episodeId: v.episode ? episodeIds.get(v.episode)! : null,
        artists: { create: (v.artists ?? []).map((name) => ({ artistId: artistIds.get(name)! })) },
      },
    });
    count("Video", !existing);
  }
}

// ─────────────────────────── albums ───────────────────────────
async function seedAlbums(mediaIds: Map<string, string>) {
  const arts = artworks();
  for (const album of ALBUMS) {
    const items = arts.filter((a) => a.album === album.slug);
    const existing = await prisma.album.findUnique({ where: { slug: album.slug }, select: { id: true } });
    await prisma.album.upsert({
      where: { slug: album.slug },
      update: {},
      create: {
        slug: album.slug,
        titleEn: album.titleEn,
        descriptionEn: album.descriptionEn,
        status: "PUBLISHED",
        isSample: true,
        coverId: mediaIds.get(items[0]!.slug)!,
        items: { create: items.map((a, i) => ({ mediaId: mediaIds.get(a.slug)!, sortOrder: i })) },
      },
    });
    count("Album", !existing);
  }
}

// ─────────────────────────── news ───────────────────────────
async function seedNews(authorId: string) {
  for (const n of NEWS) {
    const slug = slugify(n.title);
    const existing = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } });
    await prisma.newsPost.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        titleEn: n.title,
        excerptEn: n.excerpt,
        bodyEn: n.body,
        tags: n.tags,
        featured: n.featured,
        status: n.status,
        publishedAt: n.status === "PUBLISHED" ? new Date() : null,
        isSample: n.isSample,
        authorId,
      },
    });
    count("NewsPost", !existing);
  }
}

// ─────────────────────────── submissions ───────────────────────────
async function seedSubmissions() {
  const samples: Prisma.SubmissionCreateInput[] = [
    {
      type: "CONTESTANT",
      name: "Sample Applicant",
      email: "sample.applicant@example.com",
      phone: "+251900000001",
      payload: {
        city: "Addis Ababa",
        category: "Comedian",
        socialLinks: [],
        whyYou: "This is a sample entry so the inbox isn't empty. Delete it, or use “Remove sample data” in Site Settings.",
        videoLink: "",
      },
      ipHash: "sample",
      isSample: true,
    },
    {
      type: "AUDIENCE",
      name: "Sample Audience Member",
      phone: "+251700000002",
      payload: { preferredDate: null, groupSize: 4 },
      ipHash: "sample",
      isSample: true,
    },
    {
      type: "SPONSOR",
      name: "Sample Contact",
      email: "sample.sponsor@example.com",
      phone: "+251911000003",
      payload: { company: "Sample Company PLC", message: "This is a sample sponsorship enquiry for demo purposes." },
      ipHash: "sample",
      isSample: true,
    },
  ];
  for (const s of samples) {
    const existing = await prisma.submission.findFirst({ where: { isSample: true, type: s.type }, select: { id: true } });
    if (!existing) await prisma.submission.create({ data: s });
    count("Submission", !existing);
  }
}

// ─────────────────────────── settings ───────────────────────────
async function seedSettings(episodeIds: Map<string, string>, artistIds: Map<string, string>, mediaIds: Map<string, string>) {
  const data: SiteSettingsData = SiteSettingsSchema.parse({
    branding: { logoId: null },
    hero: {
      titleEn: "FETA SHOW",
      wordmark: "ፈታ",
      taglineEn: "Ethiopia's celebrity game show. Two stars. One stage.",
      taglineAm: am.brand.tagline,
      videoId: null,
      posterId: mediaIds.get(HERO_POSTER)!,
      ctas: [
        { labelEn: "Watch episodes", labelAm: am.nav.episodes, href: "/episodes" },
        { labelEn: "Be on the show", labelAm: am.nav.join, href: "/join" },
      ],
    },
    ticker: [
      "Lij Michael vs Hanan Tarik",
      "Mekonnen Laeke vs Deribwork",
      "Traffic Police vs Taxi Drivers",
      "Solomon Tekalign vs Berhanu Tesfaye",
      "Want to play? Apply now",
    ],
    featured: {
      episodeId: episodeIds.get("Lij Michael vs Hanan Tarik")!,
      artistIds: FEATURED_ARTISTS.map((n) => artistIds.get(n)!),
    },
    social: {},
    contact: {},
    sponsors: [],
    seo: {
      title: "Feta Show (ፈታ): Ethiopia's celebrity game show",
      description: "Ethiopia's celebrity game show. Two stars. One stage. Episodes, Ethiopian artists, videos and photos from Feta.",
      ogImageId: mediaIds.get(OG_IMAGE)!,
    },
    about: {
      storyEn:
        "Feta (ፈታ) is a celebrity game show that launched on EBS TV in 2016. Each episode puts two well-known Ethiopian personalities head-to-head across rounds of games and challenges, all the way to a final round. Holiday specials turn the format into team battles, like Traffic Police vs Taxi Drivers, and the show has featured live performances from hip-hop dance crews to singers.",
      faq: [
        {
          qEn: "Where can I watch Feta?",
          aEn: "Feta launched on EBS TV in 2016. Browse every matchup on our Episodes page, where full episodes and highlights appear as they're added.",
        },
        {
          qEn: "How do I become a contestant?",
          aEn: "Apply with the “Be a contestant” form on the Join page. Tell us who you are and why you'd be great on the show.",
        },
        {
          qEn: "Can I join the studio audience?",
          aEn: "Request a spot with the “Studio audience” form on the Join page, including your preferred date and group size.",
        },
        {
          qEn: "How can my brand partner with the show?",
          aEn: "Send us a message with the “Sponsorship / business” form on the Join page and the Feta team will get back to you.",
        },
      ],
      team: [],
    },
    footer: { broadcastLine: "As seen on EBS TV" },
  });

  const existing = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { id: true } });
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...(data as unknown as Omit<Prisma.SiteSettingsCreateInput, "id">) },
  });
  count("SiteSettings", !existing);
}

// ─────────────────────────── summary ───────────────────────────
async function printSummary(users: SeededUser[]) {
  const [artistsPub, artistsDraft, episodes, videos, media, albums, newsPub, newsDraft, submissions] = await Promise.all([
    prisma.artist.count({ where: { status: "PUBLISHED" } }),
    prisma.artist.count({ where: { status: "DRAFT" } }),
    prisma.episode.count(),
    prisma.video.count(),
    prisma.media.count(),
    prisma.album.count(),
    prisma.newsPost.count({ where: { status: "PUBLISHED" } }),
    prisma.newsPost.count({ where: { status: "DRAFT" } }),
    prisma.submission.count(),
  ]);

  console.log("\nSeed summary (this run)");
  console.table(Object.fromEntries(Object.entries(tally).map(([k, v]) => [k, v])));
  console.log("Database totals");
  console.table({
    "Artists (published)": artistsPub,
    "Artists (draft)": artistsDraft,
    Episodes: episodes,
    Videos: videos,
    Media: media,
    Albums: albums,
    "News (published)": newsPub,
    "News (draft)": newsDraft,
    Submissions: submissions,
  });

  console.log("Admin logins (password change is forced on first login)");
  console.table(
    users.map((u) => ({
      role: u.role,
      email: u.email,
      password: u.created ? u.password : "(existing user, password unchanged)",
    })),
  );
}

async function main() {
  const started = Date.now();
  const users = await seedUsers();
  const superAdmin = users.find((u) => u.role === "SUPER_ADMIN")!;
  const mediaIds = await seedArtwork(superAdmin.id);
  const artistIds = await seedArtists();
  const episodeIds = await seedEpisodes(artistIds);
  await seedVideos(artistIds, episodeIds);
  await seedAlbums(mediaIds);
  await seedNews(superAdmin.id);
  await seedSubmissions();
  await seedSettings(episodeIds, artistIds, mediaIds);
  await printSummary(users);
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
