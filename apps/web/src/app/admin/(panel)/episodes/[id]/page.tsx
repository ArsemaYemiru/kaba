import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EpisodeForm } from "@/components/admin/modules/episode-form";
import { requireUser } from "@/lib/authz";
import { episodeToForm } from "@/server/admin/form-values";
import { artistOptions, getEpisodeForEdit, mediaByIds } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Edit episode" };

export default async function EditEpisodePage({ params }: PageProps<"/admin/episodes/[id]">) {
  await requireUser();
  const { id } = await params;
  const ep = await getEpisodeForEdit(id);
  if (!ep) notFound();
  const [artists, media] = await Promise.all([artistOptions(), mediaByIds([ep.thumbnailId, ep.videoMediaId, ...ep.gallery.map((g) => g.mediaId)])]);
  return <EpisodeForm key={ep.updatedAt.toISOString()} id={ep.id} initial={episodeToForm(ep)} media={media} artists={artists} publishedSlug={ep.status === "PUBLISHED" ? ep.slug : null} />;
}
