import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { videoToForm } from "@/server/admin/form-values";
import { artistOptions, episodeOptions, getVideoForEdit, mediaByIds } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Edit video" };

export default async function EditVideoPage({ params }: PageProps<"/admin/videos/[id]">) {
  await requireUser();
  const { id } = await params;
  const v = await getVideoForEdit(id);
  if (!v) notFound();
  const [episodes, artists, media] = await Promise.all([episodeOptions(), artistOptions(), mediaByIds([v.mediaId, v.posterId])]);
  return <VideoForm key={v.updatedAt.toISOString()} id={v.id} initial={videoToForm(v)} media={media} episodes={episodes} artists={artists} />;
}
