import { connection } from "next/server";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Reveal } from "@/components/brand/reveal";
import { MediaImage } from "@/components/site/media-image";
import { PageHeader } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { listAlbums } from "@/server/queries/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from the Feta studio.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage({ params }: PageProps<"/[locale]/gallery">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, albums] = await Promise.all([getTranslations("gallery"), listAlbums()]);
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {albums.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((al, i) => {
              const cover = al.cover ?? al.items[0]?.media;
              return (
                <li key={al.slug}>
                  <Reveal index={i}>
                    <Link
                      href={`/gallery/${al.slug}`}
                      className="group block overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_18px_50px_-20px_rgba(255,184,0,0.45)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                        {cover ? (
                          <MediaImage media={cover} alt="" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" fill priority={i < 3} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                        ) : null}
                        <div className="absolute inset-0 bg-linear-to-t from-bg/80 via-transparent to-transparent" />
                        <span className="absolute bottom-3 left-3 rounded-full bg-bg/70 px-3 py-1 text-xs font-semibold backdrop-blur">
                          {t("photos", { count: al._count.items })}
                        </span>
                      </div>
                      <div className="p-5">
                        <h2 className="font-display text-lg font-bold">{al.titleEn}</h2>
                        {al.titleAm ? (
                          <p lang="am" className="text-sm text-muted-foreground">
                            {al.titleAm}
                          </p>
                        ) : null}
                        {al.descriptionEn ? <p className="mt-2 text-sm text-muted-foreground">{al.descriptionEn}</p> : null}
                      </div>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        ) : (
          <ComingSoon variant="panel" title={t("empty")} />
        )}
      </div>
    </>
  );
}
