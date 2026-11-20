import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { TAGS } from "./cache-tags";

/**
 * Invalidate public caches after an admin change (spec §5: changes show on the
 * public site immediately). Server Actions use updateTag (read-your-own-writes);
 * route handlers use revalidateTag with immediate expiry.
 */
export function invalidate(tags: (string | null | undefined | false)[], from: "action" | "route" = "action") {
  for (const tag of new Set(tags.filter((t): t is string => !!t))) {
    if (from === "action") updateTag(tag);
    else revalidateTag(tag, { expire: 0 });
  }
}

/** Tags touched by each content type (cards embed data from related types). */
export const TAGS_FOR = {
  artist: (...slugs: (string | null | undefined)[]) => [TAGS.artists, TAGS.editions, TAGS.videos, ...slugs.map((s) => s && TAGS.artist(s))],
  /** Editions, categories and nominees share one tag set (pages embed all three). */
  awards: (...slugs: (string | null | undefined)[]) => [TAGS.editions, TAGS.artists, TAGS.videos, TAGS.settings, ...slugs.map((s) => s && TAGS.edition(s))],
  honoree: (...slugs: (string | null | undefined)[]) => [TAGS.editions, TAGS.artists, TAGS.videos, ...slugs.map((s) => s && TAGS.honoree(s))],
  video: () => [TAGS.videos, TAGS.editions, TAGS.artists],
  album: (...slugs: (string | null | undefined)[]) => [TAGS.albums, ...slugs.map((s) => s && TAGS.album(s))],
  news: (...slugs: (string | null | undefined)[]) => [TAGS.news, ...slugs.map((s) => s && TAGS.newsPost(s))],
  media: () => [TAGS.media, TAGS.artists, TAGS.editions, TAGS.videos, TAGS.albums, TAGS.news, TAGS.settings],
  settings: () => [TAGS.settings, TAGS.editions],
  all: () => [TAGS.settings, TAGS.media, TAGS.editions, TAGS.artists, TAGS.videos, TAGS.albums, TAGS.news],
};
