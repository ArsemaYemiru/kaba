import type { Metadata } from "next";
import { NomineeForm } from "@/components/admin/modules/awards-forms";
import { requireUser } from "@/lib/authz";
import { categoryOptions, nomineeToForm } from "@/server/admin/awards-loaders";
import { artistOptions } from "@/server/admin/loaders";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "New nominee" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function NewNomineePage(props: PageProps<"/admin/nominees/new">) {
  return (
    <Suspense fallback={<Loading />}>
      <NewNomineePageContent {...props} />
    </Suspense>
  );
}

async function NewNomineePageContent({ searchParams }: PageProps<"/admin/nominees/new">) {
  await requireUser();
  const { category } = await searchParams;
  const [categories, artists] = await Promise.all([categoryOptions(), artistOptions()]);
  return <NomineeForm id={null} initial={nomineeToForm(null, typeof category === "string" ? category : categories[0]?.id)} media={[]} categories={categories} artists={artists} liveHref={null} hasVotes={false} />;
}
