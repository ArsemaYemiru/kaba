import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SEEDED_DEFAULT_PASSWORDS } from "@/schemas/auth";
import { SiteSettingsSchema } from "@/schemas/settings";

export async function getKpis() {
  const [artists, episodes, videos, media, newSubmissions] = await Promise.all([
    prisma.artist.count({ where: { status: "PUBLISHED" } }),
    prisma.episode.count({ where: { status: "PUBLISHED" } }),
    prisma.video.count({ where: { status: "PUBLISHED" } }),
    prisma.media.count(),
    prisma.submission.count({ where: { status: "NEW" } }),
  ]);
  return { artists, episodes, videos, media, newSubmissions };
}

export async function recentActivity(take = 10) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, entityType: true, entityId: true, meta: true, createdAt: true, user: { select: { name: true, email: true } } },
  });
}

export type ChecklistItem = { id: string; label: string; ok: boolean; detail: string; href?: string; superAdminOnly?: boolean };

/** Launch checklist (spec §5), computed live. */
export async function launchChecklist(): Promise<ChecklistItem[]> {
  const ctx = await auth.$context;
  const defaults = [...new Set([...SEEDED_DEFAULT_PASSWORDS, process.env.SEED_ADMIN_PASSWORD, process.env.SEED_EDITOR_PASSWORD].filter((p): p is string => !!p))];

  const [credentials, sample, episodesNoVideo, videosNoSource, artistsNoPhoto, settingsRow] = await Promise.all([
    prisma.account.findMany({
      where: { providerId: "credential", user: { isActive: true } },
      select: { password: true, user: { select: { email: true } } },
    }),
    Promise.all([
      prisma.media.count({ where: { isSample: true } }),
      prisma.album.count({ where: { isSample: true } }),
      prisma.newsPost.count({ where: { isSample: true } }),
      prisma.submission.count({ where: { isSample: true } }),
      prisma.video.count({ where: { isSample: true } }),
    ]).then((n) => n.reduce((a, b) => a + b, 0)),
    prisma.episode.count({
      where: {
        status: "PUBLISHED",
        OR: [{ videoSource: "NONE" }, { videoSource: "YOUTUBE", youtubeUrl: null }, { videoSource: "UPLOAD", videoMediaId: null }],
      },
    }),
    prisma.video.count({
      where: { status: "PUBLISHED", OR: [{ source: "NONE" }, { source: "YOUTUBE", youtubeUrl: null }, { source: "UPLOAD", mediaId: null }] },
    }),
    prisma.artist.count({ where: { status: "PUBLISHED", portraitId: null } }),
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
  ]);

  const usingDefault: string[] = [];
  for (const c of credentials) {
    if (!c.password) continue;
    for (const p of defaults) {
      if (await ctx.password.verify({ hash: c.password, password: p })) {
        usingDefault.push(c.user.email);
        break;
      }
    }
  }

  const branding = SiteSettingsSchema.shape.branding.safeParse(settingsRow?.branding);
  const social = SiteSettingsSchema.shape.social.safeParse(settingsRow?.social);
  const contact = SiteSettingsSchema.shape.contact.safeParse(settingsRow?.contact);
  const hasLogo = branding.success && !!branding.data.logoId;
  const hasSocial = social.success && Object.values(social.data).some(Boolean);
  const hasContact = contact.success && !!(contact.data.email || contact.data.phone);

  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  return [
    {
      id: "default-passwords",
      label: "Default passwords changed",
      ok: usingDefault.length === 0,
      detail: usingDefault.length ? `Still using a seeded password: ${usingDefault.join(", ")}` : "No account uses a seeded password.",
      href: "/admin/users",
      superAdminOnly: true,
    },
    {
      id: "sample-data",
      label: "Sample data removed",
      ok: sample === 0,
      detail: sample ? `${n(sample, "sample item", "sample items")} (artwork, albums, draft news, demo submissions).` : "No sample data left.",
      href: "/admin/settings",
      superAdminOnly: true,
    },
    {
      id: "episode-video",
      label: "Published episodes have a video",
      ok: episodesNoVideo === 0,
      detail: episodesNoVideo ? `${n(episodesNoVideo, "episode shows", "episodes show")} “video coming soon”.` : "Every published episode has a video.",
      href: "/admin/episodes",
    },
    {
      id: "video-source",
      label: "Published videos have a source",
      ok: videosNoSource === 0,
      detail: videosNoSource ? `${n(videosNoSource, "video has", "videos have")} no YouTube link or upload.` : "Every published video plays.",
      href: "/admin/videos",
    },
    {
      id: "artist-photos",
      label: "Published artists have a photo",
      ok: artistsNoPhoto === 0,
      detail: artistsNoPhoto ? `${n(artistsNoPhoto, "artist uses", "artists use")} the branded fallback.` : "Every published artist has a photo.",
      href: "/admin/artists",
    },
    { id: "logo", label: "Logo uploaded", ok: hasLogo, detail: hasLogo ? "Logo set." : "The header uses the type wordmark.", href: "/admin/settings", superAdminOnly: true },
    { id: "social", label: "Social links added", ok: hasSocial, detail: hasSocial ? "Social links set." : "No social links yet; the footer hides them.", href: "/admin/settings", superAdminOnly: true },
    { id: "contact", label: "Contact details added", ok: hasContact, detail: hasContact ? "Contact details set." : "No contact email or phone yet.", href: "/admin/settings", superAdminOnly: true },
  ];
}
