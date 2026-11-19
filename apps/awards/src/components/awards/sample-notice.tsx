import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Chip } from "@/components/brand/chip";
import { cn } from "@/lib/utils";

/** Shown wherever fictional seed data appears (spec rule 2). */
export async function SampleNotice({ className }: { className?: string }) {
  const t = await getTranslations("common");
  return (
    <p className={cn("flex flex-wrap items-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-3 py-2 text-xs text-muted-foreground", className)}>
      <Chip size="sm" variant="sample">
        <FlaskConical className="size-3" aria-hidden="true" /> {t("sample")}
      </Chip>
      {t("sampleNotice")}
    </p>
  );
}
