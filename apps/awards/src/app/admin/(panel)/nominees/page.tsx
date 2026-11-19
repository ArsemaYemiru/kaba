import type { Metadata } from "next";
import { NomineesTable } from "@/components/admin/modules/awards-tables";
import { ReorderList } from "@/components/admin/modules/awards-forms";
import { CsvImport } from "@/components/admin/modules/csv-import";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminPage, Panel } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { categoryOptions, listNomineesAdmin, reorderItems } from "@/server/admin/awards-loaders";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Nominees" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NomineesPage(props: PageProps<"/admin/nominees">) {
  return (
    <Suspense fallback={<Loading />}>
      <NomineesPageContent {...props} />
    </Suspense>
  );
}

async function NomineesPageContent({ searchParams }: PageProps<"/admin/nominees">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["order", "name", "updated"], defaultSort: "order", defaultDir: "asc", filters: ["edition", "category", "winner"] });
  const categoryId = (p.filters as Record<string, string | undefined>).category;
  const [{ rows, total }, editions, categories, order] = await Promise.all([listNomineesAdmin(p), editionOptions(), categoryOptions(), categoryId ? reorderItems("nominees", categoryId) : null]);
  return (
    <AdminPage title="Nominees" description="Nominees per category. Link artist profiles so nominations show on the artist's page." actions={<CsvImport editions={editions} />}>
      <ListToolbar
        searchPlaceholder="Search nominees…"
        newHref={`/admin/nominees/new${categoryId ? `?category=${categoryId}` : ""}`}
        newLabel="New nominee"
        filters={[
          { param: "edition", label: "Edition", options: editions.map((e) => ({ value: e.id, label: e.label })) },
          { param: "category", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.label })) },
          { param: "winner", label: "Winners", options: [{ value: "1", label: "Winners only" }] },
        ]}
      />
      <NomineesTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/nominees" params={raw} page={p.page} total={total} />
      {order?.length ? (
        <Panel title="Order in this category" className="mt-6">
          <ReorderList key={order.map((o) => o.id).join()} kind="nominees" items={order} />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
