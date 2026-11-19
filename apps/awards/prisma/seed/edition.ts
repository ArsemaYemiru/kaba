import type { NomineeType, VotingType } from "../../src/generated/prisma/enums";
import am from "../../src/messages/am.json";

/**
 * §9.4: sample edition (isSample). Twelve categories to be replaced by the
 * organizers' official list; Amharic names live in messages/am.json for review.
 */
export type SeedCategory = {
  n: number;
  nameEn: string;
  nameAm: string;
  votingType: VotingType;
  nomineeType: NomineeType;
  icon: string;
  publicWeight: number;
  juryWeight: number;
};

const W = { PUBLIC_VOTE: [100, 0], HYBRID: [50, 50], JURY: [0, 100], HONORARY: [0, 100] } as const;
const cat = (n: number, nameEn: string, votingType: VotingType, nomineeType: NomineeType, icon: string): SeedCategory => ({
  n,
  nameEn,
  nameAm: am.sampleCategories[String(n) as keyof typeof am.sampleCategories],
  votingType,
  nomineeType,
  icon,
  publicWeight: W[votingType][0],
  juryWeight: W[votingType][1],
});

export const CATEGORIES: SeedCategory[] = [
  cat(1, "Best Male Artist", "PUBLIC_VOTE", "PERSON", "mic-vocal"),
  cat(2, "Best Female Artist", "PUBLIC_VOTE", "PERSON", "mic-vocal"),
  cat(3, "Song of the Year", "PUBLIC_VOTE", "SONG", "disc-3"),
  cat(4, "Album of the Year", "HYBRID", "ALBUM", "album"),
  cat(5, "Music Video of the Year", "PUBLIC_VOTE", "MUSIC_VIDEO", "clapperboard"),
  cat(6, "Best New Artist", "PUBLIC_VOTE", "PERSON", "star"),
  cat(7, "Best Actor", "HYBRID", "PERSON", "film"),
  cat(8, "Best Actress", "HYBRID", "PERSON", "film"),
  cat(9, "Film of the Year", "JURY", "FILM", "clapperboard"),
  cat(10, "Comedian of the Year", "PUBLIC_VOTE", "PERSON", "laugh"),
  cat(11, "Content Creator of the Year", "PUBLIC_VOTE", "CREATOR", "smartphone"),
  cat(12, "Lifetime Achievement", "HONORARY", "PERSON", "crown"),
];

export const LETTERS = ["A", "B", "C", "D", "E"] as const;

export type SeedNominee = { displayNameEn: string; workTitleEn: string | null; slug: string; juryScore: number | null; sortOrder: number };

/** Pattern names only ("Sample Nominee 1A", "Sample Song 3A" by "Sample Artist 3A", …). */
export function nomineesFor(c: SeedCategory): SeedNominee[] {
  if (c.votingType === "HONORARY") return [{ displayNameEn: "Sample Honoree", workTitleEn: null, slug: "sample-honoree", juryScore: null, sortOrder: 0 }];
  const work: Partial<Record<NomineeType, [string, string]>> = {
    SONG: ["Sample Song", "Sample Artist"],
    ALBUM: ["Sample Album", "Sample Artist"],
    MUSIC_VIDEO: ["Sample Video", "Sample Artist"],
    FILM: ["Sample Film", "Sample Studio"],
  };
  const juried = c.votingType === "HYBRID" || c.votingType === "JURY";
  return LETTERS.map((L, i) => {
    const code = `${c.n}${L}`;
    const w = work[c.nomineeType];
    const displayNameEn = w ? `${w[1]} ${code}` : `Sample Nominee ${code}`;
    const workTitleEn = w ? `${w[0]} ${code}` : null;
    const slug = (workTitleEn ?? displayNameEn).toLowerCase().replace(/\s+/g, "-");
    // Deterministic jury scores (hybrid and jury categories only).
    const juryScore = juried ? 60 + ((c.n * 17 + i * 23) % 36) : null;
    return { displayNameEn, workTitleEn, slug, juryScore, sortOrder: i };
  });
}

/** Public-vote categories accept votes (PUBLIC_VOTE + HYBRID, spec §5.2). */
export const VOTABLE = CATEGORIES.filter((c) => c.votingType === "PUBLIC_VOTE" || c.votingType === "HYBRID");
