import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddArtistsPanel, CategoryForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { categoryToForm, getCategoryForEdit } from "@/server/admin/awards-loaders";
import { artistOptions, editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit genre category" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditCategoryPage(props: PageProps<"/admin/categories/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditCategoryPageContent {...props} />
    </Suspense>
  );
}

async function EditCategoryPageContent({ params }: PageProps<"/admin/categories/[id]">) {
  await requireUser();
  const { id } = await params;
  const c = await getCategoryForEdit(id);
  if (!c) notFound();
  const [editions, artists] = await Promise.all([editionOptions(), artistOptions()]);
  const live = c.status === "PUBLISHED" && c.edition.status === "PUBLISHED" ? `/awards/${c.edition.slug}/${c.slug}` : null;
  return (
    <>
      <CategoryForm key={c.updatedAt.toISOString()} id={c.id} initial={categoryToForm(c)} editions={editions} liveHref={live} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <p className="mb-3 text-sm">
          <Link href={`/admin/honorees?category=${c.id}`} className="text-gold hover:underline">
            {c._count.nominees} honoree{c._count.nominees === 1 ? "" : "s"} in this genre →
          </Link>
        </p>
        <AddArtistsPanel categoryId={c.id} artists={artists} placed={c.nominees.map((n) => n.artistId)} />
      </div>
    </>
  );
}
