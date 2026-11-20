import am from "../../src/messages/am.json";

/**
 * §9.4: sample edition (isSample), recognition model (A-76). Six genre
 * categories to be replaced by the organizers' official list; Amharic names
 * live in messages/am.json for review. Honorees are fictional sample artists
 * ("Sample Artist 1A"), never real people, so nothing is claimed about anyone.
 */
export type SeedGenre = { n: number; nameEn: string; nameAm: string; icon: string; honorees: number };

const genre = (n: number, nameEn: string, icon: string, honorees: number): SeedGenre => ({
  n,
  nameEn,
  nameAm: am.sampleCategories[String(n) as keyof typeof am.sampleCategories],
  icon,
  honorees,
});

export const GENRES: SeedGenre[] = [
  genre(1, "Classical", "music", 4),
  genre(2, "Ethio-jazz", "disc-3", 4),
  genre(3, "Tizita", "mic-vocal", 4),
  genre(4, "Bati", "mic-vocal", 3),
  genre(5, "Afrobeat", "album", 4),
  genre(6, "Traditional", "crown", 3),
];

export const LETTERS = ["A", "B", "C", "D"] as const;

export type SeedHonoree = { artistName: string; artistSlug: string; slug: string; workTitleEn: string | null; sortOrder: number };

/** Pattern names only ("Sample Artist 1A", "Sample Song 1A"). */
export function honoreesFor(g: SeedGenre): SeedHonoree[] {
  return LETTERS.slice(0, g.honorees).map((L, i) => {
    const code = `${g.n}${L}`;
    const artistSlug = `sample-artist-${code.toLowerCase()}`;
    return { artistName: `Sample Artist ${code}`, artistSlug, slug: `${artistSlug}-sample`, workTitleEn: i % 2 === 0 ? `Sample Song ${code}` : null, sortOrder: i };
  });
}

export const SAMPLE_CITATION = "Sample citation for demonstration. Fictional and removable with “Remove sample data”.";
