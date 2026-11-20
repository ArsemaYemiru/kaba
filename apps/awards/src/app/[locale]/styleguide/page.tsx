import { ArrowRight, Images, PlayCircle, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryCard } from "@/components/awards/category-card";
import { FoilText, TrophyBadge } from "@/components/awards/gold-foil";
import { ArtistCard } from "@/components/brand/artist-card";
import { Chip } from "@/components/brand/chip";
import { ComingSoon } from "@/components/brand/coming-soon";
import { PortraitFallback } from "@/components/brand/fallback";
import { Reveal } from "@/components/brand/reveal";
import { SpotlightHero } from "@/components/brand/spotlight-hero";
import { TibebStrip } from "@/components/brand/tibeb";
import { Ticker } from "@/components/brand/ticker";
import { Wordmark } from "@/components/brand/wordmark";
import { NomineeFallback } from "@/components/awards/work-fallback";
import { Button } from "@/components/ui/button";
import am from "@/messages/am.json";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false, follow: false } };

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
  { name: "gold-light", hex: "#FFD866", note: "Foil highlight" },
  { name: "gold-deep", hex: "#B37F00", note: "Foil shadow · 5.6:1 on bg" },
  { name: "red", hex: "#FF3B4E", note: "Voting open · black text 5.6:1" },
  { name: "green", hex: "#1FAA59", note: "Success / tibeb · black text 6.5:1" },
] as const;

const SECTIONS = [
  ["colors", "Colours"], ["type", "Typography"], ["amharic", "Amharic"], ["foil", "Gold foil"], ["controls", "Buttons & chips"],
  ["tibeb", "Tibeb strip"], ["categories", "Genre cards"], ["artists", "Artist cards"],
  ["fallbacks", "Fallbacks"], ["soon", "Coming soon"], ["ticker", "Ticker"], ["hero", "Spotlight hero"],
] as const;

