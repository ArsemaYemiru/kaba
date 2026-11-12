import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { VideosTable } from "@/components/admin/modules/simple-tables";
import { AdminPage } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { listVideosAdmin } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Videos" };

export default async function VideosAdminPage({ searchParams }: PageProps<"/admin/videos">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["updated", "title", "published"], defaultSort: "updated", filters: ["type", "source"] });
  const { rows, total } = await listVideosAdmin(p);
  return (
    <AdminPage title="Videos" description="Full episodes, highlights, performances, behind the scenes and interviews.">
      <ListToolbar
        searchPlaceholder="Search titles…"
        newHref="/admin/videos/new"
        newLabel="New video"
        filters={[
          { param: "type", label: "Type", options: [{ value: "FULL_EPISODE", label: "Full episode" }, { value: "HIGHLIGHT", label: "Highlight" }, { value: "PERFORMANCE", label: "Performance" }, { value: "BEHIND_THE_SCENES", label: "Behind the scenes" }, { value: "INTERVIEW", label: "Interview" }] },
          { param: "source", label: "Source", options: [{ value: "NONE", label: "None" }, { value: "YOUTUBE", label: "YouTube" }, { value: "UPLOAD", label: "Upload" }] },
        ]}
      />
      <VideosTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/videos" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
