import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AlbumsTable } from "@/components/admin/modules/simple-tables";
import { AdminPage } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { listAlbumsAdmin } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryAdminPage({ searchParams }: PageProps<"/admin/gallery">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["updated", "title"], defaultSort: "updated" });
  const { rows, total } = await listAlbumsAdmin(p);
  return (
    <AdminPage title="Gallery" description="Photo albums shown on the public Gallery.">
      <ListToolbar searchPlaceholder="Search albums…" newHref="/admin/gallery/new" newLabel="New album" />
      <AlbumsTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/gallery" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
