/**
 * Cache tags for public reads ('use cache' + cacheTag). Admin writes (Phase 6)
 * invalidate with these. Per-user data (ballot, account) is never cached.
 */
export const TAGS = {
  settings: "settings",
  media: "media",
  editions: "editions", // editions, categories and nominees
  edition: (slug: string) => `edition:${slug}`,
  nominee: (slug: string) => `nominee:${slug}`,
  artists: "artists",
  artist: (slug: string) => `artist:${slug}`,
  videos: "videos",
  albums: "albums",
  album: (slug: string) => `album:${slug}`,
  news: "news",
  newsPost: (slug: string) => `news:${slug}`,
} as const;
