import type { Metadata } from "next";
import { EditionForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { editionToForm } from "@/server/admin/awards-loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New edition" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewEditionPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewEditionPageContent />
    </Suspense>
  );
}

async function NewEditionPageContent() {
  await requireUser();
  return <EditionForm id={null} initial={editionToForm(null)} media={[]} canDelete={false} />;
}
