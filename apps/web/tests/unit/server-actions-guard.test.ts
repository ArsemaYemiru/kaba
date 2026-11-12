import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every exported Server Action is a public HTTP endpoint. This test fails if
 * an action in src/server/actions forgets to authorize first (spec §5:
 * re-check session and role inside every server action).
 */
const DIR = path.resolve(__dirname, "../../src/server/actions");

// Public by design, each with its own guard.
const PUBLIC: Record<string, string> = {
  "join.ts:submitJoin": "public Join form: Zod + honeypot + 5/hour/IP",
  "auth.ts:login": "rate-limited sign-in",
  "auth.ts:changePassword": "requires a session via getSession()",
  "auth.ts:logout": "signs out the current session",
};

function exportedActions(src: string) {
  return [...src.matchAll(/export async function (\w+)\s*\(([\s\S]*?)\{([\s\S]*?)\n\}/g)].map((m) => ({ name: m[1]!, body: m[3]! }));
}

describe("Server Actions authorize first", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    const src = readFileSync(path.join(DIR, file), "utf8");
    if (!src.trimStart().startsWith('"use server"')) continue;
    for (const { name, body } of exportedActions(src)) {
      it(`${file} → ${name}`, () => {
        if (PUBLIC[`${file}:${name}`]) return;
        const firstStatements = body.trim().split("\n").slice(0, 2).join("\n");
        const delegates = /return (bulk\w+|\w+)\(/.test(firstStatements); // e.g. deleteX → bulkX (which authorizes)
        expect(/await authorize\(/.test(firstStatements) || delegates, `${name} must start with \`await authorize(...)\``).toBe(true);
      });
    }
  }

  it("no unguarded helper is exported from a \"use server\" file", () => {
    for (const file of files) {
      const src = readFileSync(path.join(DIR, file), "utf8");
      if (!src.trimStart().startsWith('"use server"')) continue;
      // Only async functions (actions) and types may be exported.
      const bad = [...src.matchAll(/^export (?!async function|type |\{ ?type )(\w+)/gm)].map((m) => m[0]);
      expect(bad, file).toEqual([]);
    }
  });
});
