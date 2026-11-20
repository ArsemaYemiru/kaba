import type { Metadata } from "next";
import { HonoreesTable } from "@/components/admin/modules/awards-tables";
import { ReorderList } from "@/components/admin/modules/awards-forms";
import { CsvImport } from "@/components/admin/modules/csv-import";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { AdminPage, Panel } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { categoryOptions, listHonoreesAdmin, reorderItems } from "@/server/admin/awards-loaders";
import { editionOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Honorees" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function HonoreesPage(props: PageProps<"/admin/honorees">) {
  return (
    <Suspense fallback={<Loading />}>
      <HonoreesPageContent {...props} />
    </Suspense>
  );
}

async function HonoreesPageContent({ searchParams }: PageProps<"/admin/honorees">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["order", "name", "updated"], defaultSort: "order", defaultDir: "asc", filters: ["edition", "category", "artist"] });
  const categoryId = (p.filters as Record<string, string | undefined>).category;
  const [{ rows, total }, editions, categories, order] = await Promise.all([listHonoreesAdmin(p), editionOptions(), categoryOptions(), categoryId ? reorderItems("honorees", categoryId) : null]);
  return (
    <AdminPage title="Honorees" description="Artists recognized in each genre category, with their citation and featured work." actions={<CsvImport editions={editions} />}>
      <ListToolbar
        searchPlaceholder="Search honorees or artists…"
        newHref={`/admin/honorees/new${categoryId ? `?category=${categoryId}` : ""}`}
        newLabel="New honoree"
        filters={[
          { param: "edition", label: "Edition", options: editions.map((e) => ({ value: e.id, label: e.label })) },
          { param: "category", label: "Genre", options: categories.map((c) => ({ value: c.id, label: c.label })) },
        ]}
      />
      <HonoreesTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/honorees" params={raw} page={p.page} total={total} />
      {order?.length ? (
        <Panel title="Order in this genre" className="mt-6">
          <ReorderList key={order.map((o) => o.id).join()} kind="honorees" items={order} />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
