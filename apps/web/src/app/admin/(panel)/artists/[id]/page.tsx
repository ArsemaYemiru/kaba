import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistForm } from "@/components/admin/modules/artist-form";
import { requireUser } from "@/lib/authz";
import { artistToForm } from "@/server/admin/form-values";
import { getArtistForEdit, mediaByIds, videoOptions } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Edit artist" };

export default async function EditArtistPage({ params }: PageProps<"/admin/artists/[id]">) {
  await requireUser();
  const { id } = await params;
  const artist = await getArtistForEdit(id);
  if (!artist) notFound();
  const [videos, media] = await Promise.all([videoOptions(), mediaByIds([artist.portraitId, artist.coverId, ...artist.gallery.map((g) => g.mediaId)])]);
  return (
    <ArtistForm
      key={artist.updatedAt.toISOString()}
      id={artist.id}
      initial={artistToForm(artist)}
      media={media}
      videos={videos}
      publishedSlug={artist.status === "PUBLISHED" ? artist.slug : null}
    />
  );
}
