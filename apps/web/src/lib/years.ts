/**
 * Artist date display rules (spec §4.3):
 * - birth + death → "1940–2009"
 * - birth only    → "b. 1943"   (never "1943–present")
 * - neither       → null
 */
export function formatLifespan(birthYear?: number | null, deathYear?: number | null): string | null {
  if (birthYear && deathYear) return `${birthYear}–${deathYear}`;
  if (birthYear) return `b. ${birthYear}`;
  if (deathYear) return `d. ${deathYear}`;
  return null;
}

/**
 * Years-active free text. A bare start year like "2012" becomes
 * "Active since 2012"; ranges and other text pass through unchanged.
 */
export function formatYearsActive(yearsActive?: string | null): string | null {
  const value = yearsActive?.trim();
  if (!value) return null;
  const startOnly = value.match(/^(\d{4})\s*[–-]?\s*(present)?$/i);
  if (startOnly) return `Active since ${startOnly[1]}`;
  return value;
}
