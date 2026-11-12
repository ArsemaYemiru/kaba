import { z } from "zod";

export const PAGE_SIZE = 25;

/** Common list params for admin tables: ?q=&status=&sort=&dir=&page= plus module filters. */
export function parseListParams<F extends string, S extends string>(
  raw: Record<string, string | string[] | undefined>,
  opts: { sorts: readonly [S, ...S[]]; defaultSort: S; defaultDir?: "asc" | "desc"; filters?: readonly F[] },
) {
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k]![0] : raw[k]) as string | undefined;
  const base = z
    .object({
      q: z.string().trim().max(100).optional().catch(undefined),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().catch(undefined),
      sort: z.enum(opts.sorts).default(opts.defaultSort).catch(opts.defaultSort),
      dir: z.enum(["asc", "desc"]).default(opts.defaultDir ?? "desc").catch(opts.defaultDir ?? "desc"),
      page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
    })
    .parse({ q: one("q") || undefined, status: one("status"), sort: one("sort"), dir: one("dir"), page: one("page") });
  const filters = Object.fromEntries((opts.filters ?? []).map((f) => [f, one(f)?.slice(0, 60) || undefined])) as Record<F, string | undefined>;
  return { ...base, filters, skip: (base.page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export type ListParams = ReturnType<typeof parseListParams>;
