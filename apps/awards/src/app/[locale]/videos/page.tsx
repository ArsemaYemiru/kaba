import { connection } from "next/server";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { FilterChips } from "@/components/site/filter-chips";
import { PageHeader } from "@/components/site/section-heading";
import { VideoGrid } from "@/components/site/video-grid";
import { listEditions } from "@/server/queries/awards";
import { listVideos, VIDEO_TYPES, VideoFiltersSchema } from "@/server/queries/videos";
import { withParams } from "@/components/site/filter-chips";

export const metadata: Metadata = {
  title: "Videos",
  description: "Awards night, red carpet, performances, acceptance speeches and interviews from Feta Awards.",
  alternates: { canonical: "/videos" },
};


export default async function VideosPage({ params, searchParams }: PageProps<"/[locale]/videos">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("videos");
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <Results searchParams={searchParams} />
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/[locale]/videos">["searchParams"] }) {
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const { type, edition } = VideoFiltersSchema.parse({ type: one("type"), edition: one("edition") });
  const [t, videos, editions] = await Promise.all([getTranslations("videos"), listVideos(type, edition), listEditions()]);
  const current = { type, edition };
  return (
    <>
      <FilterChips
        label={t("filterType")}
        items={[
          { label: t("all"), href: withParams("/videos", current, { type: undefined }), active: !type },
          ...VIDEO_TYPES.map((ty) => ({ label: t(`types.${ty}`), href: withParams("/videos", current, { type: ty }), active: type === ty })),
        ]}
      />
      {editions.length > 1 ? (
        <div className="mt-3">
        <FilterChips
          label={t("filterEdition")}
          items={[
            { label: t("allEditions"), href: withParams("/videos", current, { edition: undefined }), active: !edition },
            ...editions.map((e) => ({ label: String(e.year), href: withParams("/videos", current, { edition: e.slug }), active: edition === e.slug })),
          ]}
        />
        </div>
      ) : null}
      {videos.length ? (
        <VideoGrid videos={videos} className="mt-8" />
      ) : (
        <ComingSoon className="mt-8" variant="compact" title={t("empty")} />
      )}
    </>
  );
}
