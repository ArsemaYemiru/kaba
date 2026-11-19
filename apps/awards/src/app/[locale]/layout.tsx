import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PhaseBanner } from "@/components/awards/phase-banner";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { DevPhaseSwitcher } from "@/components/site/dev-phase-switcher";
import { HydrationMarker } from "@/components/site/hydration-marker";
import { Analytics } from "@/components/site/analytics";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MILESTONE_TEMPLATE, upcomingMilestone } from "@/lib/phase";
import { getViewer } from "@/lib/authz";
import { devToolsEnabled } from "@/server/dev/tools";
import { getCurrentEdition } from "@/server/queries/awards";
import { getSettings } from "@/server/queries/settings";
import { SITE_URL } from "@/lib/seo";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * Public pages render completely before the first byte (no Suspense fallback →
 * reveal), so the largest paint is in the initial HTML (A-70). Status codes are
 * decided earlier by the proxy. Opting out of instant-navigation validation is
 * what allows the layout to block on request-time data.
 */
export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Site defaults from Site Settings → SEO (title, description, social image). */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const seo = settings?.seo;
  const og = seo?.ogImageId ? settings?.media[seo.ogImageId]?.url : null;
  const title = seo?.title || "Feta Awards (ፈታ)";
  const description = seo?.description || "Celebrating Ethiopia's brightest stars. Your vote decides.";
  const image = og ?? "/og/site";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · Feta Awards" },
    description,
    applicationName: "Feta Awards",
    openGraph: { type: "website", siteName: "Feta Awards", title, description, locale: "en_US", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export const viewport: Viewport = { themeColor: "#0A0A0C", colorScheme: "dark" };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`dark ${fontVariables}`}>
      <body className="flex min-h-dvh flex-col">
        <RuntimeSite>{children}</RuntimeSite>
      </body>
    </html>
  );
}

// CMS content is read at request time (image builds need no database); the
// tagged query caches still serve later requests.
async function RuntimeSite({ children }: { children: React.ReactNode }) {
  await connection();
  const [t, tp, th, settings, edition, viewer] = await Promise.all([getTranslations("nav"), getTranslations("phase"), getTranslations("hero"), getSettings(), getCurrentEdition(), getViewer()]);
  const logo = settings.branding.logoId ? settings.media[settings.branding.logoId] : undefined;
  const next = edition ? upcomingMilestone(edition) : null;
  const votingOpen = edition?.phase === "VOTING_OPEN";
  return (
    <NextIntlClientProvider>
      <a href="#content" className="sr-only z-[200] rounded-full bg-gold px-4 py-2 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {t("skipToContent")}
      </a>
      <Header votingOpen={votingOpen} logo={logo} viewer={viewer ? { name: viewer.name, email: viewer.email, isStaff: viewer.isStaff, emailVerified: viewer.emailVerified } : null} />
      {edition && edition.phase !== "DRAFT" ? (
        <PhaseBanner
          phase={edition.phase}
          label={tp(edition.phase)}
          next={next ? { target: next.target.toISOString(), template: tp(MILESTONE_TEMPLATE[next.key], { time: "{time}" }) } : null}
          action={
            votingOpen ? (
              <Link href="/vote" className="font-semibold text-gold hover:underline">
                {th("voteNow")} →
              </Link>
            ) : edition.phase === "WINNERS_ANNOUNCED" ? (
              <Link href={`/awards/${edition.slug}/winners`} className="font-semibold text-gold hover:underline">
                {th("seeWinners")} →
              </Link>
            ) : null
          }
        />
      ) : null}
      <main id="content" className="flex-1">
        {children}
      </main>
      <HydrationMarker />
      <Analytics />
      <Footer social={settings.social} contactEmail={settings.contact.email} footerText={settings.footer.textEn} />
      {devToolsEnabled() ? <DevPhaseSwitcher current={edition?.phase} /> : null}
    </NextIntlClientProvider>
  );
}
