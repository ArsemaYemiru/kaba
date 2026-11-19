import { connection } from "next/server";
import { ogCard } from "@/server/og/render";
import { getSettings } from "@/server/queries/settings";

/** Default site share image. */
export async function GET() {
  await connection();
  const s = await getSettings();
  return ogCard({ kicker: "Ethiopia's brightest stars", title: "Feta Awards", titleAm: "ፈታ", subtitle: s.hero.taglineEn, fallback: "ፈታ" });
}
