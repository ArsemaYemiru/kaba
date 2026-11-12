import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AppRole } from "./auth-permissions";
import { auth } from "./auth";

/**
 * Authorization (spec §5). The proxy does an early check for real 3xx/403
 * status codes; these helpers re-check the session and role from the DB inside
 * every admin page, Server Action and route handler. Never rely on the proxy alone.
 */

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  mustChangePassword: boolean;
  isActive: boolean;
};

export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; mustChangePassword?: boolean; isActive?: boolean };
  if (!u.isActive) return null;
  const user: AdminUser = {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EDITOR",
    mustChangePassword: !!u.mustChangePassword,
    isActive: true,
  };
  return { session: session.session, user };
});

/** Pages: redirect to login when signed out, to change-password when forced. */
export async function requireUser(opts: { allowMustChange?: boolean } = {}): Promise<AdminUser> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (s.user.mustChangePassword && !opts.allowMustChange) redirect("/admin/change-password");
  return s.user;
}

export function isSuperAdmin(user: AdminUser) {
  return user.role === "SUPER_ADMIN";
}

export type Denied = { ok: false; status: 401 | 403; error: "unauthorized" | "forbidden" | "passwordChangeRequired" };

/**
 * Server Actions / route handlers: returns the user, or a typed denial
 * (401 signed out or must change password, 403 wrong role).
 */
export async function authorize(role?: AppRole): Promise<{ ok: true; user: AdminUser } | Denied> {
  const s = await getSession();
  if (!s) return { ok: false, status: 401, error: "unauthorized" };
  if (s.user.mustChangePassword) return { ok: false, status: 401, error: "passwordChangeRequired" };
  if (role === "SUPER_ADMIN" && s.user.role !== "SUPER_ADMIN") return { ok: false, status: 403, error: "forbidden" };
  return { ok: true, user: s.user };
}
