"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { authorize, type Denied } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { fieldErrorsFrom } from "@/schemas/admin/common";
import { CreateUserSchema } from "@/schemas/admin/content";
import { SEEDED_DEFAULT_PASSWORDS } from "@/schemas/auth";

export type ActionResult = { ok: true } | Denied | { ok: false; status: 400 | 404 | 409; error: string; fieldErrors?: Record<string, string> };

/** Hash with Better Auth's hasher and (re)write the credential account. */
async function writePassword(userId: string, password: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { userId, providerId: "credential" } }),
    prisma.account.create({ data: { userId, accountId: userId, providerId: "credential", password: hash } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
}

/** SUPER_ADMIN only: create a user with a temporary password (must change on first login). */
export async function createUser(input: unknown): Promise<ActionResult> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return a;
  const parsed = CreateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const d = parsed.data;
  if (SEEDED_DEFAULT_PASSWORDS.includes(d.password)) return { ok: false, status: 400, error: "Choose a different temporary password.", fieldErrors: { password: "Don't reuse a seeded default password." } };
  if (await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } })) {
    return { ok: false, status: 409, error: "A user with that email already exists.", fieldErrors: { email: "Already in use." } };
  }
  const user = await prisma.user.create({ data: { name: d.name, email: d.email, role: d.role, emailVerified: true, mustChangePassword: true, isActive: true } });
  await writePassword(user.id, d.password);
  await logActivity({ userId: a.user.id, action: "create", entityType: "User", entityId: user.id, meta: { label: `${d.email} (${d.role})` } });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** SUPER_ADMIN only: change a user's role (never leaves zero active super admins). */
export async function setUserRole(input: unknown): Promise<ActionResult> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return a;
  const parsed = z.object({ userId: z.string().min(1), role: z.enum(["SUPER_ADMIN", "EDITOR"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid input." };
  const { userId, role } = parsed.data;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!target) return { ok: false, status: 404, error: "User not found." };
  if (target.role === "SUPER_ADMIN" && role === "EDITOR") {
    const others = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true, id: { not: userId } } });
    if (others === 0) return { ok: false, status: 409, error: "At least one active super admin is required." };
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logActivity({ userId: a.user.id, action: "update", entityType: "User", entityId: userId, meta: { label: `${target.email} → ${role}` } });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** SUPER_ADMIN only: set a temporary password; the user must change it and is signed out everywhere. */
export async function resetUserPassword(input: unknown): Promise<ActionResult> {
  const a = await authorize("SUPER_ADMIN");
  if (!a.ok) return a;
  const parsed = z.object({ userId: z.string().min(1), password: z.string().min(12, "Use at least 12 characters.").max(128) }).safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? "Invalid input.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  const { userId, password } = parsed.data;
  if (SEEDED_DEFAULT_PASSWORDS.includes(password)) return { ok: false, status: 400, error: "Don't reuse a seeded default password." };
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target) return { ok: false, status: 404, error: "User not found." };
  await writePassword(userId, password);
  await prisma.user.update({ where: { id: userId }, data: { mustChangePassword: true } });
  await logActivity({ userId: a.user.id, action: "update", entityType: "User", entityId: userId, meta: { label: `${target.email} password reset` } });
  revalidatePath("/admin/users");
  return { ok: true };
}

const SetActive = z.object({ userId: z.string().min(1), active: z.boolean() });

/** SUPER_ADMIN only: deactivate (revokes all sessions) or reactivate a user. */
export async function setUserActive(input: unknown): Promise<ActionResult> {
  const auth = await authorize("SUPER_ADMIN");
  if (!auth.ok) return auth;
  const parsed = SetActive.safeParse(input);
  if (!parsed.success) return { ok: false, status: 400, error: "Invalid input." };
  const { userId, active } = parsed.data;
  if (userId === auth.user.id) return { ok: false, status: 409, error: "You can't deactivate your own account." };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  if (!target) return { ok: false, status: 404, error: "User not found." };
  if (!active && target.role === "SUPER_ADMIN") {
    const others = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true, id: { not: userId } } });
    if (others === 0) return { ok: false, status: 409, error: "At least one active super admin is required." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { isActive: active } }),
    ...(active ? [] : [prisma.session.deleteMany({ where: { userId } })]),
  ]);
  await logActivity({ userId: auth.user.id, action: active ? "activate" : "deactivate", entityType: "User", entityId: userId, meta: { label: target.email } });
  revalidatePath("/admin/users");
  return { ok: true };
}
