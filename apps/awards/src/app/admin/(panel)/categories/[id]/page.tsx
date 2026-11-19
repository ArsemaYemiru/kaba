import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { categoryToForm, getCategoryForEdit } from "@/server/admin/awards-loaders";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit category" };

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
  const [editions, edition] = await Promise.all([editionOptions(), prisma.awardEdition.findUnique({ where: { id: c.editionId }, select: { slug: true, phase: true, status: true } })]);
  const live = c.status === "PUBLISHED" && edition?.status === "PUBLISHED" && edition.phase !== "DRAFT" ? `/awards/${edition.slug}/${c.slug}` : null;
  return <CategoryForm key={c.updatedAt.toISOString()} id={c.id} initial={categoryToForm(c)} editions={editions} liveHref={live} />;
}
