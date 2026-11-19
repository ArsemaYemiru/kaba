import type { Metadata } from "next";
import { SettingsEditor } from "@/components/admin/modules/settings-editor";
import { AdminPage, ForbiddenPanel } from "@/components/admin/ui";
import { isSuperAdmin, requireUser } from "@/lib/authz";
import type { SiteSettingsData } from "@/schemas/settings";
import { artistOptions, editionOptions, mediaByIds, nomineeOptions } from "@/server/admin/loaders";
import { getSettings } from "@/server/queries/settings";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Site Settings" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsPageContent />
    </Suspense>
  );
}

async function SettingsPageContent() {
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
  ];
  const [media, editions, nominees, artists] = await Promise.all([mediaByIds(ids), editionOptions(), nomineeOptions(), artistOptions()]);
  return (
    <AdminPage title="Site Settings" description="Super admins only. Each section saves separately and updates the public site immediately.">
      <SettingsEditor settings={data} media={media} editions={editions} nominees={nominees} artists={artists.map((a) => ({ id: a.id, label: a.nameEn, status: a.status }))} />
    </AdminPage>
  );
}
