import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { newsToForm } from "@/server/admin/form-values";
import { editionOptions, getNewsForEdit, mediaByIds } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit post" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditNewsPage(props: PageProps<"/admin/news/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditNewsPageContent {...props} />
    </Suspense>
  );
}

async function EditNewsPageContent({ params }: PageProps<"/admin/news/[id]">) {
  await requireUser();
  const { id } = await params;
  const n = await getNewsForEdit(id);
  if (!n) notFound();
  const live = n.status === "PUBLISHED" && !!n.publishedAt && n.publishedAt <= new Date();
  return <NewsForm key={n.updatedAt.toISOString()} id={n.id} initial={newsToForm(n)} media={await mediaByIds([n.coverId])} liveSlug={live ? n.slug : null} editions={await editionOptions()} />;
}
