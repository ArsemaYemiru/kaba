import { z } from "zod";
import type { Denied } from "@/lib/authz";

/** Shared by every module's bulk action (publish / unpublish / archive / delete). */
export const BulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  op: z.enum(["publish", "unpublish", "archive", "delete"]),
});
export type BulkOp = z.infer<typeof BulkSchema>["op"];
export type BulkResult = { ok: true; count: number } | Denied;
