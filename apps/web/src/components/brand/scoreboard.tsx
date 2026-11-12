import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScoreRound = { name: string; scoreA?: number | null; scoreB?: number | null };

/**
 * Game-show scoreboard (spec §3.4). Renders nothing unless at least one
 * round has a score; winner column highlighted in gold.
 */
export function Scoreboard({
  aName,
  bName,
  rounds,
  winnerSide,
  isTie,
  labels = { title: "Scoreboard", round: "Round", total: "Total", winner: "Winner", tie: "Tie" },
  className,
}: {
  aName: string;
  bName: string;
  rounds: ScoreRound[];
  winnerSide?: "A" | "B" | null;
  isTie?: boolean;
  labels?: { title: string; round: string; total: string; winner: string; tie: string };
  className?: string;
}) {
  const scored = rounds.filter((r) => r.scoreA != null || r.scoreB != null);
  if (scored.length === 0) return null;

  const totalA = scored.reduce((s, r) => s + (r.scoreA ?? 0), 0);
  const totalB = scored.reduce((s, r) => s + (r.scoreB ?? 0), 0);
  const winA = winnerSide === "A";
  const winB = winnerSide === "B";

  const cell = "px-3 py-3 text-right font-display text-lg font-bold tabular-nums sm:px-5";

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="border-b border-line px-4 py-3 text-left font-display text-xs font-bold tracking-[0.3em] text-gold uppercase sm:px-5">
          {labels.title}
        </caption>
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-3 text-left font-semibold sm:px-5">{labels.round}</th>
            <th scope="col" className={cn("px-3 py-3 text-right font-semibold sm:px-5", winA && "text-gold")}>
              <span className="inline-flex items-center gap-1.5">{winA ? <Trophy className="size-3.5" aria-label={labels.winner} /> : null}{aName}</span>
            </th>
            <th scope="col" className={cn("px-3 py-3 text-right font-semibold sm:px-5", winB && "text-gold")}>
              <span className="inline-flex items-center gap-1.5">{winB ? <Trophy className="size-3.5" aria-label={labels.winner} /> : null}{bName}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {scored.map((r, i) => (
            <tr key={`${r.name}-${i}`} className="border-b border-line/70 last:border-b-0">
              <th scope="row" className="px-4 py-3 text-left font-medium text-foreground sm:px-5">{r.name}</th>
              <td className={cn(cell, r.scoreA != null && r.scoreB != null && r.scoreA > r.scoreB && "text-gold")}>{r.scoreA ?? "–"}</td>
              <td className={cn(cell, r.scoreA != null && r.scoreB != null && r.scoreB > r.scoreA && "text-gold")}>{r.scoreB ?? "–"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gold/40 bg-bg/40">
            <th scope="row" className="px-4 py-4 text-left font-display text-xs font-bold tracking-[0.2em] uppercase sm:px-5">
              {labels.total}
              {isTie ? <span className="ml-2 text-muted-foreground normal-case">· {labels.tie}</span> : null}
            </th>
            <td className={cn(cell, "text-2xl", winA ? "text-gold" : "text-foreground")}>{totalA}</td>
            <td className={cn(cell, "text-2xl", winB ? "text-gold" : "text-foreground")}>{totalB}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
