"use client";

import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, use, useCallback, useOptimistic, useRef, useState, useTransition } from "react";
import { Turnstile } from "@/components/auth/turnstile";
import { ShareButtons } from "@/components/site/share-buttons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { openBallotSession, vote } from "@/server/actions/vote";
import type { CastResult } from "@/server/voting/cast";

type Meta = { name: string; categoryName: string; href: string };
type Ctx = {
  picks: Record<string, string>;
  pending: string | null;
  cast: (categoryId: string, nomineeId: string, meta: Meta) => Promise<CastResult | null>;
};

const BallotContext = createContext<Ctx | null>(null);
export const useBallot = () => use(BallotContext);

/**
 * Member ballot state on a page (spec §5.2/§3.5): optimistic picks, the
 * Turnstile → ballot session step, errors, and the share sheet after a vote.
 * The server is the source of truth; the page refreshes after each vote.
 */
export function BallotProvider({ initialPicks, siteKey, siteUrl, year, children }: { initialPicks: Record<string, string>; siteKey: string | null; siteUrl: string; year: number; children: React.ReactNode }) {
  const t = useTranslations("voting");
  const tc = useTranslations("common");
  const router = useRouter();
  const [picks, setOptimistic] = useOptimistic(initialPicks, (state, p: { categoryId: string; nomineeId: string }) => ({ ...state, [p.categoryId]: p.nomineeId }));
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<Meta | null>(null);
  const [check, setCheck] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  const sessionOpened = useRef(false);

  const securityCheck = useCallback(async (): Promise<boolean> => {
    if (!siteKey) return (await openBallotSession("")).ok; // Turnstile bypassed (test environments only)
    return new Promise<boolean>((resolve) => setCheck({ resolve }));
  }, [siteKey]);

  const cast = useCallback(
    (categoryId: string, nomineeId: string, meta: Meta) =>
      new Promise<CastResult | null>((done) => {
        setError(null);
        setPending(nomineeId);
        startTransition(async () => {
          setOptimistic({ categoryId, nomineeId });
          let result = await vote(categoryId, nomineeId);
          if (!result.ok && result.reason === "BALLOT_SESSION") {
            const passed = await securityCheck();
            sessionOpened.current = passed;
            result = passed ? await vote(categoryId, nomineeId) : result;
          }
          setPending(null);
          if (result.ok) {
            if (result.status !== "unchanged") setShared(meta);
            router.refresh();
          } else {
            setError(t(`errors.${result.reason}`));
          }
          done(result);
        });
      }),
    [router, securityCheck, setOptimistic, t],
  );

  return (
    <BallotContext value={{ picks, pending, cast }}>
      {children}
      <p role="alert" aria-live="assertive" className="sr-only">
        {error ?? ""}
      </p>
      {error ? (
        <div className="fixed inset-x-0 bottom-4 z-[90] mx-auto flex w-[min(32rem,calc(100%-2rem))] items-start gap-3 rounded-xl border border-red/60 bg-surface p-4 shadow-2xl">
          <p className="flex-1 text-sm">{error}</p>
          <button type="button" onClick={() => setError(null)} aria-label={tc("close")} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : shared ? (
        <section aria-label={t("shareTitle")} className="fixed inset-x-0 bottom-4 z-[90] mx-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-gold/60 bg-surface p-4 shadow-[0_20px_60px_-20px_rgba(255,184,0,0.5)]">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-bg">
              <Check className="size-5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p role="status" className="font-semibold">
                {t("voted", { name: shared.name, category: shared.categoryName })}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("changeHint")}</p>
            </div>
            <button type="button" onClick={() => setShared(null)} aria-label={tc("close")} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3">
            <ShareButtons url={`${siteUrl}${shared.href}`} title={t("shareText", { name: shared.name, category: shared.categoryName, year })} labels={{ share: t("shareTitle"), copy: tc("copyLink"), copied: tc("copied") }} />
          </div>
        </section>
      ) : null}
      <Dialog
        open={!!check}
        onOpenChange={(o) => {
          if (!o && check) {
            check.resolve(false);
            setCheck(null);
          }
        }}
      >
        <DialogContent className="border-line bg-surface sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <ShieldCheck className="size-5 text-gold" aria-hidden="true" /> {t("checkTitle")}
          </DialogTitle>
          <DialogDescription>{t("checkBody")}</DialogDescription>
          {check ? (
            <Turnstile
              siteKey={siteKey}
              label={t("checkTitle")}
              onToken={async (token) => {
                const r = await openBallotSession(token);
                check.resolve(r.ok);
                setCheck(null);
              }}
            />
          ) : null}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> {t("checkWaiting")}
          </p>
        </DialogContent>
      </Dialog>
    </BallotContext>
  );
}
