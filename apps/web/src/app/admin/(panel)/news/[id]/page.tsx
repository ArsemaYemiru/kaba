import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { newsToForm } from "@/server/admin/form-values";
import { getNewsForEdit, mediaByIds } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditNewsPage({ params }: PageProps<"/admin/news/[id]">) {
  await requireUser();
  const { id } = await params;
  const n = await getNewsForEdit(id);
  if (!n) notFound();
  const live = n.status === "PUBLISHED" && !!n.publishedAt && n.publishedAt <= new Date();
  return <NewsForm key={n.updatedAt.toISOString()} id={n.id} initial={newsToForm(n)} media={await mediaByIds([n.coverId])} liveSlug={live ? n.slug : null} />;
}
