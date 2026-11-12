import "server-only";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

type SlugModel = "artist" | "episode" | "video" | "album" | "newsPost";

async function taken(model: SlugModel, slug: string, excludeId?: string) {
  const where = { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
  switch (model) {
    case "artist":
      return !!(await prisma.artist.findFirst({ where, select: { id: true } }));
    case "episode":
      return !!(await prisma.episode.findFirst({ where, select: { id: true } }));
    case "video":
      return !!(await prisma.video.findFirst({ where, select: { id: true } }));
    case "album":
      return !!(await prisma.album.findFirst({ where, select: { id: true } }));
    case "newsPost":
      return !!(await prisma.newsPost.findFirst({ where, select: { id: true } }));
  }
}

/**
 * Explicit slug → must be free (else a field error). No slug → derived from
 * the title, with -2, -3… appended until free.
 */
export async function resolveSlug(model: SlugModel, explicit: string | null, title: string, excludeId?: string): Promise<{ slug: string } | { error: string }> {
  if (explicit) return (await taken(model, explicit, excludeId)) ? { error: "That slug is already used. Pick another." } : { slug: explicit };
  const base = slugify(title) || "item";
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (!(await taken(model, candidate, excludeId))) return { slug: candidate };
  }
  return { slug: `${base}-${Date.now()}` };
}
