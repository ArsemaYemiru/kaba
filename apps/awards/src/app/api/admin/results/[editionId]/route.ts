import { connection } from "next/server";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { resultsBoard } from "@/server/admin/results";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote, and neutralize spreadsheet formulas (CSV injection).
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** Results CSV (staff only: /api is outside the proxy matcher, so the handler checks access itself). */
export async function GET(_req: Request, { params }: RouteContext<"/api/admin/results/[editionId]">) {
  await connection();
  const a = await authorize();
  if (!a.ok) return new Response("Forbidden", { status: 403 });
  const { editionId } = await params;
  const board = await resultsBoard(editionId);
  if (!board) return new Response("Not found", { status: 404 });
  const lines = [["category", "voting_type", "nominee", "status", "votes", "public_share", "jury_score", "final_score", "winner", "source"].map(cell).join(",")];
  for (const c of board.categories) {
    const data = c.locked ?? c.live;
    const byId = new Map((data?.nominees ?? []).map((n) => [n.id, n]));
    const winner = c.override?.nomineeId ?? data?.winnerId ?? null;
    for (const n of c.nominees) {
      const r = byId.get(n.id);
      lines.push([c.nameEn, c.votingType, n.workTitleEn ?? n.displayNameEn, n.status, r?.votes ?? 0, r?.publicShare ?? 0, n.juryScore ?? "", r?.finalScore ?? 0, winner === n.id ? "yes" : "", c.override?.nomineeId === n.id ? "override" : c.locked ? "locked" : "live"].map(cell).join(","));
    }
  }
  await logActivity({ userId: a.user.id, action: "export", entityType: "AwardEdition", entityId: editionId, meta: { label: `Results CSV · ${board.edition.nameEn}` } });
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="feta-awards-${board.edition.year}-results.csv"`, "cache-control": "private, no-store" },
  });
}
