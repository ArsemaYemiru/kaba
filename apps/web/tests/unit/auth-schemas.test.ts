import { describe, expect, it } from "vitest";
import { ChangePasswordSchema, safeNext } from "@/schemas/auth";

describe("safeNext (open-redirect guard)", () => {
  it.each([
    ["/admin/artists", "/admin/artists"],
    ["/admin", "/admin"],
    [undefined, "/admin"],
    ["https://evil.example", "/admin"],
    ["//evil.example", "/admin"],
    ["/admin\\@evil", "/admin"],
    ["/news", "/admin"],
    ["/admin/login?next=x", "/admin"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});

describe("ChangePasswordSchema", () => {
  const ok = { currentPassword: "Current-Pass-1", newPassword: "A-new-long-pass-1", confirmPassword: "A-new-long-pass-1" };
  it("accepts a good password", () => expect(ChangePasswordSchema.safeParse(ok).success).toBe(true));
  it("rejects short, mismatched, unchanged and seeded-default passwords", () => {
    expect(ChangePasswordSchema.safeParse({ ...ok, newPassword: "short", confirmPassword: "short" }).success).toBe(false);
    expect(ChangePasswordSchema.safeParse({ ...ok, confirmPassword: "different-pass-1" }).success).toBe(false);
    expect(ChangePasswordSchema.safeParse({ ...ok, newPassword: ok.currentPassword, confirmPassword: ok.currentPassword }).success).toBe(false);
    expect(ChangePasswordSchema.safeParse({ ...ok, newPassword: "Feta#Admin2026", confirmPassword: "Feta#Admin2026" }).success).toBe(false);
  });
});
