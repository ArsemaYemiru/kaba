import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { SEEDED_DEFAULT_PASSWORDS } from "@/schemas/auth";
import { SiteSettingsSchema } from "@/schemas/settings";

/** The edition the dashboard reports on: Site Settings' current edition, else the latest. */
export async function dashboardEdition() {
  const s = await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { currentEditionId: true } });
  const select = { id: true, year: true, nameEn: true, status: true, ceremonyAt: true } as const;
  return (s?.currentEditionId ? await prisma.awardEdition.findUnique({ where: { id: s.currentEditionId }, select }) : null) ?? (await prisma.awardEdition.findFirst({ orderBy: { year: "desc" }, select }));
}

export async function getKpis(editionId: string | null) {
  const inEdition = editionId ? { category: { editionId } } : {};
  const [genres, honorees, missingCitation, artists, news, videos, media] = await Promise.all([
    prisma.awardCategory.count({ where: editionId ? { editionId } : {} }),
    prisma.nominee.count({ where: inEdition }),
    prisma.nominee.count({ where: { ...inEdition, OR: [{ blurbEn: null }, { blurbEn: "" }] } }),
    prisma.artist.count({ where: { status: "PUBLISHED" } }),
    prisma.newsPost.count({ where: { status: "PUBLISHED" } }),
    prisma.video.count({ where: { status: "PUBLISHED" } }),
    prisma.media.count(),
  ]);
  return { genres, honorees, missingCitation, artists, news, videos, media };
}

/** Honorees per genre in an edition (published and in progress). */
export async function honoreesPerGenre(editionId: string) {
  const rows = await prisma.awardCategory.findMany({
    where: { editionId },
    orderBy: { sortOrder: "asc" },
    select: { nameEn: true, _count: { select: { nominees: true } }, nominees: { where: { status: "PUBLISHED" }, select: { id: true } } },
  });
  return rows.map((r) => ({ name: r.nameEn, total: r._count.nominees, published: r.nominees.length }));
}

export async function recentActivity(take = 10) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, entityType: true, entityId: true, meta: true, createdAt: true, user: { select: { name: true, email: true } } },
  });
}

export type ChecklistItem = { id: string; label: string; ok: boolean; detail: string; href?: string; superAdminOnly?: boolean };

/** Launch checklist (spec §6), computed live. */
export async function launchChecklist(): Promise<ChecklistItem[]> {
  const env = getEnv();
  const ctx = await auth.$context;
  const defaults = [...new Set([...SEEDED_DEFAULT_PASSWORDS, process.env.SEED_ADMIN_PASSWORD, process.env.SEED_EDITOR_PASSWORD].filter((p): p is string => !!p))];
  const edition = await dashboardEdition();

  const [credentials, sample, admins, artistsNoPhoto, settingsRow] = await Promise.all([
    prisma.account.findMany({ where: { providerId: "credential", user: { isActive: true } }, select: { password: true, user: { select: { email: true } } } }),
    Promise.all([
      prisma.awardEdition.count({ where: { isSample: true } }),
      prisma.artist.count({ where: { isSample: true } }),
      prisma.media.count({ where: { isSample: true } }),
      prisma.album.count({ where: { isSample: true } }),
      prisma.newsPost.count({ where: { isSample: true } }),
      prisma.video.count({ where: { isSample: true } }),
    ]),
    prisma.user.findMany({ where: { role: "SUPER_ADMIN", isActive: true, NOT: { twoFactorEnabled: true } }, select: { email: true } }),
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
  const [sampleEditions, ...sampleContent] = sample;
  const sampleTotal = sample.reduce((a, b) => a + b, 0);
  const branding = SiteSettingsSchema.shape.branding.safeParse(settingsRow?.branding);
  const social = SiteSettingsSchema.shape.social.safeParse(settingsRow?.social);
  const contact = SiteSettingsSchema.shape.contact.safeParse(settingsRow?.contact);
  const pages = SiteSettingsSchema.shape.pages.safeParse(settingsRow?.pages);
  const templates = pages.success ? (["about", "privacy", "terms"] as const).filter((k) => pages.data[k].isTemplate) : ["about", "privacy", "terms"];
  const prod = env.APP_ENV === "production";
  const smtpOk = !prod || !["localhost", "127.0.0.1", "mailpit"].includes(env.SMTP_HOST);
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

  return [
    { id: "default-passwords", label: "Default passwords changed", ok: usingDefault.length === 0, detail: usingDefault.length ? `Still using a seeded password: ${usingDefault.join(", ")}` : "No staff account uses a seeded password.", href: "/admin/users", superAdminOnly: true },
    {
      id: "sample-data",
      label: "Sample data removed",
      ok: sampleTotal === 0,
      detail: sampleTotal ? `${n(sampleEditions!, "sample edition", "sample editions")} and ${sampleContent.reduce((a, b) => a + b, 0)} sample artists/media/videos/albums/news.` : "No sample data left.",
      href: "/admin/settings#danger",
      superAdminOnly: true,
    },
    {
      id: "edition",
      label: "Current edition announced",
      ok: edition?.status === "PUBLISHED",
      detail: !edition ? "No edition yet." : edition.status === "PUBLISHED" ? `${edition.nameEn} is live.` : `${edition.nameEn} is still a draft.`,
      href: edition ? `/admin/editions/${edition.id}` : "/admin/editions",
    },
    { id: "smtp", label: "Email for staff password resets", ok: smtpOk, detail: smtpOk ? (prod ? `Sending through ${env.SMTP_HOST}.` : `Dev: Mailpit (${env.SMTP_HOST}:${env.SMTP_PORT}).`) : "Optional. Without SMTP a super admin resets staff passwords on the Staff page.", superAdminOnly: true },
    { id: "2fa", label: "Super admins use 2FA", ok: admins.length === 0, detail: admins.length ? `No two-factor: ${admins.map((a) => a.email).join(", ")}` : "Every super admin has two-factor on.", href: "/admin/security", superAdminOnly: true },
    { id: "pages", label: "About, Privacy and Terms written", ok: templates.length === 0, detail: templates.length ? `Still template text: ${templates.join(", ")}.` : "All pages edited.", href: "/admin/settings#pages", superAdminOnly: true },
    { id: "artist-photos", label: "Published artists have a photo", ok: artistsNoPhoto === 0, detail: artistsNoPhoto ? `${n(artistsNoPhoto, "artist uses", "artists use")} the branded fallback.` : "Every published artist has a photo.", href: "/admin/artists" },
    { id: "logo", label: "Logo uploaded", ok: branding.success && !!branding.data.logoId, detail: branding.success && branding.data.logoId ? "Logo set." : "The header uses the type wordmark.", href: "/admin/settings", superAdminOnly: true },
    { id: "social", label: "Social links added", ok: social.success && Object.values(social.data).some(Boolean), detail: social.success && Object.values(social.data).some(Boolean) ? "Social links set." : "No social links yet; the footer hides them.", href: "/admin/settings", superAdminOnly: true },
    { id: "contact", label: "Contact email added", ok: contact.success && !!contact.data.email, detail: contact.success && contact.data.email ? `Contact: ${contact.data.email}` : "No contact email yet.", href: "/admin/settings", superAdminOnly: true },
  ];
}
