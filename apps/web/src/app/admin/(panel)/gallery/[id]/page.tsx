import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { albumToForm } from "@/server/admin/form-values";
import { episodeOptions, getAlbumForEdit, mediaByIds } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Edit album" };

export default async function EditAlbumPage({ params }: PageProps<"/admin/gallery/[id]">) {
  await requireUser();
  const { id } = await params;
  const a = await getAlbumForEdit(id);
  if (!a) notFound();
  const [episodes, media] = await Promise.all([episodeOptions(), mediaByIds([a.coverId, ...a.items.map((i) => i.mediaId)])]);
  return <AlbumForm key={a.updatedAt.toISOString()} id={a.id} initial={albumToForm(a)} media={media} episodes={episodes} />;
}
