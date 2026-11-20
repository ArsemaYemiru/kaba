import { TibebStrip } from "@/components/brand/tibeb";
import { Wordmark } from "@/components/brand/wordmark";
import { Link } from "@/i18n/navigation";
import type { MediaLite } from "@/server/queries/media";
import { CommandSearch } from "./command-search";
import { DesktopNav } from "./desktop-nav";
import { MediaImage } from "./media-image";
import { MobileMenu } from "./mobile-menu";

/** Sticky translucent header (spec §4). No public accounts (A-77): staff sign in at /admin. */
export function Header({ logo }: { logo?: MediaLite }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/75 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 flex-col items-center gap-1 rounded-md">
          {logo ? (
            <span className="relative block h-9 w-28">
              <MediaImage media={logo} alt="Feta Awards" sizes="112px" fill priority className="object-contain" />
            </span>
          ) : (
            <Wordmark size="sm" />
          )}
          <TibebStrip height={4} className="w-full" />
          {/* Name = visible wordmark + "home" (WCAG 2.5.3 label in name). */}
          <span className="sr-only">home</span>
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-2">
          <CommandSearch />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
