"use client";

import { Grid2x2, List, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/brand/chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { deleteMedia, getMediaUsage, updateMedia, type PickerMedia } from "@/server/actions/media";
import type { MediaUsage } from "@/server/admin/media-usage";
import { MediaThumb } from "./media-thumb";
import { Uploader } from "./uploader";

export type LibraryItem = PickerMedia & { usageCount: number };

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function MediaLibrary({ items, maxImageMb, maxVideoMb }: { items: LibraryItem[]; maxImageMb: number; maxVideoMb: number }) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const v = localStorage.getItem("feta-media-view");
      if (v === "list" || v === "grid") {
        const id = window.setTimeout(() => setView(v), 0);
        return () => window.clearTimeout(id);
      }
    } catch {
      /* storage blocked */
    }
  }, []);
  const changeView = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem("feta-media-view", v);
    } catch {
      /* storage blocked */
    }
  };

  const bulkDelete = () =>
    start(async () => {
      let r = await deleteMedia({ ids: selected });
      if (!r.ok && r.status === 409 && r.usages) {
        const lines = Object.entries(r.usages).flatMap(([id, us]) => us.map((u) => `• ${items.find((i) => i.id === id)?.alt || "file"}: ${u.label}`));
        if (!window.confirm(`These files are in use and will be removed from:\n${lines.join("\n")}\n\nDelete anyway?`)) return;
        r = await deleteMedia({ ids: selected, confirmInUse: true });
      } else if (r.ok === false) {
        toast.error(r.error);
        return;
      }
      if (r.ok) {
        toast.success(`Deleted ${r.deleted} file(s)`);
        setSelected([]);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex flex-col gap-4">
      <Uploader maxImageMb={maxImageMb} maxVideoMb={maxVideoMb} onUploaded={() => router.refresh()} />
      <div className="flex flex-wrap items-center gap-2">
        {selected.length ? (
          <>
            <span className="text-xs font-semibold tabular-nums">{selected.length} selected</span>
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => window.confirm(`Delete ${selected.length} file(s)?`) && bulkDelete()}>
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
            </Button>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected([])}>
              Clear
            </button>
          </>
        ) : null}
        <div className="ml-auto flex rounded-md border border-line" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => changeView("grid")} className={cn("flex size-8 items-center justify-center", view === "grid" && "bg-surface-2 text-gold")}>
            <Grid2x2 className="size-4" />
          </button>
          <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => changeView("list")} className={cn("flex size-8 items-center justify-center", view === "list" && "bg-surface-2 text-gold")}>
            <List className="size-4" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface py-12 text-center text-sm text-muted-foreground">No media matches.</p>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => (
            <li key={m.id} className={cn("group relative overflow-hidden rounded-lg border bg-surface", selected.includes(m.id) ? "border-gold" : "border-line")}>
              <input
                type="checkbox"
                aria-label={`Select ${m.alt || "file"}`}
                checked={selected.includes(m.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                className="absolute top-2 left-2 z-10 size-4 accent-[#FFB800]"
              />
              <button type="button" onClick={() => setEditing(m)} className="block w-full text-left">
                <MediaThumb media={m} className="aspect-square w-full" />
                <div className="p-2">
                  <p className={cn("truncate text-xs", !m.alt && m.type === "IMAGE" && "text-red")}>{m.alt || (m.type === "IMAGE" ? "Missing alt text" : "Untitled video")}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {m.usageCount ? `Used in ${m.usageCount}` : "Unused"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Used</th>
                <th className="px-3 py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-surface-2/50">
                  <td className="px-3 py-2">
                    <input type="checkbox" aria-label={`Select ${m.alt || "file"}`} checked={selected.includes(m.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))} className="size-4 accent-[#FFB800]" />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setEditing(m)} className="flex items-center gap-3 text-left hover:text-gold">
                      <MediaThumb media={m} className="size-10 rounded" />
                      <span className={cn("max-w-72 truncate", !m.alt && m.type === "IMAGE" && "text-red")}>{m.alt || "Missing alt text"}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs">{m.mimeType}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">{fmtSize(m.sizeBytes)}</td>
                  <td className="px-3 py-2 text-xs tabular-nums">{m.usageCount}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">{new Date(m.createdAt).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing ? <MediaEditDialog key={editing.id} item={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function MediaEditDialog({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const router = useRouter();
  const [alt, setAlt] = useState(item.alt);
  const [caption, setCaption] = useState(item.caption ?? "");
  const [credit, setCredit] = useState(item.credit ?? "");
  const [tags, setTags] = useState(item.tags.join(", "));
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    void getMediaUsage([item.id]).then((r) => {
      if (!("error" in r)) setUsage((r as Record<string, MediaUsage[]>)[item.id] ?? []);
    });
  }, [item.id]);

  const save = () =>
    start(async () => {
      const r = await updateMedia(item.id, { alt, caption, credit, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
      if (r.ok) {
        toast.success("Saved");
        router.refresh();
        onClose();
      } else {
        setErrors("fieldErrors" in r && r.fieldErrors ? r.fieldErrors : {});
        toast.error(r.error);
      }
    });

  const remove = () =>
    start(async () => {
      const inUse = usage && usage.length > 0;
      const msg = inUse ? `This file is used in:\n${usage!.map((u) => `• ${u.label}`).join("\n")}\n\nDelete it anyway? It will be removed from those places.` : "Delete this file?";
      if (!window.confirm(msg)) return;
      const r = await deleteMedia({ ids: [item.id], confirmInUse: !!inUse });
      if (r.ok) {
        toast.success("Deleted");
        router.refresh();
        onClose();
      } else toast.error(r.error);
    });

  const field = "h-9 w-full rounded-md border border-line bg-bg px-3 text-sm focus-visible:border-gold";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-line bg-surface sm:max-w-2xl">
        <DialogTitle className="font-display text-lg font-bold">Edit media</DialogTitle>
        <DialogDescription className="sr-only">Alt text, caption, credit, tags and usage</DialogDescription>
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <div>
            {item.type === "VIDEO" ? (
              <video src={item.url} controls preload="metadata" className="w-full rounded-md border border-line" />
            ) : (
              <MediaThumb media={{ ...item, url: item.url.replace(/-1600\.webp$/, "-800.webp") }} className="w-full rounded-md border border-line" />
            )}
            <p className="mt-2 text-[0.6875rem] text-muted-foreground">
              {item.mimeType} · {fmtSize(item.sizeBytes)}
              {item.width ? ` · ${item.width}×${item.height}` : ""}
            </p>
            <a href={item.url} target="_blank" rel="noopener" className="text-[0.6875rem] text-gold hover:underline">
              Open original
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              {item.type === "IMAGE" ? "Alt text (required)" : "Title / description"}
              <input value={alt} onChange={(e) => setAlt(e.target.value)} className={field} aria-invalid={!!errors.alt} />
              {errors.alt ? <span className="font-normal text-red">{errors.alt}</span> : null}
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Caption
              <input value={caption} onChange={(e) => setCaption(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Photo credit
              <input value={credit} onChange={(e) => setCredit(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Tags <span className="font-normal text-muted-foreground">(comma-separated)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} />
            </label>
            <div>
              <p className="text-xs font-semibold">Used in</p>
              {usage === null ? (
                <p className="text-xs text-muted-foreground">Checking…</p>
              ) : usage.length ? (
                <ul className="mt-1 flex flex-col gap-1">
                  {usage.map((u, i) => (
                    <li key={i}>
                      <Link href={u.href} className="text-xs text-gold hover:underline">
                        {u.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Not used anywhere.</p>
              )}
              {item.tags.includes("sample") ? <Chip size="sm" variant="muted" className="mt-2">Sample</Chip> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" className="text-red" onClick={remove} disabled={pending}>
            <Trash2 /> Delete
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
