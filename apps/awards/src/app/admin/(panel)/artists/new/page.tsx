import type { Metadata } from "next";
import { ArtistForm } from "@/components/admin/modules/artist-form";
import { requireUser } from "@/lib/authz";
import { artistToForm } from "@/server/admin/form-values";
import { videoOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Add artist" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewArtistPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewArtistPageContent />
    </Suspense>
  );
}

async function NewArtistPageContent() {
  await requireUser();
  const videos = await videoOptions();
  return <ArtistForm id={null} initial={artistToForm(null)} media={[]} videos={videos} publishedSlug={null} />;
}
