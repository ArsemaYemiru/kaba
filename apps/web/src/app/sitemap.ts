import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { albumSlugs } from "@/server/queries/gallery";
import { artistSlugs } from "@/server/queries/artists";
import { episodeSlugs } from "@/server/queries/episodes";
import { newsSlugs } from "@/server/queries/news";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [episodes, artists, albums, news] = await Promise.all([episodeSlugs(), artistSlugs(), albumSlugs(), newsSlugs()]);
  const page = (path: string, priority: number, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${SITE}${path}`,
    lastModified,
    priority,
  });
  return [
    page("/", 1),
    ...["/episodes", "/artists", "/videos", "/gallery", "/news"].map((p) => page(p, 0.8)),
    ...["/about", "/join", "/privacy"].map((p) => page(p, 0.5)),
    ...episodes.map((e) => page(`/episodes/${e.slug}`, 0.7, e.updatedAt)),
    ...artists.map((a) => page(`/artists/${a.slug}`, 0.7, a.updatedAt)),
    ...albums.map((a) => page(`/gallery/${a.slug}`, 0.5, a.updatedAt)),
    ...news.map((n) => page(`/news/${n.slug}`, 0.6, n.updatedAt)),
  ];
}
