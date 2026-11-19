import { getTranslations } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { Link } from "@/i18n/navigation";
import { TrophyBadge } from "./gold-foil";

type Nomination = {
  slug: string;
  displayNameEn: string;
  workTitleEn: string | null;
  isWinner: boolean;
  isSample: boolean;
  category: { slug: string; nameEn: string; nameAm: string | null; edition: { slug: string; year: number } };
};

/** An artist's Feta Awards nominations and wins (winner flags already masked until announced). */
export async function NominationList({ nominations }: { nominations: Nomination[] }) {
  const [t, tn] = await Promise.all([getTranslations("artists"), getTranslations("nominee")]);
  return (
    <ul className="max-w-3xl divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {nominations.map((n) => (
        <li key={n.slug}>
          <Link href={`/nominees/${n.slug}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2">
            {n.isWinner ? <TrophyBadge size="sm" label={tn("winner")} /> : <span className="w-12 shrink-0 font-display text-sm font-bold text-gold tabular-nums">{n.category.edition.year}</span>}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{n.workTitleEn ?? n.displayNameEn}</span>
              <span className="block text-sm text-muted-foreground">{t("nominatedFor", { category: n.category.nameEn, year: n.category.edition.year })}</span>
            </span>
            {n.isWinner ? <Chip size="sm" variant="foil">{tn("winner")}</Chip> : null}
            {n.isSample ? <Chip size="sm" variant="sample">{tn("sample")}</Chip> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
