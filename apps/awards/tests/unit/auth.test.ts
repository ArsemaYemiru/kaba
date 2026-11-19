import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { safeNext, SignUpSchema } from "@/schemas/auth";
import { voteEligibility } from "@/server/voting/eligibility";

const user = { emailVerified: true, phoneNumberVerified: false, isActive: true, banned: false };

describe("vote eligibility (spec §5.2)", () => {
  it("requires a signed-in, active, unbanned, verified member", () => {
    expect(voteEligibility({ user: null, requirePhoneVerification: false })).toEqual({ ok: false, reason: "SIGNED_OUT" });
    expect(voteEligibility({ user: { ...user, emailVerified: false }, requirePhoneVerification: false })).toEqual({ ok: false, reason: "UNVERIFIED_EMAIL" });
    expect(voteEligibility({ user: { ...user, isActive: false }, requirePhoneVerification: false })).toEqual({ ok: false, reason: "INACTIVE" });
    expect(voteEligibility({ user: { ...user, banned: true }, requirePhoneVerification: false })).toEqual({ ok: false, reason: "BANNED" });
    expect(voteEligibility({ user, requirePhoneVerification: false })).toEqual({ ok: true });
  });
  it("expired bans no longer block; phone is required only when the setting is on", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(voteEligibility({ user: { ...user, banned: true, banExpires: new Date("2026-12-31T00:00:00Z") }, requirePhoneVerification: false, now })).toEqual({ ok: true });
    expect(voteEligibility({ user, requirePhoneVerification: true })).toEqual({ ok: false, reason: "UNVERIFIED_PHONE" });
    expect(voteEligibility({ user: { ...user, phoneNumberVerified: true }, requirePhoneVerification: true })).toEqual({ ok: true });
  });
});

describe("sign-up schema (spec §5.1)", () => {
  const base = { displayName: "Fan", email: " Fan@Example.org ", password: "0123456789", consent: "on", newsOptIn: null };
  it("requires consent and a 10+ character password; lowercases email", () => {
    expect(SignUpSchema.safeParse({ ...base, consent: null }).success).toBe(false);
    expect(SignUpSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    const ok = SignUpSchema.parse(base);
    expect(ok.email).toBe("fan@example.org");
    expect(ok.newsOptIn).toBe(false);
  });
  it("ignores fields it doesn't know (a posted role never reaches Better Auth)", () => {
    expect(SignUpSchema.parse({ ...base, role: "SUPER_ADMIN" })).not.toHaveProperty("role");
  });
});

describe("safeNext (no open redirects)", () => {
  it.each([
    ["/vote#best-male-artist", "/vote#best-male-artist"],
    ["/account", "/account"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\\\evil.example", "/"],
    ["/sign-in", "/"],
    ["/en/verify?next=/x", "/"],
    [undefined, "/"],
  ])("%s → %s", (input, expected) => expect(safeNext(input)).toBe(expected));
});

describe("Ethiopian phone numbers", () => {
  it("normalizes to E.164", () => {
    expect(normalizeEthiopianPhone("0911 234 567")).toBe("+251911234567");
    expect(normalizeEthiopianPhone("+251 7 1234 5678")).toBe("+251712345678");
    expect(normalizeEthiopianPhone("12345")).toBeNull();
  });
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
