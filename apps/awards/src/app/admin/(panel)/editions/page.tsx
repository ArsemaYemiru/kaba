import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { PHASE_LABEL as PHASE_LABELS } from "@/server/admin/phase";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminPage, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/authz";
import { formatEat } from "@/lib/time";
import { listEditionsAdmin } from "@/server/admin/awards-loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Editions" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function EditionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditionsPageContent />
    </Suspense>
  );
}

async function EditionsPageContent() {
  await requireUser();
  const editions = await listEditionsAdmin();
  const d = (x: Date | null) => (x ? formatEat(x, "en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
  return (
    <AdminPage
      title="Editions"
      description="One edition per year. Each has its categories, nominees, voting window and phase."
      actions={
        <Button asChild size="sm">
          <Link href="/admin/editions/new">
            <Plus /> New edition
          </Link>
        </Button>
      }
    >
      <Panel>
        <div className="-m-4 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Edition</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Voting window (EAT)</th>
                <th className="px-4 py-3 font-medium">Categories</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {editions.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/editions/${e.id}`} className="font-medium hover:text-gold">
                      {e.nameEn}
                    </Link>
                    {e.isSample ? <Chip size="sm" variant="muted" className="ml-2">Sample</Chip> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Chip size="sm" variant={e.phase === "VOTING_OPEN" ? "red" : e.phase === "WINNERS_ANNOUNCED" ? "foil" : "default"}>
                      {PHASE_LABELS[e.phase]}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {d(e.votingOpensAt)} → {d(e.votingClosesAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/categories?edition=${e.id}`} className="text-xs text-gold tabular-nums hover:underline">
                      {e._count.categories}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
              {!editions.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No editions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminPage>
  );
}
