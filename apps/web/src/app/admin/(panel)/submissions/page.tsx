import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { SubmissionsInbox, type SubmissionRow } from "@/components/admin/modules/submissions-inbox";
import { AdminPage } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import { PAGE_SIZE } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Submissions" };

const TABS = [
  { type: "CONTESTANT", label: "Contestants" },
  { type: "AUDIENCE", label: "Studio audience" },
  { type: "SPONSOR", label: "Sponsorship" },
] as const;
const STATUSES = ["NEW", "REVIEWED", "SHORTLISTED", "ARCHIVED"] as const;

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  await requireUser();
  const raw = await searchParams;
  const one = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);
  const type = TABS.find((t) => t.type === one("type"))?.type ?? "CONTESTANT";
  const status = STATUSES.find((s) => s === one("subStatus"));
  const q = one("q")?.slice(0, 100);
  const page = Math.max(1, Number(one("page")) || 1);
  const where: Prisma.SubmissionWhereInput = {
    type,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
  };
  const [rows, total, unread] = await Promise.all([
    prisma.submission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, type: true, status: true, name: true, email: true, phone: true, payload: true, notes: true, isSample: true, createdAt: true } }),
    prisma.submission.count({ where }),
    prisma.submission.groupBy({ by: ["type"], where: { status: "NEW" }, _count: true }),
  ]);
  const unreadBy = Object.fromEntries(unread.map((u) => [u.type, u._count]));
  const exportHref = `/api/admin/submissions/export?type=${type}${status ? `&status=${status}` : ""}`;

  return (
    <AdminPage
      title="Submissions"
      description="From the Join page. Notes are internal only."
      actions={
        <Button asChild size="sm" variant="outline">
          <a href={exportHref} download>
            <Download /> Export CSV
          </a>
        </Button>
      }
    >
      <nav aria-label="Submission types" className="mb-4 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.type}
            href={`/admin/submissions?type=${t.type}`}
            aria-current={t.type === type ? "page" : undefined}
            className={cn("relative -mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold", t.type === type ? "border-gold text-gold" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t.label}
            {unreadBy[t.type] ? <span className="rounded-full bg-red px-1.5 text-[0.6875rem] font-bold text-bg tabular-nums">{unreadBy[t.type]}</span> : null}
          </Link>
        ))}
      </nav>
      <ListToolbar withStatus={false} searchPlaceholder="Search name, email, phone…" filters={[{ param: "subStatus", label: "Status", options: STATUSES.map((s) => ({ value: s, label: s.toLowerCase() })) }]} />
      <SubmissionsInbox rows={rows.map((r) => ({ ...r, payload: (r.payload ?? {}) as Record<string, unknown> })) as SubmissionRow[]} />
      <ListPagination basePath="/admin/submissions" params={raw} page={page} total={total} />
    </AdminPage>
  );
}
