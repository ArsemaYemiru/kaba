import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "./section-heading";

/**
 * Long-form page from Site Settings (About/Rules/Privacy/Terms). Bodies are
 * sanitized HTML (seed now, the admin sanitizer in Phase 6). Template text
 * carries a review notice until staff edit it (A-37).
 */
export async function CmsPage({ title, kicker, page, children }: { title: string; kicker?: string; page: { bodyEn: string; bodyAm?: string; isTemplate: boolean }; children?: React.ReactNode }) {
  const t = await getTranslations("legal");
  return (
    <>
      <PageHeader kicker={kicker} title={title} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {page.isTemplate ? (
          <p role="note" className="flex items-start gap-3 rounded-md border border-gold/50 bg-gold/10 px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
            {t("templateNotice")}
          </p>
        ) : null}
        {page.bodyEn ? <div className="prose-feta mt-8" dangerouslySetInnerHTML={{ __html: page.bodyEn }} /> : null}
        {page.bodyAm ? <div lang="am" className="prose-feta mt-10 border-t border-line pt-10" dangerouslySetInnerHTML={{ __html: page.bodyAm }} /> : null}
        {children}
      </div>
    </>
  );
}
