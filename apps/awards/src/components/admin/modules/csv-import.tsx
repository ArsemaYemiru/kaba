"use client";

import { FileUp, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { importHonoreeCsv, previewHonoreeCsv, type CsvPreview } from "@/server/actions/admin/awards";

const TEMPLATE = `category,artist,blurbEn,blurbAm,workTitleEn,workTitleAm,youtubeUrl,status
classical,artist-slug,"Why this artist is recognized",,,,,DRAFT
afrobeat,another-artist-slug,"Why this artist is recognized",,Song Title,,https://www.youtube.com/watch?v=xxxxxxxxxxx,DRAFT
`;

/** Bulk import from CSV with a validation preview before saving (spec §6). */
export function CsvImport({ editions }: { editions: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [pending, start] = useTransition();

  const reset = () => {
    setCsv("");
    setFileName("");
    setPreview(null);
  };
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileUp /> Import CSV
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-line bg-surface sm:max-w-4xl">
          <DialogTitle className="font-display text-lg font-bold">Import honorees from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code className="text-xs">category</code> (genre slug or name in the edition), <code className="text-xs">artist</code> (the artist&apos;s slug), and optionally blurbEn and blurbAm (the citation),
            workTitleEn, workTitleAm, youtubeUrl, status (DRAFT/PUBLISHED). Nothing is saved until every row is valid.{" "}
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="honorees-template.csv" className="font-semibold text-gold hover:underline">
              Download a template
            </a>
          </DialogDescription>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Edition
              <select value={editionId} onChange={(e) => (setEditionId(e.target.value), setPreview(null))} className="h-9 rounded-md border border-line bg-bg px-2 text-sm font-normal">
                {editions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                className="text-sm font-normal file:mr-3 file:rounded-full file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-foreground"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 1_000_000) return toast.error("The file is too large (max 1 MB).");
                  setFileName(f.name);
                  setCsv(await f.text());
                  setPreview(null);
                }}
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={!csv || !editionId || pending}
              onClick={() => start(async () => setPreview(await previewHonoreeCsv(editionId, csv)))}
            >
              {pending && !preview ? <Loader2 className="animate-spin" /> : null} Preview
            </Button>
          </div>
          {preview && !preview.ok ? (
            <p role="alert" className="rounded-md border border-red/50 bg-red/10 px-3 py-2 text-sm">
              {preview.error}
            </p>
          ) : null}
          {preview?.ok ? (
            <>
              <p role="status" className="text-sm">
                <strong>{fileName}</strong>: {preview.valid} valid, <span className={preview.invalid ? "font-semibold text-red" : ""}>{preview.invalid} with errors</span>
                {preview.unknownColumns.length ? <span className="text-muted-foreground"> · ignored columns: {preview.unknownColumns.join(", ")}</span> : null}
              </p>
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[40rem] text-xs">
                  <thead className="border-b border-line text-left text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2">Line</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Artist</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Problems</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.rows.map((r) => (
                      <tr key={r.line} className={cn(r.errors.length && "bg-red/5")}>
                        <td className="px-2 py-1.5 tabular-nums">{r.line}</td>
                        <td className="px-2 py-1.5">{r.categoryName ?? <span className="text-red">{r.values.category || "—"}</span>}</td>
                        <td className="px-2 py-1.5">
                          {r.values.artist}
                          {r.values.workTitleEn ? ` · ${r.values.workTitleEn}` : ""}
                        </td>
                        <td className="px-2 py-1.5">{r.values.status || "DRAFT"}</td>
                        <td className="px-2 py-1.5 text-red">{r.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={!!preview.invalid || !preview.valid || pending}
                  onClick={() =>
                    start(async () => {
                      const r = await importHonoreeCsv(editionId, csv);
                      if (r.ok) {
                        toast.success(`Imported ${r.count} honorees`);
                        setOpen(false);
                        reset();
                        router.refresh();
                      } else toast.error(r.error);
                    })
                  }
                >
                  {pending ? <Loader2 className="animate-spin" /> : <Upload />} Import {preview.valid} honorees
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
