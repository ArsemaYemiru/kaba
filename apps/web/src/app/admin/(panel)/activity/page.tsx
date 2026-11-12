import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { ActivityRow } from "@/components/admin/activity-row";
import { AdminPage, Panel } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Activity Log" };

const PER_PAGE = 50;
const Filters = z.object({
  action: z.string().max(40).optional().catch(undefined),
  entity: z.string().max(40).optional().catch(undefined),
  user: z.string().max(60).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireUser();
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const f = Filters.parse({ action: one("action"), entity: one("entity"), user: one("user"), page: one("page") });

  const where: Prisma.ActivityLogWhereInput = {
    ...(f.action ? { action: f.action } : {}),
    ...(f.entity ? { entityType: f.entity } : {}),
    ...(f.user ? { userId: f.user } : {}),
  };
  const [rows, total, actions, entities, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, action: true, entityType: true, entityId: true, meta: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.activityLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { action: f.action, entity: f.entity, user: f.user, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/activity${p.size ? `?${p}` : ""}`;
  };
  const select = "h-9 rounded-md border border-line bg-surface px-3 text-sm";

  return (
    <AdminPage title="Activity Log" description="Logins, edits, publishes and deletions, newest first.">
      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Action
          <select name="action" defaultValue={f.action ?? ""} className={select}>
            <option value="">All</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Entity
          <select name="entity" defaultValue={f.entity ?? ""} className={select}>
            <option value="">All</option>
            {entities.map((e) => (
              <option key={e.entityType} value={e.entityType}>
                {e.entityType}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          User
          <select name="user" defaultValue={f.user ?? ""} className={select}>
            <option value="">All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-full bg-gold px-4 text-sm font-semibold text-bg">
          Filter
        </button>
        {f.action || f.entity || f.user ? (
          <Link href="/admin/activity" className="h-9 py-2 text-sm text-gold hover:underline">
            Clear
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{total} entries</span>
      </form>
      <Panel>
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <ActivityRow key={r.id} entry={r} />
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No matching activity.</p>
        )}
      </Panel>
      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {f.page > 1 ? <Link className="text-gold hover:underline" href={qs({ page: String(f.page - 1) })}>← Newer</Link> : <span />}
          <span className="text-muted-foreground tabular-nums">
            Page {f.page} of {pages}
          </span>
          {f.page < pages ? <Link className="text-gold hover:underline" href={qs({ page: String(f.page + 1) })}>Older →</Link> : <span />}
        </nav>
      ) : null}
    </AdminPage>
  );
}
