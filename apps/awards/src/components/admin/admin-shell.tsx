import { ExternalLink, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { TibebStrip } from "@/components/brand/tibeb";
import { Wordmark } from "@/components/brand/wordmark";
import { signOut } from "@/server/actions/auth";

/** Minimal admin frame for Phase 4; Phase 6 adds the full CMS navigation. */
export function AdminShell({ user, children }: { user?: { name: string; role: string } | null; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <Wordmark size="sm" />
            <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[0.625rem] font-bold tracking-[0.2em] text-gold uppercase">Admin</span>
          </Link>
          {user ? (
            <nav aria-label="Admin" className="flex items-center gap-1 text-sm">
              <Link href="/admin" className="hidden items-center gap-1.5 rounded-md px-3 py-2 hover:bg-surface-2 sm:inline-flex">
                <LayoutDashboard className="size-4" aria-hidden="true" /> Dashboard
              </Link>
              <Link href="/admin/security" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-surface-2">
                <ShieldCheck className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Security</span>
              </Link>
              <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-surface-2">
                <ExternalLink className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">View site</span>
              </Link>
              <form action={signOut}>
                <button type="submit" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-surface-2" aria-label="Sign out">
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </form>
            </nav>
          ) : null}
        </div>
        <TibebStrip height={4} />
      </header>
      <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {user ? (
          <p className="mb-6 text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{user.name}</span> · {user.role === "SUPER_ADMIN" ? "Super admin" : "Editor"}
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
