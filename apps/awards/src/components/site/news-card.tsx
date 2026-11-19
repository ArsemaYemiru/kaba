import { Newspaper } from "lucide-react";
import { Chip } from "@/components/brand/chip";
import { Link } from "@/i18n/navigation";
import { gradientFor } from "@/lib/gradient";
import { formatEat } from "@/lib/time";
import type { MediaLite } from "@/server/queries/media";
import { MediaImage } from "./media-image";

export type NewsCardData = {
  slug: string;
  titleEn: string;
  excerptEn: string | null;
  publishedAt: Date | null;
  isSample: boolean;
  cover: MediaLite | null;
  edition: { year: number; status: string } | null;
};

export function NewsCard({ post, editionLabel, sampleLabel }: { post: NewsCardData; editionLabel?: string; sampleLabel: string }) {
  return (
    <Link href={`/news/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-gold/60">
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        {post.cover ? (
          <MediaImage media={post.cover} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={{ background: gradientFor(post.titleEn).css }}>
            <Newspaper className="size-10 text-white/40" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatEat(post.publishedAt, "en-GB", { dateStyle: "medium" })}</time> : null}
          {editionLabel ? <Chip size="sm">{editionLabel}</Chip> : null}
          {post.isSample ? <Chip size="sm" variant="sample">{sampleLabel}</Chip> : null}
        </div>
        <h3 className="font-display text-lg leading-snug font-bold text-balance group-hover:text-gold">{post.titleEn}</h3>
        {post.excerptEn ? <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerptEn}</p> : null}
      </div>
    </Link>
  );
}
