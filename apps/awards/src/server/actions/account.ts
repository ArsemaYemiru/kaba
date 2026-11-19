"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MEMBER_PASSWORD_MIN } from "@/lib/auth-constants";
import { getViewer } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { normalizeEthiopianPhone } from "@/lib/phone";
import { hit } from "@/lib/rate-limit";
import { changePasswordSchema, DeleteAccountSchema, fieldErrors, PhoneSchema, PhoneVerifySchema, ProfileSchema, STAFF_PASSWORD_MIN } from "@/schemas/auth";
import type { FormState } from "./auth";

/** Every account action: signed-in, active, not banned (re-read from the DB). */
async function member() {
  const v = await getViewer();
  if (!v) redirect("/sign-in?next=/account");
  return v;
}

const errCode = (err: unknown) => (err instanceof APIError ? ((err.body as { code?: string } | undefined)?.code ?? err.message) : undefined);

/** Display name + news opt-in only. No other column (role, verification…) is writable here (A-8). */
export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await member();
  const parsed = ProfileSchema.safeParse({ displayName: fd.get("displayName"), newsOptIn: fd.get("newsOptIn") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  await prisma.user.update({ where: { id: v.id }, data: { displayName: parsed.data.displayName, name: parsed.data.displayName, newsOptIn: parsed.data.newsOptIn } });
  revalidatePath("/account");
  return { notice: "Your details were saved." };
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await member();
  const parsed = changePasswordSchema(v.isStaff ? STAFF_PASSWORD_MIN : MEMBER_PASSWORD_MIN).safeParse({
    currentPassword: fd.get("currentPassword"),
    newPassword: fd.get("newPassword"),
    confirmPassword: fd.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  if (!(await hit(`pw:${v.id}`, 5, 15 * 60)).allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  try {
    await auth.api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (err) {
    if (errCode(err) === "INVALID_PASSWORD") return { fieldErrors: { currentPassword: "Your current password is incorrect." } };
    console.error("[change-password] failed", errCode(err) ?? err);
    return { error: "We couldn't change your password. Please try again." };
  }
  await prisma.user.update({ where: { id: v.id }, data: { mustChangePassword: false } });
  // The session cookie was rotated; render the confirmation on a fresh request that carries it.
  redirect("/account?passwordChanged=1#password-title");
}

/** Sign out of every device, including this one. */
export async function signOutEverywhere() {
  await member();
  await auth.api.revokeSessions({ headers: await headers() }).catch(() => undefined);
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  redirect("/sign-in?signedOut=1");
}

function phoneEnabled() {
  return getEnv().ENABLE_PHONE_OTP === "1";
}

export async function sendPhoneCode(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await member();
  if (!phoneEnabled()) return { error: "Phone verification isn't available." };
  const parsed = PhoneSchema.safeParse({ phone: fd.get("phone") });
  const phone = parsed.success ? normalizeEthiopianPhone(parsed.data.phone) : null;
  if (!phone) return { fieldErrors: { phone: "Enter an Ethiopian mobile number, e.g. 0911 234 567." }, values: { phone: String(fd.get("phone") ?? "") } };
  const taken = await prisma.user.findFirst({ where: { phoneNumber: phone, NOT: { id: v.id } }, select: { id: true } });
  if (taken) return { fieldErrors: { phone: "This number is already linked to another account." }, values: { phone } };
  const r = await hit(`sms:${v.id}`, 1, 60);
  if (!r.allowed) return { retryAfter: Math.ceil((r.resetAt.getTime() - Date.now()) / 1000), values: { phone, sent: "1" } };
  if (!(await hit(`sms-day:${v.id}`, 10, 86_400)).allowed) return { error: "Too many codes today. Please try again tomorrow.", values: { phone } };
  try {
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone }, headers: await headers() });
  } catch (err) {
    console.error("[phone] send failed", errCode(err) ?? err);
    return { error: "We couldn't send a code. Please try again.", values: { phone } };
  }
  return { notice: `We sent a code to ${phone}.`, values: { phone, sent: "1" }, retryAfter: 60 };
}

export async function verifyPhone(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await member();
  if (!phoneEnabled()) return { error: "Phone verification isn't available." };
  const parsed = PhoneVerifySchema.safeParse({ phone: fd.get("phone"), code: fd.get("code") });
  const phone = parsed.success ? normalizeEthiopianPhone(parsed.data.phone) : null;
  if (!parsed.success || !phone) return { fieldErrors: { code: "Enter the 6-digit code." }, values: { phone: String(fd.get("phone") ?? ""), sent: "1" } };
  try {
    // updatePhoneNumber attaches the verified number to the signed-in member.
    await auth.api.verifyPhoneNumber({ body: { phoneNumber: phone, code: parsed.data.code, updatePhoneNumber: true }, headers: await headers() });
  } catch (err) {
    const code = errCode(err);
    if (code === "OTP_EXPIRED") return { fieldErrors: { code: "This code has expired. Send a new one." }, values: { phone, sent: "1" } };
    if (code === "TOO_MANY_ATTEMPTS") return { fieldErrors: { code: "Too many wrong codes. Send a new one." }, values: { phone, sent: "1" } };
    return { fieldErrors: { code: "That code isn't right." }, values: { phone, sent: "1" } };
  }
  await prisma.user.update({ where: { id: v.id }, data: { phoneNumber: phone, phoneNumberVerified: true } });
  revalidatePath("/account");
  return { notice: "Your phone number is verified." };
}

/**
 * Delete account (spec §5.1, A-15). Votes in an edition that is still open are
 * deleted; votes in closed/locked editions stay in the tallies with the user
 * detached (Vote.userId → NULL). Vote events are kept for the audit trail with
 * userId cleared (the append-only trigger allows exactly that). Staff accounts
 * are removed by a super admin, not self-service.
 */
export async function deleteAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await member();
  if (v.isStaff) return { error: "Staff accounts are removed by a super admin." };
  const parsed = DeleteAccountSchema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  if (!(await hit(`delete:${v.id}`, 5, 15 * 60)).allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  const account = await prisma.account.findFirst({ where: { userId: v.id, providerId: "credential" }, select: { password: true } });
  if (account?.password) {
    const ctx = await auth.$context;
    if (!(await ctx.password.verify({ hash: account.password, password: parsed.data.password }))) return { fieldErrors: { password: "Your password is incorrect." } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { userId: v.id, edition: { phase: "VOTING_OPEN" } } });
    await tx.vote.updateMany({ where: { userId: v.id }, data: { userId: null } });
    await tx.user.delete({ where: { id: v.id } }); // sessions, accounts, 2FA cascade; vote events SET NULL
  });
  redirect("/?accountDeleted=1");
}
