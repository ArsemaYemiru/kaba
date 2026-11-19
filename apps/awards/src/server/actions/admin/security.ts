"use server";

import { APIError } from "better-auth/api";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { authorizeStaff, getViewer } from "@/lib/authz";
import { TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { hit } from "@/lib/rate-limit";
import { changePasswordSchema, fieldErrors, STAFF_PASSWORD_MIN } from "@/schemas/auth";
import type { FormState } from "../auth";

const errCode = (err: unknown) => (err instanceof APIError ? ((err.body as { code?: string } | undefined)?.code ?? err.message) : undefined);

/** Forced (or voluntary) staff password change: min 12 chars, never a seeded default. */
export async function changeStaffPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await getViewer();
  if (!v) redirect("/sign-in?next=/admin");
  if (!v.isStaff) return { error: "Forbidden." };
  const parsed = changePasswordSchema(STAFF_PASSWORD_MIN).safeParse({
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
    console.error("[staff-password] failed", errCode(err) ?? err);
    return { error: "We couldn't change your password. Please try again." };
  }
  await prisma.user.update({ where: { id: v.id }, data: { mustChangePassword: false } });
  await prisma.activityLog.create({ data: { userId: v.id, action: "password_change", entityType: "User", entityId: v.id } });
  redirect("/admin");
}

export type TwoFactorSetup = (NonNullable<FormState> & { qrSvg?: string; secret?: string; backupCodes?: string[] }) | undefined;

/** Step 1: confirm the password, get a TOTP secret (QR) and one-time backup codes. */
export async function startTwoFactor(_prev: TwoFactorSetup, fd: FormData): Promise<TwoFactorSetup> {
  const v = await authorizeStaff();
  const password = z.string().min(1).max(200).safeParse(fd.get("password"));
  if (!password.success) return { fieldErrors: { password: "Enter your password." } };
  if (!(await hit(`2fa-setup:${v.id}`, 5, 15 * 60)).allowed) return { error: "Too many attempts. Please wait 15 minutes." };
  try {
    const res = await auth.api.enableTwoFactor({ body: { password: password.data }, headers: await headers() });
    if (res.method !== "totp") return { error: "We couldn't start two-factor setup. Please try again." };
    const secret = new URL(res.totpURI).searchParams.get("secret") ?? undefined;
    const qrSvg = await QRCode.toString(res.totpURI, { type: "svg", margin: 1, color: { dark: "#0A0A0C", light: "#FFFFFF" } });
    return { qrSvg, secret, backupCodes: res.backupCodes };
  } catch (err) {
    if (errCode(err) === "INVALID_PASSWORD") return { fieldErrors: { password: "Your password is incorrect." } };
    console.error("[2fa] enable failed", errCode(err) ?? err);
    return { error: "We couldn't start two-factor setup. Please try again." };
  }
}

/** Step 2: the first code from the authenticator app switches 2FA on. */
export async function confirmTwoFactor(prev: TwoFactorSetup, fd: FormData): Promise<TwoFactorSetup> {
  const v = await authorizeStaff();
  const code = z.string().trim().regex(/^\d{6}$/).safeParse(fd.get("code"));
  if (!code.success) return { ...prev, fieldErrors: { code: "Enter the 6-digit code from your app." } };
  try {
    await auth.api.verifyTOTP({ body: { code: code.data }, headers: await headers() });
  } catch {
    return { ...prev, fieldErrors: { code: "That code isn't right. Try the current code from your app." } };
  }
  await prisma.activityLog.create({ data: { userId: v.id, action: "2fa_enabled", entityType: "User", entityId: v.id } });
  // Enabling 2FA rotates the session cookie; a fresh request (not a same-request re-render) must carry it.
  redirect("/admin/security?enabled=1");
}

export async function disableTwoFactor(_prev: FormState, fd: FormData): Promise<FormState> {
  const v = await authorizeStaff();
  const password = z.string().min(1).max(200).safeParse(fd.get("password"));
  if (!password.success) return { fieldErrors: { password: "Enter your password." } };
  try {
    await auth.api.disableTwoFactor({ body: { password: password.data }, headers: await headers() });
  } catch (err) {
    if (errCode(err) === "INVALID_PASSWORD") return { fieldErrors: { password: "Your password is incorrect." } };
    return { error: "We couldn't turn off two-factor authentication." };
  }
  await prisma.activityLog.create({ data: { userId: v.id, action: "2fa_disabled", entityType: "User", entityId: v.id } });
  revalidatePath("/admin/security");
  return { notice: "Two-factor authentication is off." };
}

/** Staff-only: clear the public caches (e.g. after editing data outside the CMS). */
export async function refreshPublicContent(): Promise<{ ok: true }> {
  const v = await authorizeStaff();
  for (const tag of [TAGS.settings, TAGS.media, TAGS.editions, TAGS.artists, TAGS.videos, TAGS.albums, TAGS.news]) revalidateTag(tag, { expire: 0 });
  await prisma.activityLog.create({ data: { userId: v.id, action: "cache_refresh", entityType: "Site" } });
  return { ok: true };
}
