import type { Prisma } from "@/generated/prisma/client";

/** Fields every public image needs. */
export const mediaSelect = {
  id: true,
  type: true,
  url: true,
  alt: true,
  width: true,
  height: true,
  blurDataUrl: true,
  caption: true,
  credit: true,
  mimeType: true,
} satisfies Prisma.MediaSelect;

export type MediaLite = Prisma.MediaGetPayload<{ select: typeof mediaSelect }>;
