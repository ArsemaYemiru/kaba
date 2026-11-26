import Image from "next/image";
import { getTranslations } from "next-intl/server";
import fetaMark from "@/components/brand/feta-mark.png";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <section className="grain relative flex min-h-[70svh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      <div aria-hidden="true" className="glow-gold absolute top-1/2 left-1/2 size-[min(800px,120vw)] -translate-1/2" />
      <p aria-hidden="true" className="flex items-center gap-4 font-display text-[clamp(4rem,14vw,9rem)] leading-none font-extrabold text-foreground">
        4
        <span className="inline-flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-gold/60 bg-bg shadow-[0_0_28px_-4px_rgba(222,196,38,0.5)] sm:size-24">
          <Image src={fetaMark} alt="" sizes="64px" className="h-12 w-auto mix-blend-lighten sm:h-14" />
        </span>
        4
      </p>
      <h1 className="mt-8 font-display text-h2 font-bold">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("notFoundBody")}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </section>
  );
}
