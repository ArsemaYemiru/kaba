import type { Metadata } from "next";
import { SettingsEditor } from "@/components/admin/modules/settings-editor";
import { AdminPage, ForbiddenPanel } from "@/components/admin/ui";
import { isSuperAdmin, requireUser } from "@/lib/authz";
import type { SiteSettingsData } from "@/schemas/settings";
import { artistOptions, episodeOptions, mediaByIds } from "@/server/admin/loaders";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Site Settings" };

export default async function SettingsPage() {
  const me = await requireUser();
  if (!isSuperAdmin(me)) return <ForbiddenPanel />; // the proxy already returned 403
  // Parsed per section with safe fallbacks (cached read; saves invalidate the "settings" tag).
  const { media: _media, ...data } = (await getSettings()) as SiteSettingsData & { media: unknown };
  const ids = [
    data.branding.logoId,
    data.hero.posterId,
    data.hero.videoId,
    data.seo.ogImageId,
    ...data.sponsors.map((s) => s.logoId),
    ...data.about.team.map((t) => t.photoId),
  ];
  const [media, episodes, artists] = await Promise.all([mediaByIds(ids), episodeOptions(), artistOptions()]);
  return (
    <AdminPage title="Site Settings" description="Super admins only. Each section saves separately and updates the public site immediately.">
      <SettingsEditor settings={data} media={media} episodes={episodes} artists={artists} />
    </AdminPage>
  );
}
