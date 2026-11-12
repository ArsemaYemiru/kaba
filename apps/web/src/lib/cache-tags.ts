/**
 * Cache tags for public reads ('use cache' + cacheTag). Admin writes
 * (Phase 5) call updateTag()/revalidateTag() with these.
 */
export const TAGS = {
  settings: "settings",
  media: "media",
  episodes: "episodes",
  episode: (slug: string) => `episode:${slug}`,
  artists: "artists",
  artist: (slug: string) => `artist:${slug}`,
  videos: "videos",
  albums: "albums",
  album: (slug: string) => `album:${slug}`,
  news: "news",
  newsPost: (slug: string) => `news:${slug}`,
} as const;
