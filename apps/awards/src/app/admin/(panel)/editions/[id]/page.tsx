import { Award, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditionForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { editionToForm, getEditionForEdit } from "@/server/admin/awards-loaders";
import { mediaByIds } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Edit edition" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditEditionPage(props: PageProps<"/admin/editions/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EditEditionPageContent {...props} />
    </Suspense>
  );
}

async function EditEditionPageContent({ params }: PageProps<"/admin/editions/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const e = await getEditionForEdit(id);
  if (!e) notFound();
  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-4 pt-6 text-sm sm:px-6">
        <nav aria-label="Edition shortcuts" className="flex flex-wrap gap-2">
          <Link href={`/admin/categories?edition=${e.id}`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 hover:border-gold/60">
            <LayoutGrid className="size-4 text-gold" /> Genre categories ({e._count.categories})
          </Link>
          <Link href={`/admin/honorees?edition=${e.id}`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 hover:border-gold/60">
            <Award className="size-4 text-gold" /> Honorees
          </Link>
        </nav>
      </div>
      <EditionForm key={e.updatedAt.toISOString()} id={e.id} initial={editionToForm(e)} media={await mediaByIds([e.heroMediaId])} canDelete={me.role === "SUPER_ADMIN"} />
    </>
  );
}
