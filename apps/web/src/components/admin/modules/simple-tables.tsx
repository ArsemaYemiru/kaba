"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { bulkAlbums } from "@/server/actions/albums";
import { bulkNews } from "@/server/actions/news";
import { bulkVideos } from "@/server/actions/videos";
import { DataTable, STANDARD_BULK } from "../data-table";
import { MediaThumb } from "../media-thumb";
import { StatusBadge } from "../status-badge";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type Thumb = { url: string; alt: string } | null;
const date = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
const view = (href: string, label: string) => (
  <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-gold hover:underline" aria-label={`Preview ${label}`}>
    View <ExternalLink className="size-3" />
  </a>
);

/* Videos */
export type VideoRow = { id: string; slug: string; titleEn: string; type: string; source: "NONE" | "YOUTUBE" | "UPLOAD"; featured: boolean; status: Status; publishedAt: Date | null; updatedAt: Date; poster: Thumb; episode: { titleEn: string } | null };
const VTYPE: Record<string, string> = { FULL_EPISODE: "Full episode", HIGHLIGHT: "Highlight", PERFORMANCE: "Performance", BEHIND_THE_SCENES: "Behind the scenes", INTERVIEW: "Interview" };
const videoCols: ColumnDef<VideoRow, unknown>[] = [
  {
    id: "title",
    header: "Video",
    cell: ({ row: { original: v } }) => (
      <Link href={`/admin/videos/${v.id}`} className="flex items-center gap-3 hover:text-gold">
        <MediaThumb media={v.poster ? { ...v.poster, type: "IMAGE" } : null} className="h-9 w-16 shrink-0 rounded" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{v.titleEn}</span>
          {v.episode ? <span className="block truncate text-xs text-muted-foreground">{v.episode.titleEn}</span> : null}
        </span>
      </Link>
    ),
  },
  { id: "type", header: "Type", cell: ({ row }) => <span className="text-xs">{VTYPE[row.original.type]}</span> },
  { id: "source", header: "Source", cell: ({ row: { original: v } }) => (v.source === "NONE" ? <Chip size="sm" variant="muted">Coming soon</Chip> : <Chip size="sm" variant="green">{v.source === "YOUTUBE" ? "YouTube" : "Upload"}</Chip>) },
  { id: "status", header: "Status", cell: ({ row: { original: v } }) => <span className="flex gap-1"><StatusBadge status={v.status} />{v.featured ? <Chip size="sm" variant="gold">Featured</Chip> : null}</span> },
  { id: "published", header: "Published", cell: ({ row }) => <span className="text-xs tabular-nums">{date(row.original.publishedAt)}</span> },
  { id: "preview", header: "", cell: ({ row: { original: v } }) => (v.status === "PUBLISHED" ? view(`/videos?type=${v.type}`, v.titleEn) : null) },
];
export function VideosTable({ rows, sort }: { rows: VideoRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Videos" rows={rows} columns={videoCols} sortable={{ title: "title", published: "published" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkVideos(i) }} empty="No videos match." />;
}

/* Albums */
export type AlbumRow = { id: string; slug: string; titleEn: string; status: Status; isSample: boolean; updatedAt: Date; cover: Thumb; _count: { items: number } };
const albumCols: ColumnDef<AlbumRow, unknown>[] = [
  {
    id: "title",
    header: "Album",
    cell: ({ row: { original: a } }) => (
      <Link href={`/admin/gallery/${a.id}`} className="flex items-center gap-3 hover:text-gold">
        <MediaThumb media={a.cover ? { ...a.cover, type: "IMAGE" } : null} className="size-10 shrink-0 rounded" />
        <span className="font-medium">{a.titleEn}</span>
        {a.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}
      </Link>
    ),
  },
  { id: "count", header: "Photos", cell: ({ row }) => <span className="text-xs tabular-nums">{row.original._count.items}</span> },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "updated", header: "Updated", cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{date(row.original.updatedAt)}</span> },
  { id: "preview", header: "", cell: ({ row: { original: a } }) => (a.status === "PUBLISHED" ? view(`/gallery/${a.slug}`, a.titleEn) : null) },
];
export function AlbumsTable({ rows, sort }: { rows: AlbumRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="Albums" rows={rows} columns={albumCols} sortable={{ title: "title", updated: "updated" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkAlbums(i) }} empty="No albums match." />;
}

/* News */
export type NewsRow = { id: string; slug: string; titleEn: string; status: Status; featured: boolean; isSample: boolean; publishedAt: Date | null; updatedAt: Date; tags: string[]; cover: Thumb; author: { name: string } | null };
const newsCols: ColumnDef<NewsRow, unknown>[] = [
  {
    id: "title",
    header: "Post",
    cell: ({ row: { original: n } }) => (
      <Link href={`/admin/news/${n.id}`} className="flex items-center gap-3 hover:text-gold">
        <MediaThumb media={n.cover ? { ...n.cover, type: "IMAGE" } : null} className="h-9 w-16 shrink-0 rounded" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{n.titleEn}</span>
          <span className="block truncate text-xs text-muted-foreground">{n.author?.name ?? "—"}{n.tags.length ? ` · ${n.tags.join(", ")}` : ""}</span>
        </span>
      </Link>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row: { original: n } }) => (
      <span className="flex gap-1">
        <StatusBadge status={n.status} scheduled={!!n.publishedAt && new Date(n.publishedAt) > new Date()} />
        {n.featured ? <Chip size="sm" variant="gold">Featured</Chip> : null}
        {n.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}
      </span>
    ),
  },
  { id: "published", header: "Publish date", cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.publishedAt ? new Date(row.original.publishedAt).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "short", timeStyle: "short" }) : "—"}</span> },
  { id: "preview", header: "", cell: ({ row: { original: n } }) => (n.status === "PUBLISHED" && n.publishedAt && new Date(n.publishedAt) <= new Date() ? view(`/news/${n.slug}`, n.titleEn) : null) },
];
export function NewsTable({ rows, sort }: { rows: NewsRow[]; sort: { key: string; dir: "asc" | "desc" } }) {
  return <DataTable label="News" rows={rows} columns={newsCols} sortable={{ title: "title", published: "published" }} sort={sort} bulk={{ ops: STANDARD_BULK, run: (i) => bulkNews(i) }} empty="No posts match." />;
}
