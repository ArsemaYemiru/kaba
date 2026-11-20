import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HonoreeForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { categoryOptions, getHonoreeForEdit, honoreeToForm } from "@/server/admin/awards-loaders";
import { artistOptions, mediaByIds } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit honoree" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditHonoreePage(props: PageProps<"/admin/honorees/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditHonoreePageContent {...props} />
    </Suspense>
  );
}

async function EditHonoreePageContent({ params }: PageProps<"/admin/honorees/[id]">) {
  await requireUser();
  const { id } = await params;
  const n = await getHonoreeForEdit(id);
  if (!n) notFound();
  const [categories, artists, media] = await Promise.all([categoryOptions(), artistOptions(), mediaByIds([n.imageId])]);
  const live = n.status === "PUBLISHED" && n.artist.status === "PUBLISHED" && n.category.status === "PUBLISHED" && n.category.edition.status === "PUBLISHED" ? `/honorees/${n.slug}` : null;
  return <HonoreeForm key={n.updatedAt.toISOString()} id={n.id} initial={honoreeToForm(n)} media={media} categories={categories} artists={artists} liveHref={live} />;
}
