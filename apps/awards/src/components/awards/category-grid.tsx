import { getLocale, getTranslations } from "next-intl/server";
import type { CategoryData } from "@/server/queries/awards";
import { CategoryCard } from "./category-card";

/** The genre categories of an edition, with honoree counts. */
export async function CategoryGrid({ editionSlug, categories }: { editionSlug: string; categories: CategoryData[] }) {
  const [tc, locale] = await Promise.all([getTranslations("category"), getLocale()]);
  const am = locale === "am";
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <li key={c.id}>
          <CategoryCard
            name={(am && c.nameAm) || c.nameEn}
            nameAm={am ? null : c.nameAm}
            icon={c.icon}
            description={(am && c.descriptionAm) || c.descriptionEn}
            honoreeCountLabel={tc("honorees", { count: c._count.nominees })}
            href={`/awards/${editionSlug}/${c.slug}`}
          />
        </li>
      ))}
    </ul>
  );
}
