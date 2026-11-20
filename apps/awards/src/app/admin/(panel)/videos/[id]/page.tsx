import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { videoToForm } from "@/server/admin/form-values";
import { artistOptions, editionOptions, getVideoForEdit, mediaByIds, honoreeOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit video" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditVideoPage(props: PageProps<"/admin/videos/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditVideoPageContent {...props} />
    </Suspense>
  );
}

async function EditVideoPageContent({ params }: PageProps<"/admin/videos/[id]">) {
  await requireUser();
  const { id } = await params;
  const v = await getVideoForEdit(id);
  if (!v) notFound();
  const [editions, artists, nominees, media] = await Promise.all([editionOptions(), artistOptions(), honoreeOptions(), mediaByIds([v.mediaId, v.posterId])]);
  return <VideoForm key={v.updatedAt.toISOString()} id={v.id} initial={videoToForm(v)} media={media} editions={editions} artists={artists} nominees={nominees} />;
}
