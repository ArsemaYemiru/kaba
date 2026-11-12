/**
 * Command-palette ranking. Word-prefix matching (not fuzzy), every term must
 * match; matches in the title outrank matches only in keywords, so an artist
 * ranks above the episodes they appear in.
 */
export const normalize = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

function termScore(term: string, text: string): number {
  const words = text.split(/[\s/&:'-]+/);
  if (words.some((w) => w === term)) return 1;
  if (words.some((w) => w.startsWith(term))) return 0.8;
  if (/\p{Script=Ethiopic}/u.test(term) && text.includes(term)) return 0.8;
  return 0;
}

export function scoreItem(search: string, title: string, keywords: string[] = []): number {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const t = normalize(title);
  const k = normalize(keywords.join(" "));
  let total = 0;
  for (const term of terms) {
    const best = Math.max(termScore(term, t), termScore(term, k) * 0.4);
    if (!best) return 0;
    total += best;
  }
  return total / terms.length;
}

/** Items with score > 0, best first (stable for ties). */
export function rank<T extends { title: string; subtitle?: string; keywords: string[] }>(items: T[], search: string): T[] {
  if (!search.trim()) return items;
  return items
    .map((item, i) => ({ item, i, s: scoreItem(search, item.title, [item.subtitle ?? "", ...item.keywords]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
