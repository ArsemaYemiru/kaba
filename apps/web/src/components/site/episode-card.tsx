import { getTranslations } from "next-intl/server";
import { VsCard } from "@/components/brand/vs-card";
import { vsContestants } from "@/lib/episode-display";
import type { EpisodeCardData } from "@/server/queries/episodes";

/** Maps an episode row to the VS Card. */
export async function EpisodeCard({
  episode,
  size = "md",
  priority,
  className,
}: {
  episode: EpisodeCardData;
  size?: "mini" | "md" | "lg";
  priority?: boolean;
  className?: string;
}) {
  const t = await getTranslations("episode");
  const { a, b } = vsContestants(episode);
  return (
    <VsCard
      a={a}
      b={b}
      title={episode.titleEn}
      typeLabel={t(`types.${episode.type}`)}
      seasonLabel={episode.season ? t("season", { season: episode.season }) : undefined}
      href={`/episodes/${episode.slug}`}
      size={size}
      priority={priority}
      className={className}
    />
  );
}
