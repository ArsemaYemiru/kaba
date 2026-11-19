import { z } from "zod";
import { MEMBER_PASSWORD_MIN } from "@/lib/auth-constants";

/** Seeded defaults (spec §9.1): a new password may never be one of these. */
export const SEEDED_DEFAULT_PASSWORDS = ["Feta#Admin2026", "Feta#Editor2026", "Feta#Member2026"];
export const STAFF_PASSWORD_MIN = 12;

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
const password = z.string().min(MEMBER_PASSWORD_MIN, `Use at least ${MEMBER_PASSWORD_MIN} characters.`).max(128, "Use at most 128 characters.");
const code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.");
const checkbox = z.union([z.literal("on"), z.literal("true"), z.null(), z.undefined()]).transform((v) => v === "on" || v === "true");

export const SignUpSchema = z.object({
  displayName: z.string().trim().min(2, "Enter at least 2 characters.").max(60, "Use at most 60 characters."),
  email,
  password,
  consent: checkbox.refine((v) => v, "You need to accept the voting rules and privacy policy."),
  newsOptIn: checkbox,
  next: z.string().optional(),
});

export const SignInSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(200), next: z.string().optional() });
export const VerifySchema = z.object({ code, next: z.string().optional() });
export const ForgotSchema = z.object({ email });
export const ResetSchema = z
  .object({ email, code, password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." })
  .refine((d) => !SEEDED_DEFAULT_PASSWORDS.includes(d.password), { path: ["password"], message: "Choose a different password." });
export const TwoFactorSchema = z.object({
  code: z.string().trim().min(6).max(20),
  method: z.enum(["totp", "backup"]).default("totp"),
  trustDevice: checkbox,
  next: z.string().optional(),
});

export function changePasswordSchema(min: number) {
  return z
    .object({
      currentPassword: z.string().min(1, "Enter your current password.").max(200),
      newPassword: z.string().min(min, `Use at least ${min} characters.`).max(128, "Use at most 128 characters."),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." })
    .refine((d) => d.newPassword !== d.currentPassword, { path: ["newPassword"], message: "Choose a password different from your current one." })
    .refine((d) => !SEEDED_DEFAULT_PASSWORDS.includes(d.newPassword), { path: ["newPassword"], message: "You can't reuse a seeded default password." });
}

export const ProfileSchema = z.object({ displayName: z.string().trim().min(2, "Enter at least 2 characters.").max(60), newsOptIn: checkbox });
export const PhoneSchema = z.object({ phone: z.string().trim().min(9).max(20) });
export const PhoneVerifySchema = z.object({ phone: z.string().trim().min(9).max(20), code });
export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password.").max(200),
  confirm: z.string().refine((v) => v.trim().toUpperCase() === "DELETE", 'Type DELETE to confirm.'),
});

/**
 * Same-site post-auth destination. Only local paths; never protocol-relative,
 * backslashes or the auth pages themselves (no open redirects, no loops).
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string" || next.length > 300) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  const path = next.split(/[?#]/)[0]!.replace(/^\/en(?=\/|$)/, "");
  if (["/sign-in", "/sign-up", "/verify", "/forgot-password", "/reset-password", "/two-factor", "/admin/login"].some((p) => path === p)) return fallback;
  return next;
}

export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}
