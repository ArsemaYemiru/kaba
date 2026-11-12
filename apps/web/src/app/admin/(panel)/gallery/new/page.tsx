import type { Metadata } from "next";
import { AlbumForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { albumToForm } from "@/server/admin/form-values";
import { episodeOptions } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "New album" };

export default async function NewAlbumPage() {
  await requireUser();
  return <AlbumForm id={null} initial={albumToForm(null)} media={[]} episodes={await episodeOptions()} />;
}
