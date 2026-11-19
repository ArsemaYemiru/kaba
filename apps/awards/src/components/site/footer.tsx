import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { TibebStrip } from "@/components/brand/tibeb";
import { Wordmark } from "@/components/brand/wordmark";
import { Link } from "@/i18n/navigation";
import { NAV_ITEMS } from "./nav-items";
import { SocialLinksRow, type SocialLinks } from "./social-icons";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Footer (spec §4.1): ፈታ watermark, tibeb strip, nav, socials, broadcast line. */
export async function Footer({
  social = {},
  contactEmail,
  footerText,
}: {
  social?: SocialLinks;
  contactEmail?: string | null;
  footerText?: string;
}) {
  const [t, tb, tf, year] = await Promise.all([
    getTranslations("nav"),
    getTranslations("brand"),
    getTranslations("footer"),
    currentYear(),
  ]);

  return (
    <footer className="cv-auto grain relative mt-24 overflow-hidden border-t border-line bg-bg">
      <TibebStrip height={12} />
      <span
        aria-hidden="true"
        lang="am"
        className="pointer-events-none absolute -bottom-[0.22em] left-1/2 -translate-x-1/2 font-ethiopic text-[clamp(12rem,38vw,30rem)] leading-none! font-black text-foreground/[0.035] select-none"
      >
        ፈታ
      </span>
      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Wordmark size="md" className="items-start" />
          <p className="mt-5 max-w-xs text-sm text-muted-foreground">{footerText ?? tb("tagline")}</p>
          {contactEmail ? (
            <p className="mt-4 text-sm">
              <span className="sr-only">{tf("contact")}: </span>
              <a href={`mailto:${contactEmail}`} className="font-semibold text-gold hover:underline">
                {contactEmail}
              </a>
            </p>
          ) : null}
        </div>
        <nav aria-label={tf("explore")}>
          <h2 className="font-display text-xs font-bold tracking-[0.3em] text-gold uppercase">{tf("explore")}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="inline-block py-1 text-muted-foreground transition-colors hover:text-foreground">
                  {t(item.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/vote" className="inline-block py-1 font-semibold text-gold hover:underline">
                {t("vote")}
              </Link>
            </li>
          </ul>
        </nav>
        <SocialBlock title={tf("followUs")} social={social} />
      </div>
      <div className="relative z-10 border-t border-line/70">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p>{tf("rights", { year })}</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5">
            {(["rules", "privacy", "terms"] as const).map((k) => (
              <Link key={k} href={`/${k}`} className="py-1 hover:text-foreground">
                {t(k)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function SocialBlock({ title, social }: { title: string; social: SocialLinks }) {
  const hasAny = Object.values(social).some(Boolean);
  if (!hasAny) return <div />;
  return (
    <div>
      <h2 className="font-display text-xs font-bold tracking-[0.3em] text-gold uppercase">{title}</h2>
      <SocialLinksRow links={social} className="mt-4" />
    </div>
  );
}
