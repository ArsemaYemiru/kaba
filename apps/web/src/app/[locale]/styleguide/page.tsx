import { ArrowRight, Images, PlayCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArtistCard } from "@/components/brand/artist-card";
import { Chip } from "@/components/brand/chip";
import { ComingSoon } from "@/components/brand/coming-soon";
import { PortraitFallback } from "@/components/brand/fallback";
import { Reveal } from "@/components/brand/reveal";
import { Scoreboard } from "@/components/brand/scoreboard";
import { SpotlightHero } from "@/components/brand/spotlight-hero";
import { TibebStrip } from "@/components/brand/tibeb";
import { Ticker } from "@/components/brand/ticker";
import { VsBadge } from "@/components/brand/vs-badge";
import { VsCard } from "@/components/brand/vs-card";
import { Wordmark } from "@/components/brand/wordmark";
import { SOCIAL_PLATFORMS, SocialIcon, type SocialPlatform } from "@/components/site/social-icons";
import { Button } from "@/components/ui/button";
import am from "@/messages/am.json";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

// Hidden page: not linked, not in the sitemap, 404 in production unless enabled.
const enabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_STYLEGUIDE === "1";

const COLORS = [
  { name: "bg", hex: "#0A0A0C", note: "Page background" },
  { name: "surface", hex: "#131317", note: "Cards, panels" },
  { name: "surface-2", hex: "#1B1B21", note: "Raised / hover" },
  { name: "border", hex: "#2A2A32", note: "Lines" },
  { name: "text", hex: "#F4F4F5", note: "18:1 on bg" },
  { name: "muted", hex: "#A1A1AA", note: "7.7:1 on bg" },
  { name: "gold", hex: "#FFB800", note: "Primary · black text 11.4:1" },
  { name: "red", hex: "#FF3B4E", note: "VS / new · black text 5.6:1" },
  { name: "green", hex: "#1FAA59", note: "Success / tibeb · black text 6.5:1" },
] as const;

const SECTIONS = [
  ["colors", "Colours"],
  ["type", "Typography"],
  ["amharic", "Amharic"],
  ["controls", "Buttons & chips"],
  ["tibeb", "Tibeb strip"],
  ["vs", "VS cards"],
  ["artists", "Artist cards"],
  ["fallbacks", "Fallbacks"],
  ["soon", "Coming soon"],
  ["ticker", "Ticker"],
  ["scoreboard", "Scoreboard"],
  ["hero", "Spotlight hero"],
  ["motion", "Motion"],
] as const;

