"use client";

import { Ban, Loader2, RotateCcw, ShieldOff, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { banMember, restoreVotes, unbanMember, voidVotes } from "@/server/actions/admin/results";

type Selector = { editionId: string; userId?: string; ipHash?: string; from?: string; to?: string };

/** A button that asks for a written reason, then runs a moderation action (logged). */
export function ReasonAction({ label, title, description, kind, selector, userId, variant = "outline", size = "sm" }: {
  label: string; title: string; description: string; kind: "void" | "restore" | "ban"; selector?: Selector; userId?: string; variant?: "outline" | "destructive" | "default" | "ghost"; size?: "sm" | "xs";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const Icon = kind === "ban" ? Ban : kind === "void" ? ShieldOff : RotateCcw;
  return (
    <>
      <Button type="button" variant={variant} size={size === "xs" ? "sm" : size} className={size === "xs" ? "h-7 px-2 text-xs" : undefined} onClick={() => setOpen(true)}>
        <Icon /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-line bg-surface sm:max-w-md">
          <DialogTitle className="font-display text-lg font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Reason (required, logged)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="rounded-md border border-line bg-bg p-2 text-sm font-normal" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={kind === "restore" ? "default" : "destructive"}
              disabled={pending || reason.trim().length < 5}
              onClick={() =>
                start(async () => {
                  const r = kind === "ban" ? await banMember({ userId, reason }) : kind === "void" ? await voidVotes({ ...selector, reason }) : await restoreVotes({ ...selector, reason });
                  if (r.ok) {
                    toast.success(r.message ?? "Done");
                    setOpen(false);
                    setReason("");
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : null} {label}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UnbanButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await unbanMember(userId);
          if (r.ok) {
            toast.success(r.message ?? "Unbanned");
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <UserCheck /> Unban
    </Button>
  );
}

/** Void or restore votes in a time range (EAT). */
export function RangeModeration({ editionId }: { editionId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const iso = (v: string) => (v ? new Date(`${v}:00+03:00`).toISOString() : undefined);
  const ready = !!from && !!to && from < to;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold">
        From (EAT)
        <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-2 text-sm font-normal" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        To (EAT)
        <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-2 text-sm font-normal" />
      </label>
      {ready ? (
        <>
          <ReasonAction kind="void" label="Void votes in range" title="Void votes in this time range?" description="Every counting vote last cast in the range stops counting. Members aren't told; you can restore them later." selector={{ editionId, from: iso(from), to: iso(to) }} variant="destructive" />
          <ReasonAction kind="restore" label="Restore range" title="Restore voided votes in this range?" description="Voided votes in the range count again." selector={{ editionId, from: iso(from), to: iso(to) }} />
        </>
      ) : (
        <p className="pb-2 text-xs text-muted-foreground">Pick a start and end to void or restore votes cast in that window.</p>
      )}
    </div>
  );
}
