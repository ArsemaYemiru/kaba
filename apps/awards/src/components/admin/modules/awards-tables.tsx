"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { CategoryIcon } from "@/components/awards/category-icons";
import { bulkCategories, bulkHonorees } from "@/server/actions/admin/awards";
import { DataTable, STANDARD_BULK } from "../data-table";
import { MediaThumb } from "../media-thumb";
import { StatusBadge } from "../status-badge";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
const view = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-gold hover:underline" aria-label={`View ${label}`}>
    View <ExternalLink className="size-3" />
  </a>
);

/* Categories */
export type CategoryRow = {
  id: string; slug: string; nameEn: string; icon: string; status: Status; isSample: boolean; sortOrder: number; updatedAt: Date;
  edition: { slug: string; year: number; status: Status }; _count: { nominees: number };
};
const categoryCols: ColumnDef<CategoryRow, unknown>[] = [
  {
    id: "name",
    header: "Genre",
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
  {
    id: "honorees",
    header: "Honorees",
    cell: ({ row: { original: c } }) => (
      <Link href={`/admin/honorees?category=${c.id}`} className="text-xs text-gold tabular-nums hover:underline">
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
  { id: "preview", header: "", cell: ({ row: { original: c } }) => (c.status === "PUBLISHED" && c.edition.status === "PUBLISHED" ? view(`/awards/${c.edition.slug}/${c.slug}`, c.nameEn) : null) },
];
export function CategoriesTable({ rows, sort }: { rows: CategoryRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Categories" rows={rows} columns={categoryCols} sortable={{ name: "name" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkCategories(i) }} empty="No genre categories match." />;
}

/* Honorees */
export type HonoreeRow = {
  id: string; slug: string; displayNameEn: string; workTitleEn: string | null; blurbEn: string | null; status: Status; isSample: boolean; updatedAt: Date;
  image: { url: string; alt: string } | null; artist: { nameEn: string; status: Status; portrait: { url: string; alt: string } | null }; category: { nameEn: string; edition: { year: number } };
};
const honoreeCols: ColumnDef<HonoreeRow, unknown>[] = [
  {
    id: "name",
    header: "Honoree",
    cell: ({ row: { original: n } }) => {
      const img = n.image ?? n.artist.portrait;
      return (
        <Link href={`/admin/honorees/${n.id}`} className="flex items-center gap-3 hover:text-gold">
          <MediaThumb media={img ? { ...img, type: "IMAGE" } : null} className="size-10 shrink-0 rounded" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{n.displayNameEn}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {n.category.nameEn} · {n.category.edition.year}
              {n.workTitleEn ? ` · ${n.workTitleEn}` : ""}
            </span>
          </span>
        </Link>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row: { original: n } }) => (
      <span className="flex flex-wrap gap-1">
        <StatusBadge status={n.status} />
        {!n.blurbEn ? <Chip size="sm" variant="muted">No citation</Chip> : null}
        {n.artist.status !== "PUBLISHED" ? <Chip size="sm" variant="muted">Artist is draft</Chip> : null}
        {n.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}
      </span>
    ),
  },
  { id: "preview", header: "", cell: ({ row: { original: n } }) => (n.status === "PUBLISHED" && n.artist.status === "PUBLISHED" ? view(`/honorees/${n.slug}`, n.displayNameEn) : null) },
];
export function HonoreesTable({ rows, sort }: { rows: HonoreeRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Honorees" rows={rows} columns={honoreeCols} sortable={{ name: "name" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkHonorees(i) }} empty="No honorees match." />;
}
