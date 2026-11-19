import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NomineeForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { categoryOptions, getNomineeForEdit, nomineeToForm } from "@/server/admin/awards-loaders";
import { artistOptions, mediaByIds } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit nominee" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditNomineePage(props: PageProps<"/admin/nominees/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditNomineePageContent {...props} />
    </Suspense>
  );
}

async function EditNomineePageContent({ params }: PageProps<"/admin/nominees/[id]">) {
  await requireUser();
  const { id } = await params;
  const n = await getNomineeForEdit(id);
  if (!n) notFound();
  const [categories, artists, media, cat] = await Promise.all([
    categoryOptions(),
    artistOptions(),
    mediaByIds([n.imageId]),
    prisma.awardCategory.findUnique({ where: { id: n.categoryId }, select: { status: true, edition: { select: { status: true, phase: true } } } }),
  ]);
  const live = n.status === "PUBLISHED" && cat?.status === "PUBLISHED" && cat.edition.status === "PUBLISHED" && cat.edition.phase !== "DRAFT" ? `/nominees/${n.slug}` : null;
  return <NomineeForm key={n.updatedAt.toISOString()} id={n.id} initial={nomineeToForm(n)} media={media} categories={categories} artists={artists} liveHref={live} hasVotes={n._count.votes > 0} />;
}
