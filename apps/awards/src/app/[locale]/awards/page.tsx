import { connection } from "next/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentEdition } from "@/server/queries/awards";


/** /awards → the current edition (or the archive when none is published). */
export default async function AwardsIndex({ params }: PageProps<"/[locale]/awards">) {
  await connection();
  const { locale } = await params;
  const edition = await getCurrentEdition();
  redirect({ href: edition ? `/awards/${edition.slug}` : "/awards/archive", locale });
  return null; // unreachable: redirect() throws (the proxy normally answers first with a 307)
}
