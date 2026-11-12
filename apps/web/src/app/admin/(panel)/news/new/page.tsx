import type { Metadata } from "next";
import { NewsForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { newsToForm } from "@/server/admin/form-values";

export const metadata: Metadata = { title: "New post" };

export default async function NewNewsPage() {
  await requireUser();
  return <NewsForm id={null} initial={newsToForm(null)} media={[]} liveSlug={null} />;
}
