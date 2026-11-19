import type { Metadata } from "next";
import { CategoryForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { categoryToForm } from "@/server/admin/awards-loaders";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New category" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewCategoryPage(props: PageProps<"/admin/categories/new">) {
  return (
    <Suspense fallback={<Loading />}>
      <NewCategoryPageContent {...props} />
    </Suspense>
  );
}

async function NewCategoryPageContent({ searchParams }: PageProps<"/admin/categories/new">) {
  await requireUser();
  const { edition } = await searchParams;
  const editions = await editionOptions();
  return <CategoryForm id={null} initial={categoryToForm(null, typeof edition === "string" ? edition : editions[0]?.id)} editions={editions} liveHref={null} />;
}
