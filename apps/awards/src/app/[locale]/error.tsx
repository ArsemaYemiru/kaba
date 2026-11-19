"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <section className="grain relative flex min-h-[70svh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      <div aria-hidden="true" className="glow-red absolute top-1/2 left-1/2 size-[min(700px,110vw)] -translate-1/2 opacity-60" />
      <h1 className="font-display text-h1 font-bold">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("errorBody")}</p>
      <Button size="lg" className="mt-8" onClick={() => reset()}>
        {t("tryAgain")}
      </Button>
    </section>
  );
}
