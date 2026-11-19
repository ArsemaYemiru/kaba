"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Trophy } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { CategoryIcon } from "@/components/awards/category-icons";
import { bulkCategories, bulkNominees } from "@/server/actions/admin/awards";
import { DataTable, STANDARD_BULK } from "../data-table";
import { MediaThumb } from "../media-thumb";
import { StatusBadge } from "../status-badge";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
const VTYPE: Record<string, string> = { PUBLIC_VOTE: "Public vote", HYBRID: "Public + Jury", JURY: "Jury", HONORARY: "Honorary" };
const view = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-gold hover:underline" aria-label={`Preview ${label}`}>
    View <ExternalLink className="size-3" />
  </a>
);
const nomineesVisible = (phase: string) => phase !== "DRAFT";

/* Categories */
export type CategoryRow = {
  id: string; slug: string; nameEn: string; icon: string; votingType: string; status: Status; isSample: boolean; sortOrder: number; updatedAt: Date;
  edition: { slug: string; year: number; phase: string }; _count: { nominees: number };
};
const categoryCols: ColumnDef<CategoryRow, unknown>[] = [
  {
    id: "name",
    header: "Category",
    cell: ({ row: { original: c } }) => (
      <Link href={`/admin/categories/${c.id}`} className="flex items-center gap-3 hover:text-gold">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-gold">
          <CategoryIcon name={c.icon} className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{c.nameEn}</span>
          <span className="block text-xs text-muted-foreground">Feta Awards {c.edition.year}</span>
        </span>
      </Link>
    ),
  },
  { id: "type", header: "Voting", cell: ({ row }) => <span className="text-xs">{VTYPE[row.original.votingType]}</span> },
  {
    id: "nominees",
    header: "Nominees",
    cell: ({ row: { original: c } }) => (
      <Link href={`/admin/nominees?category=${c.id}`} className="text-xs text-gold tabular-nums hover:underline">
        {c._count.nominees}
      </Link>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row: { original: c } }) => (
      <span className="flex gap-1">
        <StatusBadge status={c.status} />
        {c.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}
      </span>
    ),
  },
  { id: "preview", header: "", cell: ({ row: { original: c } }) => (c.status === "PUBLISHED" && nomineesVisible(c.edition.phase) ? view(`/awards/${c.edition.slug}/${c.slug}`, c.nameEn) : null) },
];
export function CategoriesTable({ rows, sort }: { rows: CategoryRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Categories" rows={rows} columns={categoryCols} sortable={{ name: "name" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkCategories(i) }} empty="No categories match." />;
}

/* Nominees */
export type NomineeRow = {
  id: string; slug: string; displayNameEn: string; workTitleEn: string | null; status: Status; isSample: boolean; isWinner: boolean; juryScore: number | null; updatedAt: Date;
  image: { url: string; alt: string } | null; category: { nameEn: string; votingType: string; edition: { year: number; phase: string } }; _count: { artists: number };
};
const nomineeCols: ColumnDef<NomineeRow, unknown>[] = [
  {
    id: "name",
    header: "Nominee",
    cell: ({ row: { original: n } }) => (
      <Link href={`/admin/nominees/${n.id}`} className="flex items-center gap-3 hover:text-gold">
        <MediaThumb media={n.image ? { ...n.image, type: "IMAGE" } : null} className="size-10 shrink-0 rounded" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{n.workTitleEn ?? n.displayNameEn}</span>
          <span className="block truncate text-xs text-muted-foreground">{n.workTitleEn ? `${n.displayNameEn} · ` : ""}{n.category.nameEn} · {n.category.edition.year}</span>
        </span>
      </Link>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row: { original: n } }) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge status={n.status} />
        {n.isWinner ? (
          <Chip size="sm" variant="foil">
            <Trophy className="size-3" /> Winner
          </Chip>
        ) : null}
        {n.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}
        {n._count.artists ? <Chip size="sm" variant="muted">{n._count.artists} artist{n._count.artists === 1 ? "" : "s"}</Chip> : null}
      </span>
    ),
  },
  { id: "jury", header: "Jury", cell: ({ row: { original: n } }) => (n.category.votingType === "JURY" || n.category.votingType === "HYBRID" ? <span className="text-xs tabular-nums">{n.juryScore ?? "—"}</span> : null) },
  { id: "preview", header: "", cell: ({ row: { original: n } }) => (n.status === "PUBLISHED" && nomineesVisible(n.category.edition.phase) ? view(`/nominees/${n.slug}`, n.displayNameEn) : null) },
];
export function NomineesTable({ rows, sort }: { rows: NomineeRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Nominees" rows={rows} columns={nomineeCols} sortable={{ name: "name" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkNominees(i) }} empty="No nominees match." />;
}

