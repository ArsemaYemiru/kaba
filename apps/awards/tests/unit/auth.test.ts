import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { safeNext, SignInSchema } from "@/schemas/auth";
import { ROLES } from "@/lib/auth-permissions";

describe("staff-only accounts (A-77)", () => {
  it("has no MEMBER role", () => {
    expect(Object.keys(ROLES).sort()).toEqual(["EDITOR", "SUPER_ADMIN"]);
  });
  it("sign-in lowercases the email and ignores unknown fields", () => {
    const ok = SignInSchema.parse({ email: " Staff@Example.org ", password: "x", role: "SUPER_ADMIN" });
    expect(ok.email).toBe("staff@example.org");
    expect(ok).not.toHaveProperty("role");
  });
  it("Better Auth turns public sign-up off", () => {
    const src = readFileSync(path.resolve(__dirname, "../../src/lib/auth.ts"), "utf8");
    expect(src).toMatch(/disableSignUp: true,\n\s+revokeSessionsOnPasswordReset/);
    expect(src).not.toMatch(/socialProviders|phoneNumber\(|captcha\(/);
  });
});

describe("safeNext (no open redirects)", () => {
  it.each([
    ["/admin/honorees", "/admin/honorees"],
    ["/awards/2026#classical", "/awards/2026#classical"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\\\evil.example", "/"],
    ["/sign-in", "/"],
    ["/en/two-factor?next=/x", "/"],
    [undefined, "/"],
  ])("%s → %s", (input, expected) => expect(safeNext(input)).toBe(expected));
});

describe("every admin Server Action starts with a staff check (A-47)", () => {
  const dir = path.resolve(__dirname, "../../src/server/actions/admin");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(path.join(dir, file), "utf8");
    const fns = [...src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)];
    it(`${file} exports actions`, () => expect(fns.length).toBeGreaterThan(0));
    for (const [, name, body] of fns) {
      it(`${file} › ${name}`, () => {
        const firstLines = body!.trim().split("\n").slice(0, 3).join("\n");
        expect(firstLines).toMatch(/authorizeStaff\(|authorize\(|const v = await getViewer\(\);[\s\S]*isStaff/);
      });
    }
  }
});
