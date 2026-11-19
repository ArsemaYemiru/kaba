"use client";

import NextLink from "next/link";
import { ListChecks, LogOut, Shield, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/server/actions/auth";

export type MenuViewer = { name: string; email: string; isStaff: boolean; emailVerified: boolean };

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** Avatar menu (spec §4 header): My ballot · Account · Admin (staff only) · Sign out. */
export function AccountMenu({ viewer }: { viewer: MenuViewer }) {
  const t = useTranslations("nav");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${t("accountMenu")} (${initials(viewer.name)})`} className="relative hidden rounded-full sm:inline-flex">
          <span className="flex size-9 items-center justify-center rounded-full bg-gold font-display text-sm font-extrabold text-bg">{initials(viewer.name)}</span>
          {!viewer.emailVerified ? <span aria-hidden="true" className="absolute top-0.5 right-0.5 size-2.5 rounded-full border-2 border-bg bg-red" /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 border-line bg-surface">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-semibold">{viewer.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{viewer.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/ballot">
            <ListChecks /> {t("myBallot")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound /> {t("account")}
          </Link>
        </DropdownMenuItem>
        {viewer.isStaff ? (
          <DropdownMenuItem asChild>
            <NextLink href="/admin">
              <Shield /> {t("admin")}
            </NextLink>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> {t("signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
