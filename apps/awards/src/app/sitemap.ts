import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { editionParams } from "@/server/queries/awards";
import { albumSlugs } from "@/server/queries/gallery";
import { artistSlugs } from "@/server/queries/artists";
import { newsSlugs } from "@/server/queries/news";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

/** Public, published URLs only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [editions, artists, albums, news] = await Promise.all([editionParams(), artistSlugs(), albumSlugs(), newsSlugs()]);
  const page = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap[number] => ({ url: `${SITE}${path}`, lastModified, priority });
  return [
    page("/", 1),
    ...["/artists", "/videos", "/gallery", "/news", "/awards/archive"].map((p) => page(p, 0.8)),
    ...["/about", "/privacy", "/terms"].map((p) => page(p, 0.5)),
    ...editions.flatMap((e) => [
      page(`/awards/${e.slug}`, 0.9, e.updatedAt),
      ...e.categories.flatMap((c) => [page(`/awards/${e.slug}/${c.slug}`, 0.7, c.updatedAt), ...c.nominees.map((n) => page(`/honorees/${n.slug}`, 0.6, n.updatedAt))]),
    ]),
    ...artists.map((a) => page(`/artists/${a.slug}`, 0.7, a.updatedAt)),
    ...albums.map((a) => page(`/gallery/${a.slug}`, 0.5, a.updatedAt)),
    ...news.map((n) => page(`/news/${n.slug}`, 0.6, n.updatedAt)),
  ];
}
