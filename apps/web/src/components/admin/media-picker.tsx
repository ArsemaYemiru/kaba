"use client";

import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listMediaForPicker, updateMedia, type PickerMedia } from "@/server/actions/media";
import { MediaThumb } from "./media-thumb";
import { Uploader } from "./uploader";

/**
 * Pick from the Media Library or upload inline (spec §5). Images without alt
 * text can't be picked until it's added (alt is required for images).
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  type,
  multiple,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: "IMAGE" | "VIDEO";
  multiple?: boolean;
  onPick: (items: PickerMedia[]) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: PickerMedia[]; total: number; pageSize: number } | null>(null);
  const [picked, setPicked] = useState<PickerMedia[]>([]);
  const [loading, start] = useTransition();

  const load = useCallback(
    (query: string, p: number) =>
      start(async () => {
        const r = await listMediaForPicker({ type, q: query || undefined, page: p });
        if ("error" in r) toast.error("Couldn't load media.");
        else setData(r);
      }),
    [type],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      setPicked([]);
      load("", 1);
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, load]);

  const toggle = (m: PickerMedia) => {
    if (!multiple) {
      onPick([m]);
      onOpenChange(false);
      return;
    }
    setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-[min(56rem,calc(100vw-2rem))] flex-col gap-4 border-line bg-surface sm:max-w-[min(56rem,calc(100vw-2rem))]">
        <div>
          <DialogTitle className="font-display text-lg font-bold">{type === "IMAGE" ? "Choose image" : "Choose video"}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Pick from the Media Library or upload new files.</DialogDescription>
        </div>
        <Uploader
          compact
          accept={type === "IMAGE" ? "image" : "video"}
          onUploaded={(m) => {
            setData((d) => (d ? { ...d, items: [m, ...d.items], total: d.total + 1 } : d));
          }}
        />
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={q}
            placeholder="Search alt text, caption, credit…"
            aria-label="Search media"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setPage(1);
                load(q, 1);
              }
            }}
            className="h-9 flex-1 rounded-md border border-line bg-bg px-3 text-sm focus-visible:border-gold"
          />
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" /> : null}
        </div>
        <ul className="grid min-h-40 flex-1 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {data?.items.map((m) => (
            <li key={m.id}>
              <PickerTile media={m} selected={picked.some((p) => p.id === m.id)} onSelect={() => toggle(m)} onAltSaved={(alt) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === m.id ? { ...x, alt } : x)) } : d))} />
            </li>
          ))}
          {data && !data.items.length ? <li className="col-span-full py-10 text-center text-sm text-muted-foreground">No media yet. Upload above.</li> : null}
        </ul>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); load(q, page - 1); }}>
              Previous
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => { setPage(page + 1); load(q, page + 1); }}>
              Next
            </Button>
            {multiple ? (
              <Button type="button" size="sm" disabled={!picked.length} onClick={() => { onPick(picked); onOpenChange(false); }}>
                Add {picked.length || ""} selected
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PickerTile({ media, selected, onSelect, onAltSaved }: { media: PickerMedia; selected: boolean; onSelect: () => void; onAltSaved: (alt: string) => void }) {
  const needsAlt = media.type === "IMAGE" && !media.alt.trim();
  const [alt, setAlt] = useState("");
  const [saving, start] = useTransition();
  if (needsAlt) {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-gold/50 p-1">
        <MediaThumb media={media} className="aspect-square w-full rounded" />
        <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Add alt text to use" aria-label="Alt text" className="h-7 rounded border border-line bg-bg px-1.5 text-[0.6875rem]" />
        <Button
          type="button"
          size="sm"
          className="h-7 text-[0.6875rem]"
          disabled={!alt.trim() || saving}
          onClick={() =>
            start(async () => {
              const r = await updateMedia(media.id, { alt: alt.trim(), caption: media.caption, credit: media.credit, tags: media.tags });
              if (r.ok) onAltSaved(alt.trim());
              else toast.error(r.error);
            })
          }
        >
          Save alt
        </Button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={media.alt}
      className={cn("group relative block w-full overflow-hidden rounded-md border-2", selected ? "border-gold" : "border-transparent hover:border-line")}
    >
      <MediaThumb media={media} className="aspect-square w-full" />
      <span className="sr-only">{media.alt}</span>
      {selected ? (
        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-gold text-bg">
          <Check className="size-3.5" />
        </span>
      ) : null}
    </button>
  );
}
