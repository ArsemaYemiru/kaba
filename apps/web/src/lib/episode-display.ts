import type { VsContestant } from "@/components/brand/vs-card";
import type { EpisodeCardData } from "@/server/queries/episodes";

type Participant = EpisodeCardData["participants"][number];

export function participantName(p: Participant): string {
  return p.artist?.nameEn ?? p.guestName ?? "";
}

/** Artist link only when the profile is published (spec §4.2). */
export function participantHref(p: Participant): string | null {
  return p.artist && p.artist.status === "PUBLISHED" ? `/artists/${p.artist.slug}` : null;
}

export function sides(ep: Pick<EpisodeCardData, "participants">) {
  const a = ep.participants.filter((p) => p.side === "A");
  const b = ep.participants.filter((p) => p.side === "B");
  return { a, b };
}

function toContestant(list: Participant[]): VsContestant {
  const name = list.map(participantName).filter(Boolean).join(" & ") || "TBA";
  const withPhoto = list.find((p) => p.artist?.portrait && p.artist.status === "PUBLISHED");
  const photo = withPhoto?.artist?.portrait;
  return { name, imageUrl: photo?.url ?? null, imageAlt: photo?.alt ?? name, blurDataUrl: photo?.blurDataUrl ?? null };
}

export function vsContestants(ep: Pick<EpisodeCardData, "participants">) {
  const { a, b } = sides(ep);
  return { a: toContestant(a), b: toContestant(b) };
}
