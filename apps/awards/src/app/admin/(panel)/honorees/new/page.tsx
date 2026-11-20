import type { Metadata } from "next";
import { HonoreeForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { categoryOptions, honoreeToForm } from "@/server/admin/awards-loaders";
import { artistOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New honoree" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewHonoreePage(props: PageProps<"/admin/honorees/new">) {
  return (
    <Suspense fallback={<Loading />}>
      <NewHonoreePageContent {...props} />
    </Suspense>
  );
}

async function NewHonoreePageContent({ searchParams }: PageProps<"/admin/honorees/new">) {
  await requireUser();
  const { category, artist } = await searchParams;
  const [categories, artists] = await Promise.all([categoryOptions(), artistOptions()]);
  const initial = honoreeToForm(null, typeof category === "string" ? category : categories[0]?.id, typeof artist === "string" ? artist : undefined);
  return <HonoreeForm id={null} initial={initial} media={[]} categories={categories} artists={artists} liveHref={null} />;
}
