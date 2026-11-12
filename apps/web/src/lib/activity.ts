import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

export type ActivityAction =
  | "login"
  | "logout"
  | "password_change"
  | "create"
  | "update"
  | "publish"
  | "unpublish"
  | "delete"
  | "deactivate"
  | "activate";

/** Append-only audit trail (spec §5). Never throws into the caller. */
export async function logActivity(entry: {
  userId: string | null;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.activityLog.create({
      data: { userId: entry.userId, action: entry.action, entityType: entry.entityType, entityId: entry.entityId ?? null, meta: entry.meta ?? {} },
    });
  } catch (err) {
    console.error("[activity] failed to log", entry.action, entry.entityType, err);
  }
}
