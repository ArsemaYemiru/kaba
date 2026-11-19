import type { Metadata } from "next";
import { AlbumForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { albumToForm } from "@/server/admin/form-values";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New album" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewAlbumPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewAlbumPageContent />
    </Suspense>
  );
}

async function NewAlbumPageContent() {
  await requireUser();
  return <AlbumForm id={null} initial={albumToForm(null)} media={[]} editions={await editionOptions()} />;
}