export default async function StyleguidePage({ params }: PageProps<"/[locale]/styleguide">) {
  if (!enabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const [te, ta, tc, ts, tb] = await Promise.all([
    getTranslations("episode"),
    getTranslations("artist"),
    getTranslations("comingSoon"),
    getTranslations("scoreboard"),
    getTranslations("brand"),
  ]);
  const season1 = te("season", { season: 1 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="font-display text-xs font-bold tracking-[0.3em] text-gold uppercase">Studio Night</p>
        <h1 className="mt-3 font-display text-h1 font-extrabold">Styleguide</h1>
        <p className="mt-4 text-muted-foreground">
          Every Feta Show component in one place. This page is hidden: not linked, not indexed, and disabled in
          production unless <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">ENABLE_STYLEGUIDE=1</code>.
        </p>
        <nav aria-label="Styleguide sections" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-block rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-gold/60 hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Section id="colors" title="Colours">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLORS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="h-20 border-b border-line" style={{ background: c.hex }} />
              <div className="p-3">
                <p className="font-display text-sm font-bold">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.hex}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="grain relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
            <div className="glow-gold absolute inset-0" />
            <span className="relative font-display text-sm font-bold">Gold glow + grain</span>
          </div>
          <div className="grain relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
            <VsBadge />
          </div>
        </div>
      </Section>

      <Section id="type" title="Typography">
        <div className="space-y-6">
          <Specimen label="Hero · Unbounded 800 · clamp 56–96px">
            <p className="font-display text-hero font-extrabold">Two stars.</p>
          </Specimen>
          <Specimen label="H1 · Unbounded 800 · clamp 40–56px">
            <p className="font-display text-h1 font-extrabold">Lij Michael vs Hanan Tarik</p>
          </Specimen>
          <Specimen label="H2 · Unbounded 700 · clamp 28–36px">
            <p className="font-display text-h2 font-bold">Legends of Ethiopian music</p>
          </Specimen>
          <Specimen label="Body · Inter · clamp 16–18px">
            <p className="max-w-2xl">
              Feta (ፈታ) is a celebrity game show that launched on EBS TV in 2016. Each episode puts two well-known
              Ethiopian personalities head-to-head across rounds of games and challenges, all the way to a final round.
            </p>
          </Specimen>
          <Specimen label="Numbers · tabular">
            <p className="font-display text-4xl font-extrabold tabular-nums">0123456789</p>
          </Specimen>
        </div>
      </Section>

      <Section id="amharic" title="Amharic (Noto Sans Ethiopic)">
        <div className="space-y-6">
          <Specimen label="Wordmark · Ethiopic 900">
            <Wordmark size="md" className="items-start" />
          </Specimen>
          <Specimen label="Tagline · from messages/am.json">
            <p lang="am" className="text-2xl font-bold text-gold">{am.brand.tagline}</p>
          </Specimen>
          <Specimen label="Weights 400 → 900">
            <div lang="am" className="flex flex-wrap gap-x-6 gap-y-2 text-2xl">
              {[400, 500, 700, 800, 900].map((w) => (
                <span key={w} style={{ fontWeight: w }}>
                  ፈታ <span className="text-sm text-muted-foreground">{w}</span>
                </span>
              ))}
            </div>
          </Specimen>
          <Specimen label="Navigation glossary · messages/am.json (needs native review)">
            <ul lang="am" className="flex flex-wrap gap-2">
              {Object.values(am.nav).map((word) => (
                <li key={word}>
                  <Chip>{word}</Chip>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen label="Names · English over Amharic">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Mulatu Astatke", "ሙላቱ አስታጥቄ"],
                ["Aster Aweke", "አስቴር አወቀ"],
                ["Tilahun Gessesse", "ጥላሁን ገሠሠ"],
                ["Teddy Afro", "ቴዲ አፍሮ"],
              ].map(([en, amName]) => (
                <li key={en} className="rounded-lg border border-line bg-surface p-4">
                  <p className="font-display font-bold">{en}</p>
                  <p lang="am" className="text-lg text-muted-foreground">{amName}</p>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen label="Body paragraph · line-height 1.7">
            <p lang="am" className="max-w-2xl">
              {am.brand.tagline} {am.brand.name} · {am.nav.episodes} · {am.nav.artists} · {am.nav.videos} · {am.nav.gallery}
            </p>
          </Specimen>
        </div>
      </Section>

      <Section id="controls" title="Buttons & chips">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">
            Watch episodes <ArrowRight />
          </Button>
          <Button>Join</Button>
          <Button variant="outline">Be on the show</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">Text link</Button>
          <Button size="icon" variant="outline" aria-label="Play">
            <PlayCircle />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Chip>{te("types.GAME_SHOW")}</Chip>
          <Chip>{te("types.HOLIDAY_SPECIAL")}</Chip>
          <Chip variant="muted">{ta("categories.SINGER")}</Chip>
          <Chip variant="legend">{ta("legend")}</Chip>
          <Chip variant="red">{ta("onFeta")}</Chip>
          <Chip variant="red">New</Chip>
          <Chip variant="gold">Featured</Chip>
          <Chip variant="green">Published</Chip>
          <Chip size="sm">Small</Chip>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Press <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-xs">Tab</kbd> to see the gold focus ring.
        </p>
        <div className="mt-6">
          <p className="mb-2 text-xs text-muted-foreground">Social icons (Simple Icons, CC0)</p>
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).map((p) => (
              <li key={p} className="flex size-11 items-center justify-center rounded-full border border-line text-muted-foreground" title={SOCIAL_PLATFORMS[p].label}>
                <SocialIcon platform={p} />
                <span className="sr-only">{SOCIAL_PLATFORMS[p].label}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="tibeb" title="Tibeb strip">
        <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
          <TibebStrip height={6} />
          <TibebStrip height={12} />
          <TibebStrip height={20} fade />
          <div className="flex flex-col items-center gap-1 pt-4">
            <Wordmark size="md" />
            <TibebStrip height={6} className="max-w-[7rem]" />
          </div>
        </div>
      </Section>

      <Section id="vs" title="VS cards">
        <VsCard
          size="lg"
          a={{ name: "Lij Michael" }}
          b={{ name: "Hanan Tarik" }}
          title={te("matchup", { a: "Lij Michael", b: "Hanan Tarik" })}
          typeLabel={te("types.GAME_SHOW")}
          seasonLabel={season1}
          href="/styleguide#vs"
          className="max-w-4xl"
        />
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Mekonnen Laeke", "Deribwork", "GAME_SHOW"],
            ["Traffic Police", "Taxi Drivers", "HOLIDAY_SPECIAL"],
            ["Solomon Tekalign", "Berhanu Tesfaye", "GAME_SHOW"],
          ].map(([a, b, type], i) => (
            <li key={a}>
              <Reveal index={i}>
                <VsCard
                  a={{ name: a! }}
                  b={{ name: b! }}
                  title={te("matchup", { a: a!, b: b! })}
                  typeLabel={te(`types.${type as "GAME_SHOW" | "HOLIDAY_SPECIAL"}`)}
                  seasonLabel={season1}
                  href="/styleguide#vs"
                />
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-6 w-64">
          <p className="mb-2 text-xs text-muted-foreground">Mini (hero “latest matchup”)</p>
          <VsCard size="mini" a={{ name: "Melkam" }} b={{ name: "Bling" }} title="Melkam vs Bling" />
        </div>
      </Section>

      <Section id="artists" title="Artist cards">
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
          {[
            { nameEn: "Mulatu Astatke", nameAm: "ሙላቱ አስታጥቄ", categories: [ta("categories.MUSICIAN")], isLegend: true },
            { nameEn: "Aster Aweke", nameAm: "አስቴር አወቀ", categories: [ta("categories.SINGER")], isLegend: true },
            { nameEn: "Teddy Afro", nameAm: "ቴዲ አፍሮ", categories: [ta("categories.SINGER")] },
            { nameEn: "Rophnan", nameAm: "ሮፍናን", categories: [ta("categories.PRODUCER_DJ"), ta("categories.SINGER")] },
            { nameEn: "Jano Band", nameAm: "ጃኖ ባንድ", categories: [ta("categories.MUSICIAN")], onFeta: true },
          ].map((a, i) => (
            <li key={a.nameEn}>
              <Reveal index={i}>
                <ArtistCard {...a} legendLabel={ta("legend")} onFetaLabel={ta("onFeta")} href="/styleguide#artists" />
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">The “On Feta” badge above is a demo state only.</p>
      </Section>

      <Section id="fallbacks" title="Fallbacks">
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Nobody without an uploaded photo gets a real picture. Each name maps to the same gradient every time.
        </p>
        <ul className="flex flex-wrap items-end gap-4">
          {["Betty G", "Seifu Fantahun", "Gigi", "Hailu Mergia", "Amleset Muchie", "ጂጂ"].map((n, i) => (
            <li key={n} className="text-center">
              <div className={i === 0 ? "size-32 overflow-hidden rounded-lg" : "size-24 overflow-hidden rounded-full"}>
                <PortraitFallback name={n} size={i === 0 ? "lg" : "md"} corner={i === 0} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground" lang={/\p{Script=Ethiopic}/u.test(n) ? "am" : undefined}>{n}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="soon" title="Coming-soon states">
        <div className="grid gap-5 lg:grid-cols-2">
          <ComingSoon variant="player" label={tc("label")} title={tc("episodeVideo")} body={tc("episodeVideoBody")} icon={PlayCircle} />
          <div className="grid gap-5">
            <ComingSoon variant="compact" label={tc("label")} title={tc("photos")} body={tc("photosBody")} icon={Images} />
            <ComingSoon
              variant="compact"
              label={tc("label")}
              title={tc("generic")}
              body={tc("genericBody")}
              icon={Sparkles}
              action={<Button size="sm" variant="outline">Notify me</Button>}
            />
          </div>
        </div>
      </Section>

      <Section id="ticker" title="Ticker">
        <Ticker
          items={[
            "Lij Michael vs Hanan Tarik",
            "Mekonnen Laeke vs Deribwork",
            "Traffic Police vs Taxi Drivers",
            "Solomon Tekalign vs Berhanu Tesfaye",
            "Want to play? Apply now",
          ]}
        />
        <p className="mt-3 text-xs text-muted-foreground">Pauses on hover. Static and scrollable under reduced motion.</p>
      </Section>

      <Section id="scoreboard" title="Scoreboard">
        <p className="mb-4 text-sm text-muted-foreground">
          Demo data only, not a real result. On real episodes the scoreboard is hidden until an admin enters scores.
        </p>
        <Scoreboard
          className="max-w-xl"
          aName="Contestant A"
          bName="Contestant B"
          winnerSide="B"
          rounds={[
            { name: "Round 1", scoreA: 10, scoreB: 20 },
            { name: "Round 2", scoreA: 30, scoreB: 10 },
            { name: "Final round", scoreA: 0, scoreB: 30 },
          ]}
          labels={{ title: ts("title"), round: ts("round"), total: ts("total"), winner: ts("winner"), tie: ts("tie") }}
        />
      </Section>

      <Section id="hero" title="Spotlight hero">
        <div className="overflow-hidden rounded-lg border border-line">
          <SpotlightHero
            taglineEn={tb("tagline")}
            taglineAm={am.brand.tagline}
            actions={
              <>
                <Button size="lg">Watch episodes</Button>
                <Button size="lg" variant="outline">Be on the show</Button>
              </>
            }
            asideLabel="Latest matchup"
            aside={
              <VsCard size="mini" a={{ name: "Martha" }} b={{ name: "Zelalem" }} title="Martha vs Zelalem" />
            }
          />
        </div>
      </Section>

      <Section id="motion" title="Motion">
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Fade and slide in once on scroll, staggered 60ms. All motion is off under prefers-reduced-motion.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Reveal index={i}>
                <div className="flex h-20 items-center justify-center rounded-lg border border-line bg-surface font-display text-lg font-bold text-gold tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-16 scroll-mt-24 sm:mt-20">
      <div className="mb-6 flex items-center gap-4">
        <h2 id={`${id}-title`} className="min-w-0 font-display text-h2 font-bold">
          {title}
        </h2>
        <TibebStrip height={6} fade className="min-w-12 flex-1 opacity-60" />
      </div>
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="mb-3 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
