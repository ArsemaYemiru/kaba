"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useBallot } from "./ballot-provider";
import dynamic from "next/dynamic";
import { makeParticles, type Particle } from "./particles";

/** Motion (animation library) loads only for the confetti, after a first vote. */
const ConfettiBurst = dynamic(() => import("./confetti"), { ssr: false });

/**
 * The Vote control on a Nominee Card (keyboard-operable, aria-pressed).
 * Picking another nominee in the same category moves the member's vote.
 */
export function VoteButton({ categoryId, nomineeId, name, categoryName, href }: { categoryId: string; nomineeId: string; name: string; categoryName: string; href: string }) {
  const t = useTranslations("nominee");
  const ballot = useBallot();
  const [burst, setBurst] = useState<Particle[] | null>(null);
  if (!ballot) return null;
  const picked = ballot.picks[categoryId] === nomineeId;
  const busy = ballot.pending === nomineeId;
  const hadVote = !!ballot.picks[categoryId];

  return (
    <span className="relative block">
      <button
        type="button"
        aria-pressed={picked}
        aria-label={picked ? `${t("yourVote")}: ${name}` : t("voteFor", { name })}
        disabled={busy || !!ballot.pending}
        onClick={async (e) => {
          if (picked) return;
          const seed = Math.floor(e.timeStamp);
          const result = await ballot.cast(categoryId, nomineeId, { name, categoryName, href });
          if (result?.ok && result.status === "cast" && !hadVote) setBurst(makeParticles(seed));
        }}
        className={cn(
          "flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-[background-color,color,box-shadow] disabled:cursor-wait",
          picked ? "border-2 border-gold bg-gold/10 text-gold" : "bg-gold text-bg hover:bg-gold-light active:scale-[0.98]",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : picked ? <Check className="size-4" aria-hidden="true" /> : null}
        {picked ? t("yourVote") : t("vote")}
      </button>
      {burst ? <ConfettiBurst key={burst[0]?.r} particles={burst} /> : null}
    </span>
  );
}
