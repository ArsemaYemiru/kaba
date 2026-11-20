import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * prisma/seed.ts and scripts/verify-remove-sample.ts run under tsx (outside Next), so nothing they
 * import may pull in "server-only" (it throws there). Walks the relative/@ imports.
 */
const root = path.resolve(__dirname, "../..");
function resolve(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(root, "src", spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    try {
      readFileSync(cand);
      return cand;
    } catch {
      /* try next */
    }
  }
  return null;
}
function walk(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry) || entry.includes("/generated/") || entry.endsWith(".json")) return seen;
  seen.add(entry);
  const src = readFileSync(entry, "utf8");
  for (const m of src.matchAll(/^\s*import\s+(?:[^"']*from\s+)?["']([^"']+)["']/gm)) {
    const next = resolve(entry, m[1]!);
    if (next) walk(next, seen);
  }
  return seen;
}

describe("tsx entry points never import server-only", () => {
  for (const entry of ["prisma/seed.ts", "scripts/verify-remove-sample.ts"]) {
    it(entry, () => {
      const offenders = [...walk(path.join(root, entry))].filter((f) => /^\s*import\s+["']server-only["']/m.test(readFileSync(f, "utf8")));
      expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
    });
  }
});
