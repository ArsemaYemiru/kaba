"use client";

import { FlaskConical } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const PHASES = ["DRAFT", "NOMINEES_ANNOUNCED", "VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"] as const;

/** Dev-only floating panel (rendered only when dev tools are enabled, A-38). English only by design. */
export function DevPhaseSwitcher({ current }: { current?: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const go = (phase: string) =>
    start(async () => {
      setError(null);
      const res = await fetch("/api/dev/phase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase }) });
      if (!res.ok) return setError(`Failed (${res.status})`);
      window.location.reload();
    });

  return (
    <div className="fixed bottom-4 left-4 z-[100] text-xs" data-dev-tools>
      {open ? (
        <div role="dialog" aria-label="Dev phase switcher" className="w-60 rounded-lg border border-gold/50 bg-surface p-3 shadow-2xl">
          <p className="mb-2 font-display font-bold tracking-widest text-gold uppercase">Sample edition phase</p>
          <ul className="grid gap-1">
            {PHASES.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => go(p)}
                  aria-pressed={current === p}
                  className={cn("w-full rounded-md px-2 py-1.5 text-left font-semibold hover:bg-surface-2 disabled:opacity-50", current === p && "bg-gold/15 text-gold")}
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
          {error ? <p className="mt-2 text-red">{error}</p> : null}
          <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-md border border-line py-1.5 text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-surface px-3 py-2 font-semibold text-gold shadow-xl">
          <FlaskConical className="size-4" aria-hidden="true" /> Dev: {current ?? "no edition"}
        </button>
      )}
    </div>
  );
}
