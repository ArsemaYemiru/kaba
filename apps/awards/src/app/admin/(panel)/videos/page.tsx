import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { VideosTable } from "@/components/admin/modules/simple-tables";
import { AdminPage } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { listVideosAdmin } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Videos" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function VideosAdminPage(props: PageProps<"/admin/videos">) {
  return (
    <Suspense fallback={<Loading />}>
      <VideosAdminPageContent {...props} />
    </Suspense>
  );
}

async function VideosAdminPageContent({ searchParams }: PageProps<"/admin/videos">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["updated", "title", "published"], defaultSort: "updated", filters: ["type", "source"] });
  const { rows, total } = await listVideosAdmin(p);
  return (
    <AdminPage title="Videos" description="Awards night, red carpet, performances, acceptance speeches and interviews.">
      <ListToolbar
        searchPlaceholder="Search titles…"
        newHref="/admin/videos/new"
        newLabel="New video"
        filters={[
          { param: "type", label: "Type", options: [{ value: "AWARDS_NIGHT", label: "Awards night" }, { value: "RED_CARPET", label: "Red carpet" }, { value: "PERFORMANCE", label: "Performance" }, { value: "ACCEPTANCE_SPEECH", label: "Acceptance speech" }, { value: "INTERVIEW", label: "Interview" }, { value: "BEHIND_THE_SCENES", label: "Behind the scenes" }] },
          { param: "source", label: "Source", options: [{ value: "NONE", label: "None" }, { value: "YOUTUBE", label: "YouTube" }, { value: "UPLOAD", label: "Upload" }] },
        ]}
      />
      <VideosTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/videos" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
