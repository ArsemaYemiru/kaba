import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminPage, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { formatEat } from "@/lib/time";
import { dashboardEdition } from "@/server/admin/dashboard";
import { listMembers } from "@/server/admin/members";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Members" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function MembersPage(props: PageProps<"/admin/members">) {
  return (
    <Suspense fallback={<Loading />}>
      <MembersPageContent {...props} />
    </Suspense>
  );
}

async function MembersPageContent({ searchParams }: PageProps<"/admin/members">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["joined", "email", "lastLogin"], defaultSort: "joined", filters: ["verified", "banned", "voted", "sample"] });
  const edition = await dashboardEdition();
  const { rows, total } = await listMembers(p, edition?.id ?? null);
  const d = (x: Date | null) => (x ? formatEat(x, "en-GB", { dateStyle: "medium" }) : "—");
  return (
    <AdminPage
      title="Members"
      description={`Fans with accounts. Votes column = counting votes in ${edition?.nameEn ?? "the current edition"}.`}
      actions={
        <Button asChild variant="outline" size="sm">
          {/* A file download, not a page: a plain anchor is correct here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/admin/members/news-optins">
            <Download /> News opt-ins (CSV)
          </a>
        </Button>
      }
    >
      <ListToolbar
        searchPlaceholder="Search email, name or phone…"
        withStatus={false}
        filters={[
          { param: "verified", label: "Verified", options: [{ value: "1", label: "Verified" }, { value: "0", label: "Not verified" }] },
          { param: "banned", label: "Banned", options: [{ value: "1", label: "Banned" }] },
          { param: "voted", label: "Voted", options: [{ value: "1", label: "Has voted" }, { value: "0", label: "Not voted" }] },
          { param: "sample", label: "Sample", options: [{ value: "0", label: "Real members" }, { value: "1", label: "Sample members" }] },
        ]}
      />
      <Panel>
        <div className="-m-4 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Votes</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="font-medium hover:text-gold">
                      {m.displayName || m.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      <Chip size="sm" variant={m.emailVerified ? "green" : "muted"}>{m.emailVerified ? "Verified" : "Unverified"}</Chip>
                      {m.phoneNumberVerified ? <Chip size="sm" variant="green">Phone</Chip> : null}
                      {m.banned ? <Chip size="sm" variant="red">Banned</Chip> : null}
                      {m.newsOptIn ? <Chip size="sm" variant="muted">News</Chip> : null}
                      {m.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{m._count.votes}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{d(m.createdAt)}</td>
                  <td className="px-4 py-3 text-xs tabular-nums">{d(m.lastLoginAt)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No members match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
      <ListPagination basePath="/admin/members" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
