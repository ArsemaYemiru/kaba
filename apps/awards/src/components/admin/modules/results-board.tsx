"use client";

import { Download, Loader2, Lock, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/brand/chip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { changePhase } from "@/server/actions/admin/awards";
import { lockEditionResults, overrideWinner, setJuryScore } from "@/server/actions/admin/results";

type NomineeRow = { id: string; displayNameEn: string; workTitleEn: string | null; status: string; juryScore: number | null; isWinner: boolean };
type Live = { totalVotes: number; winnerId: string | null; nominees: { id: string; votes: number; publicShare: number; juryScore: number | null; finalScore: number }[] } | null;
export type BoardCategory = {
  id: string;
  nameEn: string;
  status: string;
  votingType: "PUBLIC_VOTE" | "JURY" | "HYBRID" | "HONORARY";
  publicWeight: number;
  juryWeight: number;
  nominees: NomineeRow[];
  live: Live;
  locked: { winnerId: string | null; totalVotes: number; nominees: { id: string; votes: number; publicShare: number; finalScore: number }[] } | null;
  override: { nomineeId: string; reason: string; createdAt: Date; by: { name: string } | null } | null;
};
type Board = {
  edition: { id: string; year: number; nameEn: string; phase: string; showPublicPercentages: boolean };
  snapshot: { lockedAt: Date; sha256: string; publishedAt: Date | null; lockedBy: string | null } | null;
  categories: BoardCategory[];
};

const VTYPE = { PUBLIC_VOTE: "Public vote", HYBRID: "Public + Jury", JURY: "Jury", HONORARY: "Honorary" } as const;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const name = (n: NomineeRow) => n.workTitleEn ?? n.displayNameEn;

/** Results (spec §6): live tallies (staff only), jury scores, lock, override, publish, CSV. */
export function ResultsBoard({ board, isSuperAdmin }: { board: Board; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { edition, snapshot } = board;
  const locked = !!snapshot;
  const published = edition.phase === "WINNERS_ANNOUNCED";
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        router.refresh();
      } else toast.error(r.error ?? "Something went wrong.");
    });

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Results status" className="flex flex-col gap-4 rounded-lg border border-gold/40 bg-surface p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm">
          {locked ? (
            <p className="flex flex-wrap items-center gap-2">
              <Lock className="size-4 text-gold" aria-hidden="true" />
              <span>
                Locked {new Date(snapshot.lockedAt).toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium", timeStyle: "short" })} EAT
                {snapshot.lockedBy ? ` by ${snapshot.lockedBy}` : ""}
              </span>
              <code className="rounded bg-bg px-1.5 py-0.5 text-xs" title={snapshot.sha256}>
                SHA-256 {snapshot.sha256.slice(0, 16)}…
              </code>
              {snapshot.publishedAt ? <Chip size="sm" variant="foil">Published</Chip> : null}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {edition.phase === "VOTING_CLOSED" ? "Voting is closed. Review the tallies and jury scores, then lock the results." : edition.phase === "VOTING_OPEN" ? "Voting is open: tallies are live and change as members vote." : "Not locked."}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Vote counts are visible to staff only and never published before winners are announced{edition.showPublicPercentages ? " (percentages will show on the winners page)" : ""}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/admin/results/${edition.id}`}>
              <Download /> CSV
            </a>
          </Button>
          {isSuperAdmin && edition.phase === "VOTING_CLOSED" && !locked ? <LockButton pending={pending} onConfirm={() => run(() => lockEditionResults(edition.id))} /> : null}
          {isSuperAdmin && edition.phase === "VOTING_CLOSED" && locked ? (
            <Button size="sm" disabled={pending} onClick={() => run(async () => ({ ...(await changePhase({ editionId: edition.id, to: "WINNERS_ANNOUNCED" })), message: "Winners published." }))}>
              {pending ? <Loader2 className="animate-spin" /> : <Trophy />} Publish winners
            </Button>
          ) : null}
        </div>
      </section>

      {board.categories.map((c) => (
        <CategoryResults key={c.id} c={c} locked={locked} published={published} isSuperAdmin={isSuperAdmin} canOverride={isSuperAdmin && locked && edition.phase === "VOTING_CLOSED"} run={run} pending={pending} />
      ))}
    </div>
  );
}

function LockButton({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Lock /> Lock results
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-line bg-surface sm:max-w-md">
          <DialogTitle className="font-display text-lg font-bold">Lock the results?</DialogTitle>
          <DialogDescription>
            This stores a permanent snapshot of every category&apos;s tallies, jury scores and computed winners, with a SHA-256 hash, your name and the time. Locked results never change; jury scores freeze.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              Lock results
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryResults({ c, locked, published, isSuperAdmin, canOverride, run, pending }: { c: BoardCategory; locked: boolean; published: boolean; isSuperAdmin: boolean; canOverride: boolean; run: (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => void; pending: boolean }) {
  const data = c.locked ?? c.live;
  const byId = new Map((data?.nominees ?? []).map((n) => [n.id, n]));
  const rows = [...c.nominees].sort((a, b) => (byId.get(b.id)?.finalScore ?? 0) - (byId.get(a.id)?.finalScore ?? 0));
  const computed = data?.winnerId ?? null;
  const winner = c.override?.nomineeId ?? computed;
  const jury = c.votingType === "JURY" || c.votingType === "HYBRID";
  const juryEditable = isSuperAdmin && jury && !locked && !published;
  const [overriding, setOverriding] = useState(false);
  const [choice, setChoice] = useState(winner ?? "");
  const [reason, setReason] = useState("");
  return (
    <section aria-labelledby={`r-${c.id}`} className="rounded-lg border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id={`r-${c.id}`} className="font-display text-sm font-bold">
          {c.nameEn}
          {c.status !== "PUBLISHED" ? <span className="ml-2 text-xs font-normal text-muted-foreground">({c.status.toLowerCase()})</span> : null}
        </h2>
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Chip size="sm">{VTYPE[c.votingType]}</Chip>
          {c.votingType === "HYBRID" ? `${c.publicWeight}% public · ${c.juryWeight}% jury` : null}
          {c.votingType === "PUBLIC_VOTE" || c.votingType === "HYBRID" ? <span className="tabular-nums">{data?.totalVotes ?? 0} valid votes</span> : null}
          {locked ? <Chip size="sm" variant="muted">{c.locked ? "Locked" : "Not in snapshot"}</Chip> : <Chip size="sm" variant="red">Live</Chip>}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Nominee</th>
              {c.votingType !== "JURY" && c.votingType !== "HONORARY" ? (
                <>
                  <th className="px-4 py-2 text-right font-medium">Votes</th>
                  <th className="px-4 py-2 text-right font-medium">Share</th>
                </>
              ) : null}
              {jury ? <th className="px-4 py-2 text-right font-medium">Jury (0–100)</th> : null}
              {c.votingType !== "HONORARY" ? <th className="px-4 py-2 text-right font-medium">Score</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((n, i) => {
              const r = byId.get(n.id);
              const isWinner = winner === n.id;
              return (
                <tr key={n.id} className={cn(isWinner && "bg-gold/10")}>
                  <td className="px-4 py-2 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-2">
                      {isWinner ? <Trophy className="size-4 text-gold" aria-label="Winner" /> : null}
                      <span className={cn(isWinner && "font-semibold")}>{name(n)}</span>
                      {n.status !== "PUBLISHED" ? <span className="text-xs text-muted-foreground">({n.status.toLowerCase()})</span> : null}
                      {c.override?.nomineeId === n.id ? <Chip size="sm" variant="gold">Override</Chip> : null}
                    </span>
                  </td>
                  {c.votingType !== "JURY" && c.votingType !== "HONORARY" ? (
                    <>
                      <td className="px-4 py-2 text-right tabular-nums">{r?.votes ?? 0}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{pct(r?.publicShare ?? 0)}</td>
                    </>
                  ) : null}
                  {jury ? (
                    <td className="px-4 py-2 text-right">
                      {juryEditable ? <JuryInput nomineeId={n.id} value={n.juryScore} run={run} label={name(n)} /> : <span className="tabular-nums">{n.juryScore ?? "—"}</span>}
                    </td>
                  ) : null}
                  {c.votingType !== "HONORARY" ? <td className="px-4 py-2 text-right font-semibold tabular-nums">{(r?.finalScore ?? 0).toFixed(2)}</td> : null}
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No nominees.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {c.override ? (
        <p className="border-t border-line px-4 py-2 text-xs">
          <strong>Override</strong> by {c.override.by?.name ?? "staff"}: “{c.override.reason}”
        </p>
      ) : null}
      {canOverride && rows.length ? (
        <div className="border-t border-line px-4 py-3">
          {overriding ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Winner
                <select value={choice} onChange={(e) => setChoice(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-2 text-sm font-normal">
                  {rows.map((n) => (
                    <option key={n.id} value={n.id}>
                      {name(n)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
                Reason (required, logged)
                <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-2 text-sm font-normal" />
              </label>
              <Button size="sm" disabled={pending || reason.trim().length < 10 || !choice} onClick={() => run(() => overrideWinner({ categoryId: c.id, nomineeId: choice, reason }))}>
                Save override
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOverriding(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setOverriding(true)}>
              Override winner…
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function JuryInput({ nomineeId, value, run, label }: { nomineeId: string; value: number | null; run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void; label: string }) {
  const [v, setV] = useState(value === null ? "" : String(value));
  const save = () => {
    const next = v.trim() === "" ? null : Number(v);
    if (next === value) return;
    run(() => setJuryScore(nomineeId, next));
  };
  return (
    <input
      inputMode="numeric"
      aria-label={`Jury score for ${label}`}
      value={v}
      onChange={(e) => setV(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className="h-8 w-16 rounded border border-line bg-bg px-2 text-right tabular-nums"
    />
  );
}
