import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { ComingSoon } from "@/components/brand/coming-soon";
import { Reveal } from "@/components/brand/reveal";
import { MediaImage } from "@/components/site/media-image";
import { PageHeader } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { gradientFor } from "@/lib/gradient";
import { listNews } from "@/server/queries/news";

export const metadata: Metadata = { title: "News", description: "The latest from Feta.", alternates: { canonical: "/news" } };

export default async function NewsPage({ params }: PageProps<"/[locale]/news">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, format, posts] = await Promise.all([getTranslations("news"), getFormatter(), listNews()]);
  return (
    <>
      <PageHeader title={t("title")} intro={t("intro")} />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {posts.length ? (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <li key={p.slug} className={i === 0 && p.featured ? "md:col-span-2 lg:col-span-3" : undefined}>
                <Reveal index={i}>
                  <Link
                    href={`/news/${p.slug}`}
                    className={`group grid overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-gold/60 ${i === 0 && p.featured ? "md:grid-cols-2" : ""}`}
                  >
                    <div className="relative aspect-video overflow-hidden" style={p.cover ? undefined : { background: gradientFor(p.titleEn).css }}>
                      {p.cover ? (
                        <MediaImage media={p.cover} alt="" sizes="(min-width: 768px) 50vw, 100vw" fill priority={i === 0} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                      ) : (
                        <span aria-hidden="true" lang="am" className="absolute inset-0 flex items-center justify-center font-ethiopic text-8xl font-black text-white/10">
                          ፈታ
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col p-6">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {p.publishedAt ? <time dateTime={p.publishedAt.toISOString()}>{format.dateTime(p.publishedAt, { dateStyle: "long" })}</time> : null}
                        {p.tags.slice(0, 2).map((tag) => (
                          <Chip key={tag} size="sm" variant="muted">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                      <h2 className="mt-3 font-display text-xl leading-snug font-bold text-balance group-hover:text-gold">{p.titleEn}</h2>
                      {p.excerptEn ? <p className="mt-2 text-sm text-pretty text-muted-foreground">{p.excerptEn}</p> : null}
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <ComingSoon variant="panel" title={t("empty")} />
        )}
      </div>
    </>
  );
}
