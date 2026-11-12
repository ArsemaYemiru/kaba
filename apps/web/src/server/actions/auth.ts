"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { clientIp, hashIp, hit, peek, reset } from "@/lib/rate-limit";
import { ChangePasswordSchema, LoginSchema, safeNext } from "@/schemas/auth";

const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const GENERIC = "Invalid email or password.";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

/** Login (spec §5): generic error, 5 failed attempts per 15 min per IP+email. */
export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: GENERIC };
  const { email, password } = parsed.data;

  const key = `login:${hashIp(await clientIp())}:${email}`;
  if ((await peek(key)) >= LOGIN_MAX_FAILURES) {
    return { error: "Too many failed attempts. Please wait 15 minutes and try again." };
  }

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (err) {
    const code = err instanceof APIError ? (err.body as { code?: string } | undefined)?.code : undefined;
    if (code !== "INVALID_EMAIL_OR_PASSWORD") console.error("[login] sign-in failed", code ?? err);
    await hit(key, LOGIN_MAX_FAILURES, LOGIN_WINDOW_SECONDS);
    return { error: GENERIC };
  }

  await reset(key);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, mustChangePassword: true } });
  await logActivity({ userId: user?.id ?? null, action: "login", entityType: "User", entityId: user?.id });
  redirect(user?.mustChangePassword ? "/admin/change-password" : safeNext(parsed.data.next));
}

/** Forced/voluntary password change: min 12 chars, not the current or a seeded default. */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/admin/login");

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }

  try {
    await auth.api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError) return { fieldErrors: { currentPassword: "Current password is incorrect." } };
    console.error("[change-password] unexpected error", err);
    return { error: "Couldn't change your password. Please try again." };
  }

  await prisma.user.update({ where: { id: s.user.id }, data: { mustChangePassword: false } });
  await logActivity({ userId: s.user.id, action: "password_change", entityType: "User", entityId: s.user.id });
  redirect("/admin");
}

export async function logout() {
  const s = await getSession();
  try {
    await auth.api.signOut({ headers: await headers() });
  } finally {
    if (s) await logActivity({ userId: s.user.id, action: "logout", entityType: "User", entityId: s.user.id });
  }
  redirect("/admin/login");
}
