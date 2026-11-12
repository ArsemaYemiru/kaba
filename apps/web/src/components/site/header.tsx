import { getTranslations } from "next-intl/server";
import { TibebStrip } from "@/components/brand/tibeb";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/server/queries/settings";
import { CommandSearch } from "./command-search";
import { DesktopNav } from "./desktop-nav";
import { MediaImage } from "./media-image";
import { MobileMenu } from "./mobile-menu";

/** Sticky translucent header with backdrop blur (spec §3.5, §4). */
export async function Header() {
  const [t, settings] = await Promise.all([getTranslations("nav"), getSettings()]);
  const logo = settings.branding.logoId ? settings.media[settings.branding.logoId] : undefined;
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/75 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Feta Show home" className="flex shrink-0 flex-col items-center gap-1 rounded-md">
          {logo ? (
            <span className="relative block h-9 w-28">
              <MediaImage media={logo} alt="Feta Show" sizes="112px" fill priority className="object-contain" />
            </span>
          ) : (
            <Wordmark size="sm" />
          )}
          <TibebStrip height={4} className="w-full" />
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-2">
          <CommandSearch />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/join">{t("join")}</Link>
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
