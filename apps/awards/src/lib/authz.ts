import "server-only";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { STAFF_ROLES, type AppRole } from "./auth-permissions";
import { prisma } from "./db";

/**
 * Who is signed in (per request, never inside 'use cache'; A-14).
 * Authorization reads the user row from the DB, never trusting the session
 * cookie cache, so bans, role changes and deactivations apply immediately.
 */
export type Viewer = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  role: AppRole;
  isStaff: boolean;
  banned: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  newsOptIn: boolean;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } }).catch(() => null);
  if (!session) return null;
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      emailVerified: true,
      phoneNumber: true,
      phoneNumberVerified: true,
      role: true,
      banned: true,
      banExpires: true,
      isActive: true,
      mustChangePassword: true,
      twoFactorEnabled: true,
      newsOptIn: true,
    },
  });
  if (!u || !u.isActive) return null;
  const banned = !!u.banned && (!u.banExpires || u.banExpires > new Date());
  if (banned) return null;
  return {
    id: u.id,
    name: u.displayName || u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    phoneNumber: u.phoneNumber,
    phoneNumberVerified: !!u.phoneNumberVerified,
    role: u.role,
    isStaff: (STAFF_ROLES as readonly string[]).includes(u.role),
    banned,
    mustChangePassword: u.mustChangePassword,
    twoFactorEnabled: !!u.twoFactorEnabled,
    newsOptIn: u.newsOptIn,
  };
});

/** Member pages: signed-out visitors go to sign-in and come back. */
export async function requireViewer(next: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return v;
}

/** Admin pages: signed out → sign-in; not staff → 403; forced password change → change it first. */
export async function requireStaff(opts: { allowMustChange?: boolean; role?: AppRole } = {}): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/sign-in?next=/admin");
  if (!v.isStaff || (opts.role === "SUPER_ADMIN" && v.role !== "SUPER_ADMIN")) forbidden();
  if (v.mustChangePassword && !opts.allowMustChange) redirect("/admin/change-password");
  return v;
}

export type Denied = { ok: false; status: 401 | 403; error: "unauthorized" | "forbidden" | "passwordChangeRequired" };

/**
 * Admin Server Actions: a member (or anyone) gets a real 403 via `forbidden()`;
 * signed-out callers get 401-style denials. Every admin action starts here.
 */
export async function authorizeStaff(role?: AppRole): Promise<Viewer> {
  const v = await getViewer();
  if (!v || !v.isStaff || (role === "SUPER_ADMIN" && v.role !== "SUPER_ADMIN")) forbidden();
  if (v.mustChangePassword) forbidden();
  return v;
}

/* ── Admin CMS helpers (shared with the Feta Show admin modules) ─────────── */

export type AdminUser = { id: string; name: string; email: string; role: AppRole; mustChangePassword: boolean; twoFactorEnabled: boolean };

const toAdmin = (v: Viewer): AdminUser => ({ id: v.id, name: v.name, email: v.email, role: v.role, mustChangePassword: v.mustChangePassword, twoFactorEnabled: v.twoFactorEnabled });

/** Admin layout: the signed-in staff member, or null (the proxy already gated the route). */
export async function getSession(): Promise<{ user: AdminUser } | null> {
  const v = await getViewer();
  return v?.isStaff ? { user: toAdmin(v) } : null;
}

/** Admin pages. Members get a 403 (forbidden()), signed-out visitors go to sign-in. */
export async function requireUser(opts: { allowMustChange?: boolean; role?: AppRole } = {}): Promise<AdminUser> {
  return toAdmin(await requireStaff(opts));
}

export const isSuperAdmin = (u: Pick<AdminUser, "role">) => u.role === "SUPER_ADMIN";

/**
 * Admin Server Actions and route handlers. Non-staff (and SUPER_ADMIN-only
 * mismatches) get a real 403 via forbidden(); the union keeps call sites that
 * still check `.ok` type-safe.
 */
export async function authorize(role?: AppRole): Promise<{ ok: true; user: AdminUser } | Denied> {
  return { ok: true, user: toAdmin(await authorizeStaff(role)) };
}
