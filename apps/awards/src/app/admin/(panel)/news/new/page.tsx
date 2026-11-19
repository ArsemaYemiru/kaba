import type { Metadata } from "next";
import { NewsForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { newsToForm } from "@/server/admin/form-values";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New post" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewNewsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewNewsPageContent />
    </Suspense>
  );
}

async function NewNewsPageContent() {
  await requireUser();
  return <NewsForm id={null} initial={newsToForm(null)} media={[]} liveSlug={null} editions={await editionOptions()} />;
}
