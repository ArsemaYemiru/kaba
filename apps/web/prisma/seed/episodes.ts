import type { EpisodeType } from "../../src/generated/prisma/enums";

export type SeedEpisode = { a: string; b: string; type: EpisodeType; featured?: boolean };

/**
 * §8.3: all season 1, PUBLISHED, no video, no air date, episode number or result.
 * Names matching a draft contestant (§8.4b) are linked; others are guest names.
 */
export const EPISODES: SeedEpisode[] = [
  { a: "Lij Michael", b: "Hanan Tarik", type: "GAME_SHOW", featured: true },
  { a: "Bezawit", b: "Henok", type: "GAME_SHOW" },
  { a: "Mikyas", b: "Yetenayet", type: "GAME_SHOW" },
  { a: "Tilahun Elfineh", b: "Sentayehu", type: "GAME_SHOW" },
  { a: "Mekonnen Laeke", b: "Deribwork", type: "GAME_SHOW" },
  { a: "Jesica", b: "Solomon", type: "GAME_SHOW" },
  { a: "Solomon Tekalign", b: "Berhanu Tesfaye", type: "GAME_SHOW" },
  { a: "Addisalem", b: "Daniel", type: "GAME_SHOW" },
  { a: "Selam", b: "Teddy", type: "GAME_SHOW" },
  { a: "Melkam", b: "Bling", type: "GAME_SHOW" },
  { a: "Melat", b: "Yohannes", type: "GAME_SHOW" },
  { a: "Root", b: "Thomas", type: "GAME_SHOW" },
  { a: "Freyat", b: "Yayerad", type: "GAME_SHOW" },
  { a: "Etsehiwot", b: "Abey", type: "GAME_SHOW" },
  { a: "Martha", b: "Zelalem", type: "GAME_SHOW" },
  { a: "Traffic Police", b: "Taxi Drivers", type: "HOLIDAY_SPECIAL" },
];
