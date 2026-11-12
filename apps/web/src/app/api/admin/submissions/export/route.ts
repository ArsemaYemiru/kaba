import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";

const TYPES = ["CONTESTANT", "AUDIENCE", "SPONSOR"] as const;
const STATUSES = ["NEW", "REVIEWED", "SHORTLISTED", "ARCHIVED"] as const;

/** RFC 4180 cell; also neutralises spreadsheet formula injection (=, +, -, @). */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join(" ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export of submissions (spec §5). Any signed-in admin. */
export async function GET(req: Request) {
  const a = await authorize();
  if (!a.ok) return new Response(a.error, { status: a.status });
  const url = new URL(req.url);
  const type = TYPES.find((t) => t === url.searchParams.get("type")) ?? "CONTESTANT";
  const status = STATUSES.find((s) => s === url.searchParams.get("status"));
  const rows = await prisma.submission.findMany({ where: { type, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" } });

  const payloadKeys = [...new Set(rows.flatMap((r) => Object.keys((r.payload as Record<string, unknown>) ?? {})))];
  const header = ["Received (Addis Ababa)", "Status", "Name", "Phone", "Email", ...payloadKeys, "Notes"];
  const lines = [header.map(cell).join(",")];
  for (const r of rows) {
    const p = (r.payload as Record<string, unknown>) ?? {};
    lines.push(
      [
        r.createdAt.toLocaleString("sv-SE", { timeZone: "Africa/Addis_Ababa" }),
        r.status,
        r.name,
        r.phone,
        r.email,
        ...payloadKeys.map((k) => p[k]),
        r.notes,
      ]
        .map(cell)
        .join(","),
    );
  }
  await logActivity({ userId: a.user.id, action: "update", entityType: "Submission", meta: { label: `CSV export ${type} (${rows.length})` } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="feta-${type.toLowerCase()}-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
