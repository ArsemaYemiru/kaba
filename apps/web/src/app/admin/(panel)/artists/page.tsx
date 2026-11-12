import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { ArtistsTable } from "@/components/admin/modules/artists-table";
import { AdminPage } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { ARTIST_CATEGORIES } from "@/schemas/admin/content";
import { listArtistsAdmin } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsAdminPage({ searchParams }: PageProps<"/admin/artists">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["updated", "name", "order"], defaultSort: "updated", filters: ["category", "legend", "featured"] });
  const { rows, total } = await listArtistsAdmin(p);
  return (
    <AdminPage title="Artists" description="Ethiopian artists and Feta contestants. Drafts are hidden from the public site.">
      <ListToolbar
        searchPlaceholder="Search names…"
        newHref="/admin/artists/new"
        newLabel="Add artist"
        filters={[
          { param: "category", label: "Category", options: ARTIST_CATEGORIES.map((c) => ({ value: c, label: c.replace("_", "/").toLowerCase() })) },
          { param: "legend", label: "Legend", options: [{ value: "1", label: "Legends only" }] },
          { param: "featured", label: "Featured", options: [{ value: "1", label: "Featured only" }] },
        ]}
      />
      <ArtistsTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/artists" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
