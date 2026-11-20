import type { Metadata } from "next";
import { VideoForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { videoToForm } from "@/server/admin/form-values";
import { artistOptions, editionOptions, honoreeOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New video" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewVideoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewVideoPageContent />
    </Suspense>
  );
}

async function NewVideoPageContent() {
  await requireUser();
  const [editions, artists, nominees] = await Promise.all([editionOptions(), artistOptions(), honoreeOptions()]);
  return <VideoForm id={null} initial={videoToForm(null)} media={[]} editions={editions} artists={artists} nominees={nominees} />;
}
