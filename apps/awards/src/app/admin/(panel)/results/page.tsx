import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResultsBoard } from "@/components/admin/modules/results-board";
import { AdminPage } from "@/components/admin/ui";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { dashboardEdition } from "@/server/admin/dashboard";
import { resultsBoard } from "@/server/admin/results";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Results" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function ResultsPage(props: PageProps<"/admin/results">) {
  return (
    <Suspense fallback={<Loading />}>
      <ResultsPageContent {...props} />
    </Suspense>
  );
}

/** Results per edition (spec §6). Live tallies are staff-only; lock/override/publish are super-admin only. */
async function ResultsPageContent({ searchParams }: PageProps<"/admin/results">) {
  const me = await requireUser();
  const { edition: raw } = await searchParams;
  const current = typeof raw === "string" ? raw : (await dashboardEdition())?.id;
  if (!current) return <AdminPage title="Results">No editions yet.</AdminPage>;
  const [board, editions] = await Promise.all([resultsBoard(current), prisma.awardEdition.findMany({ orderBy: { year: "desc" }, select: { id: true, nameEn: true } })]);
  if (!board) redirect("/admin/results");
  return (
    <AdminPage
      title={`Results · ${board.edition.nameEn}`}
      description="Live tallies (staff only), jury scores, lock, overrides and publishing."
      actions={
        <form className="flex items-center gap-2" action="/admin/results">
          <label className="sr-only" htmlFor="edition">
            Edition
          </label>
          <select id="edition" name="edition" defaultValue={board.edition.id} className="h-9 rounded-md border border-line bg-bg px-2 text-sm">
            {editions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nameEn}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-md border border-line px-3 text-sm hover:border-gold/60">
            Show
          </button>
        </form>
      }
    >
      <ResultsBoard board={board} isSuperAdmin={me.role === "SUPER_ADMIN"} />
    </AdminPage>
  );
}
