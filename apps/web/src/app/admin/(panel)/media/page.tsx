import type { Metadata } from "next";
import { ListPagination } from "@/components/admin/list-pagination";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { MediaLibrary } from "@/components/admin/media-library";
import { AdminPage } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";
import { PAGE_SIZE } from "@/lib/admin-list";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { mediaUsages } from "@/server/admin/media-usage";
import { mediaSelect } from "@/server/queries/media";

export const metadata: Metadata = { title: "Media Library" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireUser();
  const raw = await searchParams;
  const one = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);
  const q = one("q")?.slice(0, 100);
  const type = one("type") === "IMAGE" || one("type") === "VIDEO" ? (one("type") as "IMAGE" | "VIDEO") : undefined;
  const tag = one("tag")?.slice(0, 40);
  const missingAlt = one("alt") === "missing";
  const page = Math.max(1, Number(one("page")) || 1);
  const pageSize = PAGE_SIZE * 2;

  const where: Prisma.MediaWhereInput = {
    ...(type ? { type } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(missingAlt ? { type: "IMAGE", alt: "" } : {}),
    ...(q ? { OR: [{ alt: { contains: q, mode: "insensitive" } }, { caption: { contains: q, mode: "insensitive" } }, { credit: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total, tagRows] = await Promise.all([
    prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { ...mediaSelect, tags: true, sizeBytes: true, createdAt: true } }),
    prisma.media.count({ where }),
    prisma.$queryRaw<{ tag: string }[]>`SELECT DISTINCT unnest("tags") AS tag FROM "Media" ORDER BY tag`,
  ]);
  const usage = await mediaUsages(rows.map((r) => r.id));
  const env = getEnv();

  return (
    <AdminPage title="Media Library" description="Images are converted to WebP with metadata stripped. Alt text is required for images.">
      <ListToolbar
        withStatus={false}
        searchPlaceholder="Search alt text, caption, credit…"
        filters={[
          { param: "type", label: "Type", options: [{ value: "IMAGE", label: "Images" }, { value: "VIDEO", label: "Videos" }] },
          { param: "tag", label: "Tag", options: tagRows.map((t) => ({ value: t.tag, label: t.tag })) },
          { param: "alt", label: "Alt text", options: [{ value: "missing", label: "Missing" }] },
        ]}
      />
      <MediaLibrary items={rows.map((r) => ({ ...r, usageCount: usage.get(r.id)?.length ?? 0 }))} maxImageMb={env.UPLOAD_MAX_IMAGE_MB} maxVideoMb={env.UPLOAD_MAX_VIDEO_MB} />
      <ListPagination basePath="/admin/media" params={raw} page={page} total={total} pageSize={pageSize} />
    </AdminPage>
  );
}
