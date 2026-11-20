/**
 * Cache tags for public reads ('use cache' + cacheTag). Admin writes (Phase 6)
 * invalidate with these.
 */
export const TAGS = {
  settings: "settings",
  media: "media",
  editions: "editions", // editions, genre categories and honorees
  edition: (slug: string) => `edition:${slug}`,
  honoree: (slug: string) => `honoree:${slug}`,
  artists: "artists",
  artist: (slug: string) => `artist:${slug}`,
  videos: "videos",
  albums: "albums",
  album: (slug: string) => `album:${slug}`,
  news: "news",
  newsPost: (slug: string) => `news:${slug}`,
} as const;
