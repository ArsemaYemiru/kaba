import { connection } from "next/server";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/authz";
import { prisma } from "@/lib/db";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** CSV of members who opted in to news (spec §6). Staff only; the export is logged. */
export async function GET() {
  await connection();
  const a = await authorize();
  if (!a.ok) return new Response("Forbidden", { status: 403 });
  const rows = await prisma.user.findMany({
    where: { role: "MEMBER", newsOptIn: true, banned: { not: true }, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { email: true, displayName: true, name: true, emailVerified: true, createdAt: true },
  });
  const lines = [["email", "name", "verified", "joined"].map(cell).join(","), ...rows.map((r) => [r.email, r.displayName || r.name, r.emailVerified ? "yes" : "no", r.createdAt.toISOString()].map(cell).join(","))];
  await logActivity({ userId: a.user.id, action: "export", entityType: "User", meta: { label: `News opt-ins CSV (${rows.length})` } });
  return new Response(`﻿${lines.join("\n")}\n`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="feta-awards-news-optins.csv"', "cache-control": "private, no-store" } });
}
