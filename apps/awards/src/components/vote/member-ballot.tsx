import { turnstileSiteKey } from "@/lib/turnstile";
import { ballotViewer } from "@/server/queries/member";
import { BallotProvider } from "./ballot-provider";

/** Wraps a page section with the member's live ballot when they can vote right now. Per request, never cached. */
export async function MemberBallot({ editionId, year, open, children }: { editionId: string; year: number; open: boolean; children: React.ReactNode }) {
  if (!open) return children;
  const v = await ballotViewer(editionId);
  if (!v.eligible) return children;
  const picks = Object.fromEntries([...v.picks.values()].map((p) => [p.categoryId, p.nomineeId]));
  return (
    <BallotProvider initialPicks={picks} siteKey={turnstileSiteKey()} siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"} year={year}>
      {children}
    </BallotProvider>
  );
}
