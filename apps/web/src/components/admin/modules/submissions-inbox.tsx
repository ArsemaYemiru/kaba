"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/brand/chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { bulkSubmissions, updateSubmission } from "@/server/actions/submissions";
import { DataTable } from "../data-table";
import { StatusBadge } from "../status-badge";

type SubStatus = "NEW" | "REVIEWED" | "SHORTLISTED" | "ARCHIVED";
export type SubmissionRow = {
  id: string;
  type: "CONTESTANT" | "AUDIENCE" | "SPONSOR";
  status: SubStatus;
  name: string;
  email: string | null;
  phone: string | null;
  payload: Record<string, unknown>;
  notes: string | null;
  isSample: boolean;
  createdAt: Date;
};

const LABELS: Record<string, string> = {
  city: "City", category: "Category", socialLinks: "Social links", whyYou: "Why you?", videoLink: "Video link",
  preferredDate: "Preferred date", groupSize: "Group size", company: "Company", message: "Message",
};

function summary(s: SubmissionRow) {
  const p = s.payload;
  if (s.type === "CONTESTANT") return [p.category, p.city].filter(Boolean).join(" · ");
  if (s.type === "AUDIENCE") return `${p.preferredDate ?? "any date"} · group of ${p.groupSize ?? "?"}`;
  return String(p.company ?? "");
}

export function SubmissionsInbox({ rows }: { rows: SubmissionRow[] }) {
  const [open, setOpen] = useState<SubmissionRow | null>(null);
  const columns: ColumnDef<SubmissionRow, unknown>[] = [
    {
      id: "name",
      header: "From",
      cell: ({ row: { original: s } }) => (
        <button type="button" onClick={() => setOpen(s)} className={`text-left hover:text-gold ${s.status === "NEW" ? "font-semibold" : ""}`}>
          {s.name}
          <span className="block text-xs font-normal text-muted-foreground">{summary(s)}</span>
        </button>
      ),
    },
    { id: "contact", header: "Contact", cell: ({ row: { original: s } }) => <span className="text-xs">{[s.phone, s.email].filter(Boolean).join(" · ")}</span> },
    { id: "status", header: "Status", cell: ({ row: { original: s } }) => <span className="flex gap-1"><StatusBadge status={s.status} />{s.isSample ? <Chip size="sm" variant="muted">Sample</Chip> : null}</span> },
    { id: "received", header: "Received", cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{new Date(row.original.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "short", timeStyle: "short" })}</span> },
  ];
  return (
    <>
      <DataTable
        label="Submissions"
        rows={rows}
        columns={columns}
        bulk={{
          ops: [
            { op: "REVIEWED", label: "Mark reviewed" },
            { op: "SHORTLISTED", label: "Shortlist" },
            { op: "ARCHIVED", label: "Archive" },
            { op: "NEW", label: "Mark new" },
            { op: "DELETE", label: "Delete", destructive: true },
          ],
          run: (i) => bulkSubmissions(i),
        }}
        empty="No submissions here yet."
      />
      {open ? <SubmissionDialog key={open.id} s={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function SubmissionDialog({ s, onClose }: { s: SubmissionRow; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<SubStatus>(s.status === "NEW" ? "REVIEWED" : s.status);
  const [notes, setNotes] = useState(s.notes ?? "");
  const [pending, start] = useTransition();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-line bg-surface sm:max-w-xl">
        <DialogTitle className="font-display text-lg font-bold">{s.name}</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {s.type.toLowerCase()} · received {new Date(s.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa" })}
        </DialogDescription>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
          {s.phone ? (<><dt className="text-muted-foreground">Phone</dt><dd><a className="text-gold hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></dd></>) : null}
          {s.email ? (<><dt className="text-muted-foreground">Email</dt><dd><a className="text-gold hover:underline" href={`mailto:${s.email}`}>{s.email}</a></dd></>) : null}
          {Object.entries(s.payload).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{LABELS[k] ?? k}</dt>
              <dd className="break-words whitespace-pre-wrap">
                {Array.isArray(v) ? (v.length ? v.map((x) => <a key={String(x)} href={String(x)} target="_blank" rel="noopener noreferrer" className="block text-gold hover:underline">{String(x)}</a>) : "—") : v === null || v === "" ? "—" : typeof v === "string" && /^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{v}</a> : String(v)}
              </dd>
            </div>
          ))}
        </dl>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as SubStatus)} className="h-9 rounded-md border border-line bg-bg px-2 text-sm">
            <option value="NEW">New</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Internal notes <span className="font-normal text-muted-foreground">(never shown publicly)</span>
          <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-md border border-line bg-bg px-3 py-2 text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await updateSubmission({ id: s.id, status, notes });
                if (r.ok) {
                  toast.success("Saved");
                  router.refresh();
                  onClose();
                } else toast.error(r.error);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null} Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
