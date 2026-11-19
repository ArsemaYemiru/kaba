import { getTranslations } from "next-intl/server";
import { nomineeNames } from "@/lib/phase";
import type { getWinners } from "@/server/queries/awards";
import { WinnerCard } from "./winner-card";

type Winners = NonNullable<Awaited<ReturnType<typeof getWinners>>>["winners"];

export async function WinnersGrid({ winners, limit }: { winners: Winners; limit?: number }) {
  const [t, tn] = await Promise.all([getTranslations("awards"), getTranslations("nominee")]);
  return (
    <ul className="grid gap-5 lg:grid-cols-2">
      {winners.slice(0, limit).map(({ category, nominee, publicShare }) => {
        const { name, nameAm, credit } = nomineeNames(nominee);
        return (
          <li key={nominee.id}>
            <WinnerCard
              category={category.nameEn}
              categoryAm={category.nameAm}
              name={name}
              nameAm={nameAm}
              credit={credit}
              type={category.nomineeType}
              imageUrl={nominee.image?.url}
              imageAlt={nominee.image?.alt}
              publicShare={publicShare}
              href={`/nominees/${nominee.slug}`}
              sample={nominee.isSample}
              labels={{ winner: tn("winner"), publicVote: t("publicVote"), sample: tn("sample") }}
            />
          </li>
        );
      })}
    </ul>
  );
}
