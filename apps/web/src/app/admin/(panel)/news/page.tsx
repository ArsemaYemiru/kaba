import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { NewsTable } from "@/components/admin/modules/simple-tables";
import { AdminPage } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { listNewsAdmin } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "News" };

export default async function NewsAdminPage({ searchParams }: PageProps<"/admin/news">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["updated", "title", "published"], defaultSort: "updated" });
  const { rows, total } = await listNewsAdmin(p);
  return (
    <AdminPage title="News" description="Published posts with a future date are scheduled.">
      <ListToolbar searchPlaceholder="Search titles or tags…" newHref="/admin/news/new" newLabel="New post" />
      <NewsTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/news" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
