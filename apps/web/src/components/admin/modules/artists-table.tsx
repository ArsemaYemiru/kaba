"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { bulkArtists } from "@/server/actions/artists";
import { DataTable, STANDARD_BULK } from "../data-table";
import { MediaThumb } from "../media-thumb";
import { StatusBadge } from "../status-badge";

export type ArtistRow = {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string | null;
  categories: string[];
  isLegend: boolean;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: Date;
  portrait: { url: string; alt: string } | null;
};

const columns: ColumnDef<ArtistRow, unknown>[] = [
  {
    id: "name",
    header: "Artist",
    cell: ({ row: { original: a } }) => (
      <Link href={`/admin/artists/${a.id}`} className="flex items-center gap-3 hover:text-gold">
        <MediaThumb media={a.portrait ? { ...a.portrait, type: "IMAGE" } : null} className="size-9 shrink-0 rounded-full" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{a.nameEn}</span>
          {a.nameAm ? <span lang="am" className="block truncate text-xs text-muted-foreground">{a.nameAm}</span> : null}
        </span>
      </Link>
    ),
  },
  { id: "categories", header: "Categories", cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.categories.map((c) => c.replace("_", "/").toLowerCase()).join(", ")}</span> },
  {
    id: "flags",
    header: "Flags",
    cell: ({ row: { original: a } }) => (
      <span className="flex gap-1">
        {a.isLegend ? <Chip size="sm" variant="legend">Legend</Chip> : null}
        {a.featured ? <Chip size="sm" variant="gold">Featured</Chip> : null}
        {!a.portrait && a.status === "PUBLISHED" ? <Chip size="sm" variant="muted">No photo</Chip> : null}
      </span>
    ),
  },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "updated", header: "Updated", cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{new Date(row.original.updatedAt).toLocaleDateString("en-GB")}</span> },
  {
    id: "preview",
    header: "",
    cell: ({ row: { original: a } }) =>
      a.status === "PUBLISHED" ? (
        <a href={`/artists/${a.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-gold hover:underline" aria-label={`Preview ${a.nameEn}`}>
          View <ExternalLink className="size-3" />
        </a>
      ) : null,
  },
];

export function ArtistsTable({ rows, sort }: { rows: ArtistRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return (
    <DataTable
      label="Artists"
      rows={rows}
      columns={columns}
      sortable={{ name: "name", updated: "updated" }}
      sort={sort}
      bulk={{ ops: STANDARD_BULK, run: (i) => bulkArtists(i) }}
      empty="No artists match."
    />
  );
}
