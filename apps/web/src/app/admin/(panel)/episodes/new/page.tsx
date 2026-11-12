import type { Metadata } from "next";
import { EpisodeForm } from "@/components/admin/modules/episode-form";
import { requireUser } from "@/lib/authz";
import { episodeToForm } from "@/server/admin/form-values";
import { artistOptions } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "New episode" };

export default async function NewEpisodePage() {
  await requireUser();
  return <EpisodeForm id={null} initial={episodeToForm(null)} media={[]} artists={await artistOptions()} publishedSlug={null} />;
}
