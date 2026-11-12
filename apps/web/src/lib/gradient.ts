/**
 * Deterministic branded gradients for people without a photo.
 * The same name always produces the same gradient (spec §3.4).
 */

/** FNV-1a 32-bit hash: small, fast and stable across runtimes. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Dark, on-brand stops. Light text sits on top, so every pair stays dark enough for AA.
const PALETTES: ReadonlyArray<readonly [string, string, string]> = [
  ["#3a1d06", "#7a4a00", "#ffb800"], // gold stage
  ["#2a070c", "#6b1220", "#ff3b4e"], // red heat
  ["#04200f", "#0e5a2f", "#1faa59"], // green tibeb
  ["#1a1030", "#3b1e5c", "#ffb800"], // violet night, gold flare
  ["#081a2a", "#123c5c", "#ff3b4e"], // blue studio, red flare
  ["#2a1406", "#5c2a0c", "#1faa59"], // ember, green flare
];

export type BrandGradient = {
  from: string;
  to: string;
  accent: string;
  angle: number;
  css: string;
};

export function gradientFor(seed: string): BrandGradient {
  const h = hashString(seed.trim().toLowerCase());
  const [from, to, accent] = PALETTES[h % PALETTES.length]!;
  const angle = 110 + ((h >>> 8) % 120);
  const css = `radial-gradient(120% 90% at ${20 + ((h >>> 4) % 60)}% 0%, ${accent}33, transparent 60%), linear-gradient(${angle}deg, ${from}, ${to})`;
  return { from, to, accent, angle, css };
}

/** "Lij Michael" → "LM"; "Teddy Afro" → "TA"; "ጂጂ" → "ጂ"; "Root" → "RO". */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const chars = Array.from(words[0]!);
    // Ethiopic syllables are whole characters; one is enough.
    if (/\p{Script=Ethiopic}/u.test(chars[0] ?? "")) return chars[0]!;
    return chars.slice(0, 2).join("").toUpperCase();
  }
  return (Array.from(words[0]!)[0]! + Array.from(words[words.length - 1]!)[0]!).toUpperCase();
}
