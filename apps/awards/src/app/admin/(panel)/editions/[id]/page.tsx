import { BarChart3, LayoutGrid } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditionForm, PhasePanel } from "@/components/admin/modules/awards-forms";
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
      <div className="mx-auto grid w-full max-w-5xl gap-3 px-4 pt-6 sm:px-6 md:grid-cols-[1fr_auto]">
        <PhasePanel editionId={e.id} phase={e.phase} isSuperAdmin={me.role === "SUPER_ADMIN"} />
        <nav aria-label="Edition shortcuts" className="flex flex-col gap-2 text-sm">
          <Link href={`/admin/categories?edition=${e.id}`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 hover:border-gold/60">
            <LayoutGrid className="size-4 text-gold" /> Categories
          </Link>
          <Link href={`/admin/results?edition=${e.id}`} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 hover:border-gold/60">
            <BarChart3 className="size-4 text-gold" /> Results
          </Link>
        </nav>
      </div>
      <EditionForm key={e.updatedAt.toISOString()} id={e.id} initial={editionToForm(e)} media={await mediaByIds([e.heroMediaId])} canDelete={me.role === "SUPER_ADMIN"} />
    </>
  );
}
