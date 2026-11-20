import type { Metadata } from "next";
import { CategoriesTable } from "@/components/admin/modules/awards-tables";
import { ReorderList } from "@/components/admin/modules/awards-forms";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminPage, Panel } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { listCategoriesAdmin, reorderItems } from "@/server/admin/awards-loaders";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Categories" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function CategoriesPage(props: PageProps<"/admin/categories">) {
  return (
    <Suspense fallback={<Loading />}>
      <CategoriesPageContent {...props} />
    </Suspense>
  );
}

async function CategoriesPageContent({ searchParams }: PageProps<"/admin/categories">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["order", "name", "updated"], defaultSort: "order", defaultDir: "asc", filters: ["edition"] });
  const editionId = (p.filters as Record<string, string | undefined>).edition;
  const [{ rows, total }, editions, order] = await Promise.all([listCategoriesAdmin(p), editionOptions(), editionId ? reorderItems("categories", editionId) : null]);
  return (
    <AdminPage title="Genre categories" description="The genres of each edition (Classical, Bati, Afrobeat…) and their order on the site.">
      <ListToolbar
        searchPlaceholder="Search genres…"
        newHref={`/admin/categories/new${editionId ? `?edition=${editionId}` : ""}`}
        newLabel="New genre"
        filters={[
          { param: "edition", label: "Edition", options: editions.map((e) => ({ value: e.id, label: e.label })) },
        ]}
      />
      <CategoriesTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/categories" params={raw} page={p.page} total={total} />
      {order?.length ? (
        <Panel title="Order on the site" className="mt-6">
          <p className="mb-3 text-xs text-muted-foreground">Drag (or focus the handle and use the arrow keys) to reorder. Saves immediately.</p>
          <ReorderList key={order.map((o) => o.id).join()} kind="categories" items={order} />
        </Panel>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Filter by an edition to reorder its genres.</p>
      )}
    </AdminPage>
  );
}
