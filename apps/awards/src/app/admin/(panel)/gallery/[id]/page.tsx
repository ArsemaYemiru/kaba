import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { albumToForm } from "@/server/admin/form-values";
import { editionOptions, getAlbumForEdit, mediaByIds } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit album" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditAlbumPage(props: PageProps<"/admin/gallery/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditAlbumPageContent {...props} />
    </Suspense>
  );
}

async function EditAlbumPageContent({ params }: PageProps<"/admin/gallery/[id]">) {
  await requireUser();
  const { id } = await params;
  const a = await getAlbumForEdit(id);
  if (!a) notFound();
  const [editions, media] = await Promise.all([editionOptions(), mediaByIds([a.coverId, ...a.items.map((i) => i.mediaId)])]);
  return <AlbumForm key={a.updatedAt.toISOString()} id={a.id} initial={albumToForm(a)} media={media} editions={editions} />;
}
