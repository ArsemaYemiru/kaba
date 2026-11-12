import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { EpisodesTable } from "@/components/admin/modules/episodes-table";
import { AdminPage } from "@/components/admin/ui";
import { parseListParams } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { listEpisodesAdmin } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "Episodes" };

export default async function EpisodesAdminPage({ searchParams }: PageProps<"/admin/episodes">) {
  await requireUser();
  const raw = await searchParams;
  const p = parseListParams(raw, { sorts: ["updated", "title", "airDate"], defaultSort: "updated", filters: ["type", "season", "video"] });
  const { rows, total } = await listEpisodesAdmin(p);
  return (
    <AdminPage title="Episodes" description="Matchups, holiday specials and performances.">
      <ListToolbar
        searchPlaceholder="Search titles or contestants…"
        newHref="/admin/episodes/new"
        newLabel="New episode"
        filters={[
          { param: "type", label: "Type", options: [{ value: "GAME_SHOW", label: "Game show" }, { value: "HOLIDAY_SPECIAL", label: "Holiday special" }, { value: "PERFORMANCE", label: "Performance" }, { value: "BEHIND_THE_SCENES", label: "Behind the scenes" }] },
          { param: "video", label: "Video", options: [{ value: "none", label: "No video yet" }] },
        ]}
      />
      <EpisodesTable rows={rows} sort={{ key: p.sort, dir: p.dir }} />
      <ListPagination basePath="/admin/episodes" params={raw} page={p.page} total={total} />
    </AdminPage>
  );
}
