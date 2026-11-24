import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { shareImage } from "@/lib/seo";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { TibebStrip } from "@/components/brand/tibeb";
import { MediaImage } from "@/components/site/media-image";
import { ShareButtons } from "@/components/site/share-buttons";
import { Link } from "@/i18n/navigation";
import { getNewsPost } from "@/server/queries/news";
import { JsonLd } from "@/components/site/json-ld";
import { newsLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const p = await getNewsPost(slug);
  return p ? { title: p.titleEn, description: p.excerptEn ?? undefined, alternates: { canonical: `/news/${slug}` }, ...shareImage(`/og/news/${slug}`, p.titleEn), openGraph: { type: "article", publishedTime: p.publishedAt?.toISOString(), images: [{ url: `/og/news/${slug}`, width: 1200, height: 630, alt: p.titleEn }] } } : {};
}


export default async function NewsPostPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getNewsPost(slug);
  if (!post) notFound();
  const [t, tc, format] = await Promise.all([getTranslations("news"), getTranslations("common"), getFormatter()]);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"}/news/${slug}`;

  return (
    <article>
      <JsonLd data={newsLd({ slug, titleEn: post.titleEn, excerptEn: post.excerptEn, publishedAt: post.publishedAt, updatedAt: post.updatedAt, coverUrl: post.cover?.url, author: post.author?.name })} />
      <header className="grain relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="glow-gold absolute -top-1/2 left-1/2 size-[min(900px,140vw)] -translate-x-1/2" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 pt-8 pb-10 sm:px-6">
          <Link href="/news" className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> {t("backToNews")}
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{format.dateTime(post.publishedAt, { dateStyle: "long", timeZone: "Africa/Addis_Ababa" })}</time> : null}
            {post.edition?.status === "PUBLISHED" ? (
              <Link href={`/awards/${post.edition.slug}`}>
                <Chip size="sm">{t("edition", { year: post.edition.year })}</Chip>
              </Link>
            ) : null}
            
            {post.tags.map((tag) => (
              <Chip key={tag} size="sm" variant="muted">
                {tag}
              </Chip>
            ))}
          </div>
          <h1 className="mt-3 font-display text-h1 font-extrabold text-balance">{post.titleEn}</h1>
          {post.titleAm ? (
            <p lang="am" className="mt-2 text-xl font-bold text-gold">
              {post.titleAm}
            </p>
          ) : null}
          {post.excerptEn ? <p className="mt-4 text-lg text-pretty text-muted-foreground">{post.excerptEn}</p> : null}
        </div>
        <TibebStrip height={6} fade className="absolute inset-x-0 bottom-0 opacity-60" />
      </header>
      {post.cover ? (
        <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-line">
            <MediaImage media={post.cover} sizes="(min-width: 1024px) 1024px, 100vw" fill priority />
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="prose-feta" dangerouslySetInnerHTML={{ __html: post.bodyEn }} />
        {post.bodyAm ? <div lang="am" className="prose-feta mt-10 border-t border-line pt-10" dangerouslySetInnerHTML={{ __html: post.bodyAm }} /> : null}
        <div className="mt-12 border-t border-line pt-6">
          <ShareButtons url={url} title={post.titleEn} labels={{ share: tc("share"), copy: tc("copyLink"), copied: tc("copied") }} />
        </div>
      </div>
    </article>
  );
}
