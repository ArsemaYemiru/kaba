import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ComingSoon } from "@/components/brand/coming-soon";
import { FilterChips } from "@/components/site/filter-chips";
import { PageHeader } from "@/components/site/section-heading";
import { VideoGrid } from "@/components/site/video-grid";
import { listVideos, VIDEO_TYPES, VideoFiltersSchema } from "@/server/queries/videos";

export const metadata: Metadata = {
  title: "Videos",
  description: "Full episodes, highlights, performances, behind the scenes and interviews from Feta.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage({ params, searchParams }: PageProps<"/[locale]/videos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("videos");
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <Suspense fallback={<div className="h-96" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[locale]/videos">["searchParams"] }) {
  const raw = await searchParams;
  const { type } = VideoFiltersSchema.parse({ type: Array.isArray(raw.type) ? raw.type[0] : raw.type });
  const [t, videos] = await Promise.all([getTranslations("videos"), listVideos(type)]);
  return (
    <>
      <FilterChips
        label={t("title")}
        items={[
          { label: t("all"), href: "/videos", active: !type },
          ...VIDEO_TYPES.map((ty) => ({ label: t(`types.${ty}`), href: `/videos?type=${ty}`, active: type === ty })),
        ]}
      />
      {videos.length ? (
        <VideoGrid videos={videos} className="mt-8" />
      ) : (
        <ComingSoon className="mt-8" variant="compact" title={t("empty")} />
      )}
    </>
  );
}
