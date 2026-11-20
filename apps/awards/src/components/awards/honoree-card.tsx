import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { HonoreeData } from "@/server/queries/awards";
import { NomineeFallback } from "./work-fallback";

/**
 * Honoree card (A-76): an artist recognized in a genre. Portrait (the entry's
 * own image, else the artist's), name in English and Amharic, featured work
 * and the start of the citation. Every honoree in a genre is shown equally.
 */
export async function HonoreeCard({ honoree, genre, sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw", className }: { honoree: HonoreeData; genre?: string; sizes?: string; className?: string }) {
  const [t, locale] = await Promise.all([getTranslations("honoree"), getLocale()]);
  const am = locale === "am";
  const img = honoree.image ?? honoree.artist.portrait;
  const name = (am && honoree.displayNameAm) || honoree.displayNameEn;
  const subName = am ? (honoree.displayNameAm ? honoree.displayNameEn : null) : honoree.displayNameAm;
  const work = (am && honoree.workTitleAm) || honoree.workTitleEn;
  const citation = (am && honoree.blurbAm) || honoree.blurbEn;
  return (
    <article className={cn("group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,translate] duration-300 ease-out hover:-translate-y-1 hover:border-gold/60", className)}>
      <Link href={`/honorees/${honoree.slug}`} className="flex h-full flex-col focus-visible:outline-offset-[-4px]">
        <div className="relative aspect-[4/5] overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03] [&_img]:grayscale [&_img]:transition-[filter] [&_img]:duration-500 group-hover:[&_img]:grayscale-0">
            {img ? (
              <Image src={img.url} alt={img.alt || name} fill sizes={sizes} placeholder={img.blurDataUrl ? "blur" : "empty"} blurDataURL={img.blurDataUrl ?? undefined} className="object-cover" />
            ) : (
              <NomineeFallback name={name} type={honoree.artist.isGroup ? "GROUP" : "PERSON"} />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface via-surface/70 to-transparent pt-16" />
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {honoree.isSample ? <Chip size="sm" variant="sample">{t("sample")}</Chip> : null}
            {honoree.artist.isLegend ? <Chip size="sm" variant="legend">{t("legend")}</Chip> : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-4 pt-1 pb-4">
          {genre ? <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-gold uppercase">{genre}</p> : null}
          <h3 className="font-display text-base leading-tight font-bold text-balance sm:text-lg">{name}</h3>
          {subName ? (
            <p lang={am ? "en" : "am"} className="text-sm font-medium text-muted-foreground">
              {subName}
            </p>
          ) : null}
          {work ? <p className="text-sm text-foreground/90">{t("featuredWork", { work })}</p> : null}
          {citation ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{citation}</p> : null}
          <span className="mt-auto pt-3 text-sm font-semibold text-gold group-hover:underline">{t("readCitation")}</span>
        </div>
      </Link>
    </article>
  );
}
