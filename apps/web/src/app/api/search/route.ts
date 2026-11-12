import { searchIndex } from "@/server/queries/search";

/** Command-palette index (public, published content only). */
export async function GET() {
  const items = await searchIndex();
  return Response.json(items, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
}
