import { getLocale, getTranslations } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { Link } from "@/i18n/navigation";

type Recognition = {
  slug: string;
  workTitleEn: string | null;
  workTitleAm: string | null;
  blurbEn: string | null;
  blurbAm: string | null;
  isSample: boolean;
  category: { slug: string; nameEn: string; nameAm: string | null; edition: { slug: string; year: number } };
};

/** An artist's Feta Awards recognitions: edition year → genre → citation (A-76). */
export async function RecognitionList({ recognitions }: { recognitions: Recognition[] }) {
  const [t, locale] = await Promise.all([getTranslations("honoree"), getLocale()]);
  const am = locale === "am";
  return (
    <ul className="max-w-3xl divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {recognitions.map((r) => {
        const genre = (am && r.category.nameAm) || r.category.nameEn;
        const work = (am && r.workTitleAm) || r.workTitleEn;
        const citation = (am && r.blurbAm) || r.blurbEn;
        return (
          <li key={r.slug}>
            <Link href={`/honorees/${r.slug}`} className="flex items-start gap-4 px-5 py-4 hover:bg-surface-2">
              <span className="w-12 shrink-0 pt-0.5 font-display text-sm font-bold text-gold tabular-nums">{r.category.edition.year}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t("recognizedIn", { genre, year: r.category.edition.year })}</span>
                {work ? <span className="block text-sm text-foreground/90">{t("featuredWork", { work })}</span> : null}
                {citation ? <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{citation}</span> : null}
              </span>
              {r.isSample ? <Chip size="sm" variant="sample">{t("sample")}</Chip> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