export default async function StyleguidePage({ params }: PageProps<"/[locale]/styleguide">) {
  if (!enabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const [tc, ta, tbr, tcs] = await Promise.all([getTranslations("category"), getTranslations("artist"), getTranslations("brand"), getTranslations("comingSoon")]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="font-display text-xs font-bold tracking-[0.3em] text-gold uppercase">Gold Night</p>
        <h1 className="mt-3 font-display text-h1 font-extrabold">Styleguide</h1>
        <p className="mt-4 text-muted-foreground">
          Every Feta Awards component. Hidden: not linked, not indexed, and disabled in production unless{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">ENABLE_STYLEGUIDE=1</code>. All honoree examples are fictional sample data.
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COLORS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="h-16 border-b border-line" style={{ background: c.hex }} />
              <div className="p-3">
                <p className="font-display text-sm font-bold">{c.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{c.hex}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
              </div>
            </li>
          ))}
          <li className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="foil-bg h-16 border-b border-line" />
            <div className="p-3">
              <p className="font-display text-sm font-bold">foil</p>
              <p className="text-xs text-muted-foreground">deep → gold → light → gold, slow sheen</p>
            </div>
          </li>
        </ul>
      </Section>

      <Section id="type" title="Typography">
        <div className="space-y-5">
          <Specimen label="Hero · Unbounded 800 · clamp 56–96px"><p className="font-display text-hero font-extrabold">Honored.</p></Specimen>
          <Specimen label="H1 · Unbounded 800"><p className="font-display text-h1 font-extrabold">Song of the Year</p></Specimen>
          <Specimen label="H2 · Unbounded 700"><p className="font-display text-h2 font-bold">Legends of Ethiopian music</p></Specimen>
          <Specimen label="Body · Inter">
            <p className="max-w-2xl">{tbr("tagline")} Each edition recognizes Ethiopian artists genre by genre, from Classical to Bati to Afrobeat.</p>
          </Specimen>
          <Specimen label="Countdown numerals · tabular"><p className="font-display text-4xl font-extrabold tabular-nums">00 14 23 59</p></Specimen>
        </div>
      </Section>

      <Section id="amharic" title="Amharic (Noto Sans Ethiopic)">
        <div className="space-y-5">
          <Specimen label="Wordmark · Ethiopic 900"><Wordmark size="md" className="items-start" /></Specimen>
          <Specimen label="Tagline · messages/am.json (needs native review)"><p lang="am" className="text-2xl font-bold text-gold">{am.brand.tagline}</p></Specimen>
          <Specimen label="Weights 400 → 900">
            <div lang="am" className="flex flex-wrap gap-x-6 gap-y-2 text-2xl">
              {[400, 500, 700, 800, 900].map((w) => (
                <span key={w} style={{ fontWeight: w }}>ፈታ <span className="text-sm text-muted-foreground">{w}</span></span>
              ))}
            </div>
          </Specimen>
          <Specimen label="Glossary · messages/am.json">
            <ul lang="am" className="flex flex-wrap gap-2">
              {Object.values(am.nav).map((w) => <li key={w}><Chip>{w}</Chip></li>)}
            </ul>
          </Specimen>
          <Specimen label="Sample genre names (spec §9.4)">
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(am.sampleCategories).map(([n, name]) => (
                <li key={n} className="flex gap-2 text-sm"><span className="w-6 text-muted-foreground tabular-nums">{n}</span><span lang="am" className="font-semibold">{name}</span></li>
              ))}
            </ul>
          </Specimen>
        </div>
      </Section>

      <Section id="foil" title="Gold foil">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grain relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-line bg-surface p-8">
            <div aria-hidden="true" className="glow-gold absolute inset-0" />
            <FoilText className="relative font-display text-6xl font-extrabold tabular-nums">2026</FoilText>
            <p className="relative text-xs text-muted-foreground">Edition year (hero only)</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-line bg-surface p-8">
            <div className="flex items-end gap-3"><TrophyBadge size="sm" /><TrophyBadge /><TrophyBadge size="lg" /></div>
            <p className="text-xs text-muted-foreground">Trophy badges</p>
          </div>
          <div className="foil-frame flex flex-col items-center justify-center gap-2 rounded-lg p-8">
            <p className="foil-text font-display text-sm font-extrabold tracking-[0.35em] uppercase">Honored</p>
            <p className="text-xs text-muted-foreground">Foil frame</p>
          </div>
        </div>
      </Section>

      <Section id="controls" title="Buttons & chips">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">See the honorees <ArrowRight /></Button>
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip>Classical</Chip>
          <Chip variant="gold">{ta("honoree")}</Chip>
          <Chip variant="legend">{ta("legend")}</Chip>
          <Chip variant="red">Red</Chip>
          <Chip variant="foil">Foil</Chip>
          <Chip variant="sample">Sample</Chip>
          <Chip variant="green">Published</Chip>
        </div>
      </Section>

      <Section id="tibeb" title="Tibeb strip">
        <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
          <TibebStrip height={6} />
          <TibebStrip height={12} />
          <TibebStrip height={20} fade />
        </div>
      </Section>

      <Section id="categories" title="Genre cards">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li><CategoryCard name="Classical" icon="music" description="Sample genre description." honoreeCountLabel={tc("honorees", { count: 6 })} href="/styleguide#categories" sample /></li>
          <li><CategoryCard name="Bati" icon="mic-vocal" honoreeCountLabel={tc("honorees", { count: 4 })} href="/styleguide#categories" sample /></li>
          <li><CategoryCard name="Afrobeat" icon="disc-3" honoreeCountLabel={tc("honorees", { count: 1 })} href="/styleguide#categories" sample /></li>
          <li><CategoryCard name="Ethio-jazz" icon="crown" honoreeCountLabel={tc("honorees", { count: 0 })} href="/styleguide#categories" sample /></li>
        </ul>
      </Section>

      <Section id="artists" title="Artist cards">
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
          <li><ArtistCard nameEn="Mulatu Astatke" nameAm="ሙላቱ አስታጥቄ" categories={[ta("categories.MUSICIAN")]} isLegend legendLabel={ta("legend")} /></li>
          <li><ArtistCard nameEn="Aster Aweke" nameAm="አስቴር አወቀ" categories={[ta("categories.SINGER")]} isLegend legendLabel={ta("legend")} /></li>
          <li><ArtistCard nameEn="Teddy Afro" nameAm="ቴዲ አፍሮ" categories={[ta("categories.SINGER")]} /></li>
          <li><ArtistCard nameEn="Sample Artist 6A" categories={[ta("categories.SINGER")]} honored honoredLabel={ta("honoree")} /></li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">The honoree badge is shown only on sample names here: real artists show it only once an admin honors them in an announced edition.</p>
      </Section>

      <Section id="fallbacks" title="Fallbacks">
        <ul className="flex flex-wrap items-end gap-4">
          {["Betty G", "Seifu Fantahun", "Gigi", "ጂጂ"].map((n) => (
            <li key={n} className="text-center">
              <div className="size-24 overflow-hidden rounded-full"><PortraitFallback name={n} size="md" /></div>
              <p className="mt-2 text-xs text-muted-foreground" lang={/\p{Script=Ethiopic}/u.test(n) ? "am" : undefined}>{n}</p>
            </li>
          ))}
          {(["SONG", "MUSIC_VIDEO", "FILM", "SERIES"] as const).map((t) => (
            <li key={t} className="text-center">
              <div className="h-30 w-24 overflow-hidden rounded-lg"><NomineeFallback name={`Sample ${t}`} type={t} /></div>
              <p className="mt-2 text-xs text-muted-foreground">{t.replace("_", " ").toLowerCase()}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="soon" title="Coming-soon states">
        <div className="grid gap-5 lg:grid-cols-2">
          <ComingSoon variant="player" icon={PlayCircle} label={tcs("label")} title={tcs("video")} body={tcs("videoBody")} />
          <div className="grid gap-5">
            <ComingSoon variant="compact" icon={Trophy} label={tcs("label")} title={tcs("honorees")} body={tcs("honoreesBody")} />
            <ComingSoon variant="compact" icon={Images} label={tcs("label")} title={tcs("gallery")} body={tcs("galleryBody")} />
          </div>
        </div>
      </Section>

      <Section id="ticker" title="Ticker">
        <Ticker items={["Feta Awards 2026 · Honoring 24 artists", "Classical · Bati · Afrobeat · Ethio-jazz", "Celebrating Ethiopian artists"]} label="Feta Awards highlights" />
      </Section>

      <Section id="hero" title="Spotlight hero">
        <div className="overflow-hidden rounded-lg border border-line">
          <SpotlightHero
            taglineEn={tbr("tagline")}
            taglineAm={am.brand.tagline}
            year={2026}
            actions={
              <>
                <Button size="lg">See the honorees <ArrowRight /></Button>
                <Button size="lg" variant="outline">Browse artists</Button>
              </>
            }
          />
        </div>
      </Section>

      <Section id="motion" title="Motion">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Reveal index={i}>
                <div className="flex h-16 items-center justify-center rounded-lg border border-line bg-surface font-display text-lg font-bold text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</div>
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
        <h2 id={`${id}-title`} className="min-w-0 font-display text-h2 font-bold">{title}</h2>
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
