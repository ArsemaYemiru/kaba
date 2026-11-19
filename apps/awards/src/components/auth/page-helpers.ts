import "server-only";
import { safeNext } from "@/schemas/auth";

export const nextParam = (raw: Record<string, string | string[] | undefined>, fallback = "/") => {
  const v = raw.next;
  return safeNext(Array.isArray(v) ? v[0] : v, fallback);
};
export const NO_INDEX = { robots: { index: false, follow: false } } as const;
