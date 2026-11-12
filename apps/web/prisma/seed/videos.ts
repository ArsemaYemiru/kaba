import type { VideoType } from "../../src/generated/prisma/enums";

/** §8.5: PUBLISHED, source NONE (coming-soon state until a link/upload is added). */
export const VIDEOS: { title: string; type: VideoType; artists?: string[]; episode?: string }[] = [
  { title: "Lij Michael & Fantu Mandoye on Feta", type: "HIGHLIGHT", artists: ["Lij Michael", "Fantu Mandoye"] },
  { title: "SOH Dance Crew: hip-hop dance on Feta", type: "PERFORMANCE" },
  { title: "Sehar Abdulkerim performs 'Panda'", type: "PERFORMANCE", artists: ["Sehar Abdulkerim"] },
  { title: "Lij Michael vs Hanan Tarik: final round", type: "HIGHLIGHT", episode: "Lij Michael vs Hanan Tarik" },
  { title: "Traffic Police vs Taxi Drivers: holiday special", type: "FULL_EPISODE", episode: "Traffic Police vs Taxi Drivers" },
];
