import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { HydrationMarker } from "@/components/site/hydration-marker";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/server/queries/settings";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Feta Show (ፈታ)", template: "%s · Feta Show" },
  description: "Ethiopia's celebrity game show. Two stars. One stage.",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0C",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("nav"), getSettings()]);

  return (
    <html lang={locale} className={`dark ${fontVariables}`}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a
            href="#content"
            className="sr-only z-[200] rounded-full bg-gold px-4 py-2 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            {t("skipToContent")}
          </a>
          <Header />
          <main id="content" className="flex-1">
            {children}
          </main>
          <HydrationMarker />
          <Footer social={settings.social} broadcastLine={settings.footer.broadcastLine} footerText={settings.footer.textEn} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
