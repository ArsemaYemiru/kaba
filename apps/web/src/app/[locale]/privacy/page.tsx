import { connection } from "next/server";
import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/site/section-heading";
import { getSettings } from "@/server/queries/settings";

export const metadata: Metadata = { title: "Privacy", alternates: { canonical: "/privacy" }, robots: { index: true } };

/** Placeholder policy (spec §4.9): must be reviewed by the client's legal adviser before launch. */
export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("privacy"), getSettings()]);
  const contact = settings.contact.email;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p role="note" className="flex items-start gap-3 rounded-md border border-gold/50 bg-gold/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
          {t("draftNotice")}
        </p>
        <div className="prose-feta mt-8">
          <h2>What we collect</h2>
          <p>When you use a form on the Join page, we collect the details you enter:</p>
          <ul>
            <li><strong>Be a contestant:</strong> your name, phone number, email, city, what you do, any social or video links you share, and your answer to “Why you?”.</li>
            <li><strong>Studio audience:</strong> your name, phone number, preferred date and group size.</li>
            <li><strong>Sponsorship / business:</strong> your company, contact name, phone number, email and message.</li>
          </ul>
          <p>
            To protect the forms from abuse we also keep a one-way hash of your IP address. We do not store your IP address itself.
          </p>
          <h2>How we use it</h2>
          <p>We use these details only to review and respond to your request: to consider you as a contestant, arrange studio audience places, or discuss a partnership.</p>
          <h2>Who can see it</h2>
          <p>Submissions are visible only to authorised members of the Feta Show team through a password-protected admin area.</p>
          <h2>How long we keep it</h2>
          <p>We keep submissions only as long as needed for the purpose above. The retention period will be confirmed in the final policy.</p>
          <h2>Cookies</h2>
          <p>The public site does not set advertising cookies. Videos from YouTube load only after you press play.</p>
          <h2>Your choices</h2>
          <p>
            You can ask us to see, correct or delete the details you submitted
            {contact ? (
              <>
                {" "}by emailing <a href={`mailto:${contact}`}>{contact}</a>.
              </>
            ) : (
              <> by contacting the Feta Show team.</>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
