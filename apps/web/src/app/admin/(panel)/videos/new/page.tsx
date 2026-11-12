import type { Metadata } from "next";
import { VideoForm } from "@/components/admin/modules/content-forms";
import { requireUser } from "@/lib/authz";
import { videoToForm } from "@/server/admin/form-values";
import { artistOptions, episodeOptions } from "@/server/admin/loaders";

export const metadata: Metadata = { title: "New video" };

export default async function NewVideoPage() {
  await requireUser();
  const [episodes, artists] = await Promise.all([episodeOptions(), artistOptions()]);
  return <VideoForm id={null} initial={videoToForm(null)} media={[]} episodes={episodes} artists={artists} />;
}
