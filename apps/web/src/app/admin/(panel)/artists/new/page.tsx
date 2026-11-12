import type { Metadata } from "next";
import { ArtistForm } from "@/components/admin/modules/artist-form";
import { requireUser } from "@/lib/authz";
import { artistToForm } from "@/server/admin/form-values";
import { videoOptions } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Add artist" };

export default async function NewArtistPage() {
  await requireUser();
  const videos = await videoOptions();
  return <ArtistForm id={null} initial={artistToForm(null)} media={[]} videos={videos} publishedSlug={null} />;
}
