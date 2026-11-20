"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { clientIp, hashIp, hit, peek, reset } from "@/lib/rate-limit";
import { fieldErrors, ForgotSchema, ResetSchema, safeNext, SignInSchema, TwoFactorSchema } from "@/schemas/auth";

export type FormState =
  | { error?: string; notice?: string; fieldErrors?: Record<string, string>; values?: Record<string, string>; retryAfter?: number }
  | undefined;

const SIGNIN_FAILURES = 5; // per IP + email per 15 min
const GENERIC_SIGNIN = "Incorrect email or password.";

const errCode = (err: unknown) => (err instanceof APIError ? ((err.body as { code?: string } | undefined)?.code ?? err.message) : undefined);
const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : undefined;
};
const human = (fd: FormData, ...keys: string[]) => Object.fromEntries(keys.map((k) => [k, str(fd, k) ?? ""]));

/** Where staff go after signing in: a forced password change first, else the admin (or a safe `next`). */
async function landing(userId: string, next: string | undefined) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { mustChangePassword: true, email: true } });
  if (u) await logActivity({ userId, action: "login", entityType: "User", entityId: userId, meta: { label: u.email } });
  if (u?.mustChangePassword) return "/admin/change-password";
  return safeNext(next, "/admin");
}

/** Stored email for a normalized address, so "a.b@gmail.com" and "ab@gmail.com" sign into the same account. */
async function storedEmail(email: string) {
  const u = await prisma.user.findUnique({ where: { emailNormalized: normalizeEmail(email) }, select: { email: true } });
  return u?.email ?? email;
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = human(fd, "email", "next");
  const parsed = SignInSchema.safeParse({ email: fd.get("email"), password: fd.get("password"), next: str(fd, "next") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const ip = await clientIp();
  const email = await storedEmail(parsed.data.email);
  const key = `signin:${hashIp(ip)}:${normalizeEmail(email)}`;
  if ((await peek(key)) >= SIGNIN_FAILURES) return { error: "Too many failed attempts. Please wait 15 minutes and try again.", values };

  let res: Awaited<ReturnType<typeof auth.api.signInEmail>>;
  try {
    res = await auth.api.signInEmail({ body: { email, password: parsed.data.password, rememberMe: true }, headers: await headers() });
  } catch (err) {
    const code = errCode(err);
    if (code === "BANNED_USER") return { error: "This account has been suspended. Contact the organizers if you think this is a mistake.", values };
    if (code !== "INVALID_EMAIL_OR_PASSWORD") console.error("[sign-in] failed", code ?? err);
    await hit(key, SIGNIN_FAILURES, 15 * 60);
    return { error: GENERIC_SIGNIN, values };
  }
  await reset(key);
  if ("twoFactorRedirect" in res && res.twoFactorRedirect) {
    redirect(`/two-factor?next=${encodeURIComponent(safeNext(parsed.data.next, "/admin"))}`);
  }
  redirect(await landing((res as { user: { id: string } }).user.id, parsed.data.next));
}

export async function forgotPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = human(fd, "email");
  const parsed = ForgotSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const ip = await clientIp();
  if (!(await hit(`forgot:${hashIp(ip)}`, 5, 15 * 60)).allowed) return { error: "Too many requests. Please wait 15 minutes and try again.", values };
  const email = await storedEmail(parsed.data.email);
  // Same response whether or not the account exists (no account enumeration).
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    await auth.api.requestPasswordResetEmailOTP({ body: { email } }).catch((err) => console.error("[forgot] couldn't send code", errCode(err) ?? err));
  }
  redirect(`/reset-password?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = human(fd, "email");
  const parsed = ResetSchema.safeParse({ email: fd.get("email"), code: fd.get("code"), password: fd.get("password"), confirmPassword: fd.get("confirmPassword") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues), values };
  const ip = await clientIp();
  if (!(await hit(`reset:${hashIp(ip)}`, 10, 15 * 60)).allowed) return { error: "Too many attempts. Please wait 15 minutes and try again.", values };
  const email = await storedEmail(parsed.data.email);
  try {
    await auth.api.resetPasswordEmailOTP({ body: { email, otp: parsed.data.code, password: parsed.data.password } });
  } catch (err) {
    const code = errCode(err);
    if (code === "OTP_EXPIRED") return { fieldErrors: { code: "This code has expired. Request a new one." }, values };
    if (code === "TOO_MANY_ATTEMPTS") return { fieldErrors: { code: "Too many wrong codes. Request a new one." }, values };
    return { fieldErrors: { code: "That code isn't right. Check the latest email and try again." }, values };
  }
  // A staff member who resets by email has chosen a new password.
  await prisma.user.updateMany({ where: { email }, data: { mustChangePassword: false } });
  redirect("/sign-in?reset=1");
}

export async function verifyTwoFactor(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = TwoFactorSchema.safeParse({ code: fd.get("code"), method: fd.get("method") ?? undefined, trustDevice: fd.get("trustDevice"), next: str(fd, "next") });
  if (!parsed.success) return { fieldErrors: { code: "Enter the code from your authenticator app." } };
  const ip = await clientIp();
  if (!(await hit(`2fa:${hashIp(ip)}`, 10, 15 * 60)).allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  let userId: string;
  try {
    const h = await headers();
    const res =
      parsed.data.method === "backup"
        ? await auth.api.verifyBackupCode({ body: { code: parsed.data.code, trustDevice: parsed.data.trustDevice }, headers: h })
        : await auth.api.verifyTOTP({ body: { code: parsed.data.code, trustDevice: parsed.data.trustDevice }, headers: h });
    userId = (res as { user: { id: string } }).user.id;
  } catch (err) {
    const code = errCode(err);
    if (code === "INVALID_TWO_FACTOR_COOKIE" || code === "TWO_FACTOR_NOT_ENABLED") redirect("/sign-in");
    return { fieldErrors: { code: "That code isn't right. Try the current code from your app." } };
  }
  redirect(await landing(userId, parsed.data.next));
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  redirect("/sign-in");
}
