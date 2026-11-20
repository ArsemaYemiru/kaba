import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Roles (spec §5.1/§6): SUPER_ADMIN everything; EDITOR content only (no
 * Staff, no Site Settings). There are no public accounts (A-77). Every admin
 * page, action and route re-checks the role on the server.
 */
export const statement = {
  ...defaultStatements,
  content: ["read", "create", "update", "publish", "delete"],
  awards: ["read", "manage"],
  settings: ["read", "update"],
} as const;

export const ac = createAccessControl(statement);

export const EDITOR = ac.newRole({
  content: ["read", "create", "update", "publish", "delete"],
  awards: ["read", "manage"],
});
export const SUPER_ADMIN = ac.newRole({
  ...adminAc.statements,
  content: ["read", "create", "update", "publish", "delete"],
  awards: ["read", "manage"],
  settings: ["read", "update"],
});

export const ROLES = { SUPER_ADMIN, EDITOR } as const;
export type AppRole = keyof typeof ROLES;
export const STAFF_ROLES: AppRole[] = ["SUPER_ADMIN", "EDITOR"];
