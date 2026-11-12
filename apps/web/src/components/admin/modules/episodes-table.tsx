"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { bulkEpisodes } from "@/server/actions/episodes";
import { DataTable, STANDARD_BULK } from "../data-table";
import { StatusBadge } from "../status-badge";

export type EpisodeRow = {
  id: string;
  slug: string;
  titleEn: string;
  type: string;
  season: number | null;
  episodeNumber: number | null;
  airDate: Date | null;
  videoSource: "NONE" | "YOUTUBE" | "UPLOAD";
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: Date;
};

const TYPE: Record<string, string> = { GAME_SHOW: "Game show", HOLIDAY_SPECIAL: "Holiday special", PERFORMANCE: "Performance", BEHIND_THE_SCENES: "Behind the scenes" };

const columns: ColumnDef<EpisodeRow, unknown>[] = [
  {
    id: "title",
    header: "Episode",
    cell: ({ row: { original: e } }) => (
      <Link href={`/admin/episodes/${e.id}`} className="font-medium hover:text-gold">
        {e.titleEn}
      </Link>
    ),
  },
  { id: "type", header: "Type", cell: ({ row }) => <span className="text-xs">{TYPE[row.original.type]}</span> },
  {
    id: "number",
    header: "S / Ep",
    cell: ({ row: { original: e } }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {e.season ? `S${e.season}` : "—"}
        {e.episodeNumber ? ` · E${e.episodeNumber}` : ""}
      </span>
    ),
  },
  { id: "airDate", header: "Air date", cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.airDate ? new Date(row.original.airDate).toISOString().slice(0, 10) : "—"}</span> },
  {
    id: "video",
    header: "Video",
    cell: ({ row: { original: e } }) => (e.videoSource === "NONE" ? <Chip size="sm" variant="muted">Coming soon</Chip> : <Chip size="sm" variant="green">{e.videoSource === "YOUTUBE" ? "YouTube" : "Upload"}</Chip>),
  },
  { id: "status", header: "Status", cell: ({ row: { original: e } }) => <span className="flex gap-1"><StatusBadge status={e.status} />{e.featured ? <Chip size="sm" variant="gold">Featured</Chip> : null}</span> },
  { id: "updated", header: "Updated", cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{new Date(row.original.updatedAt).toLocaleDateString("en-GB")}</span> },
  {
    id: "preview",
    header: "",
    cell: ({ row: { original: e } }) =>
      e.status === "PUBLISHED" ? (
        <a href={`/episodes/${e.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-gold hover:underline" aria-label={`Preview ${e.titleEn}`}>
          View <ExternalLink className="size-3" />
        </a>
      ) : null,
  },
];

export function EpisodesTable({ rows, sort }: { rows: EpisodeRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Episodes" rows={rows} columns={columns} sortable={{ title: "title", airDate: "airDate", updated: "updated" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkEpisodes(i) }} empty="No episodes match." />;
}
