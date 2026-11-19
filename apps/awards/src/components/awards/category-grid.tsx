import { getTranslations } from "next-intl/server";
import type { CategoryData } from "@/server/queries/awards";
import { CategoryCard } from "./category-card";

/** Categories of an edition (nominee counts only, never vote counts). */
export async function CategoryGrid({ editionSlug, categories }: { editionSlug: string; categories: CategoryData[] }) {
  const [tc, tv, tn] = await Promise.all([getTranslations("category"), getTranslations("votingType"), getTranslations("nominee")]);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <li key={c.id}>
          <CategoryCard
            name={c.nameEn}
            nameAm={c.nameAm}
            icon={c.icon}
            nomineeCountLabel={tc("nominees", { count: c._count.nominees })}
            votingTypeLabel={tv(c.votingType)}
            votingType={c.votingType}
            href={`/awards/${editionSlug}/${c.slug}`}
            labels={{ voted: tc("voted"), voteNow: tc("voteNow") }}
            sample={c.isSample}
            sampleLabel={tn("sample")}
          />
        </li>
      ))}
    </ul>
  );
}
