/**
 * Ethiopian mobile numbers (spec §4.8). Accepts:
 *   +2519XXXXXXXX, +2517XXXXXXXX (Safaricom), 09XXXXXXXX, 07XXXXXXXX
 * (spaces, dashes and dots are ignored) and returns E.164 (+251…), or null.
 */
export function normalizeEthiopianPhone(input: string): string | null {
  const s = input.trim().replace(/[\s\-.()]/g, "");
  let m = s.match(/^\+251([79]\d{8})$/);
  if (m) return `+251${m[1]}`;
  m = s.match(/^0([79]\d{8})$/);
  if (m) return `+251${m[1]}`;
  return null;
}
