import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Roles (spec §5): SUPER_ADMIN can do everything; EDITOR manages content
 * only (no Users, no Site Settings). These are also enforced in every
 * admin page, action and route handler via lib/authz.ts (Phase 4).
 */
export const statement = {
  ...defaultStatements,
  content: ["read", "create", "update", "publish", "delete"],
  media: ["read", "upload", "update", "delete"],
  submissions: ["read", "update", "export"],
  settings: ["read", "update"],
  activity: ["read"],
} as const;

export const ac = createAccessControl(statement);

export const EDITOR = ac.newRole({
  content: ["read", "create", "update", "publish", "delete"],
  media: ["read", "upload", "update", "delete"],
  submissions: ["read", "update", "export"],
  activity: ["read"],
});

export const SUPER_ADMIN = ac.newRole({
  ...adminAc.statements,
  content: ["read", "create", "update", "publish", "delete"],
  media: ["read", "upload", "update", "delete"],
  submissions: ["read", "update", "export"],
  settings: ["read", "update"],
  activity: ["read"],
});

export const ROLES = { SUPER_ADMIN, EDITOR } as const;
export type AppRole = keyof typeof ROLES;
