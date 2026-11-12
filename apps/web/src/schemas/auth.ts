import { z } from "zod";

export const PASSWORD_MIN = 12;

/** Seeded defaults (spec §8.1): a new password may never be one of these. */
export const SEEDED_DEFAULT_PASSWORDS = ["Feta#Admin2026", "Feta#Editor2026"];

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(128, "Use at most 128 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ["newPassword"], message: "Choose a password different from your current one." })
  .refine((d) => !SEEDED_DEFAULT_PASSWORDS.includes(d.newPassword), { path: ["newPassword"], message: "You can't reuse a seeded default password." });

/** Only same-site admin paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\") || next.startsWith("/admin/login")) return "/admin";
  return next;
}
