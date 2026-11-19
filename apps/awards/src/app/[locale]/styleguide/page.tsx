import { ArrowRight, Images, PlayCircle, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BallotProgress } from "@/components/awards/ballot-progress";
import { CategoryCard } from "@/components/awards/category-card";
import { Countdown } from "@/components/awards/countdown";
import { FoilText, TrophyBadge } from "@/components/awards/gold-foil";
import { NomineeCard } from "@/components/awards/nominee-card";
import { PhaseBanner, type Phase } from "@/components/awards/phase-banner";
import { WinnerCard } from "@/components/awards/winner-card";
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

// Fixed demo dates (a static page can't read the clock at build time).
const VOTING_CLOSES = "2027-03-01T15:00:00.000Z";
const CEREMONY = "2027-03-08T16:00:00.000Z";

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
  ["tibeb", "Tibeb strip"], ["nominees", "Nominee cards"], ["categories", "Category cards"], ["countdown", "Countdown"],
  ["phase", "Phase banner"], ["ballot", "Ballot progress"], ["winners", "Winner cards"], ["artists", "Artist cards"],
  ["fallbacks", "Fallbacks"], ["soon", "Coming soon"], ["ticker", "Ticker"], ["hero", "Spotlight hero"],
] as const;

export default async function StyleguidePage({ params }: PageProps<"/[locale]/styleguide">) {
  if (!enabled) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const [tn, tc, tv, tnt, tp, tcd, tb, ta, tbr, tcs] = await Promise.all([
    getTranslations("nominee"), getTranslations("category"), getTranslations("votingType"), getTranslations("nomineeType"),
    getTranslations("phase"), getTranslations("countdown"), getTranslations("ballot"), getTranslations("artist"),
    getTranslations("brand"), getTranslations("comingSoon"),
  ]);
  const nomineeLabels = { vote: tn("vote"), yourVote: tn("yourVote"), closed: tn("votingClosed"), winner: tn("winner"), sample: tn("sample"), by: (a: string) => tn("by", { artist: a }) };
  const countdownLabels = { days: tcd("days"), hours: tcd("hours"), minutes: tcd("minutes"), seconds: tcd("seconds"), eat: tcd("eat") };
  const cats = am.sampleCategories;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-3xl">
        <p className="font-display text-xs font-bold tracking-[0.3em] text-gold uppercase">Gold Night</p>
        <h1 className="mt-3 font-display text-h1 font-extrabold">Styleguide</h1>
        <p className="mt-4 text-muted-foreground">
          Every Feta Awards component. Hidden: not linked, not indexed, and disabled in production unless{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">ENABLE_STYLEGUIDE=1</code>. All nominee and winner examples are fictional sample data.
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
          <Specimen label="Hero · Unbounded 800 · clamp 56–96px"><p className="font-display text-hero font-extrabold">Your vote.</p></Specimen>
          <Specimen label="H1 · Unbounded 800"><p className="font-display text-h1 font-extrabold">Song of the Year</p></Specimen>
          <Specimen label="H2 · Unbounded 700"><p className="font-display text-h2 font-bold">Legends of Ethiopian music</p></Specimen>
          <Specimen label="Body · Inter">
            <p className="max-w-2xl">{tbr("tagline")} Nominees are announced for each edition, fans vote for their favourites here, and the winners are revealed on awards night.</p>
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
          <Specimen label="Sample category names (spec §9.4)">
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(cats).map(([n, name]) => (
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
            <p className="text-xs text-muted-foreground">Trophy badges (winner states)</p>
          </div>
          <div className="foil-frame flex flex-col items-center justify-center gap-2 rounded-lg p-8">
            <p className="foil-text font-display text-sm font-extrabold tracking-[0.35em] uppercase">Winner</p>
            <p className="text-xs text-muted-foreground">Foil frame (winner cards)</p>
          </div>
        </div>
      </Section>

      <Section id="controls" title="Buttons & chips">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Vote now <ArrowRight /></Button>
          <Button>Vote</Button>
          <Button variant="outline">Sign in</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Void votes</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip>{tv("PUBLIC_VOTE")}</Chip>
          <Chip>{tv("HYBRID")}</Chip>
          <Chip>{tv("JURY")}</Chip>
          <Chip variant="legend">{tv("HONORARY")}</Chip>
          <Chip variant="red">{tp("VOTING_OPEN")}</Chip>
          <Chip variant="foil">{ta("winner")}</Chip>
          <Chip variant="legend">{ta("legend")}</Chip>
          <Chip variant="red">{ta("nominee")}</Chip>
          <Chip variant="sample">{tn("sample")}</Chip>
          <Chip variant="green">Verified</Chip>
        </div>
      </Section>

      <Section id="tibeb" title="Tibeb strip">
        <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
          <TibebStrip height={6} />
          <TibebStrip height={12} />
          <TibebStrip height={20} fade />
        </div>
      </Section>

      <Section id="nominees" title="Nominee cards">
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">Every state from spec §3.4: default, selected (“Your vote”), disabled (voting not open), winner (gold foil) and the Sample chip. Works show artwork with the credited artist.</p>
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
          <li><NomineeCard name="Sample Nominee 1A" type="PERSON" categoryLabel="Best Male Artist" sample labels={nomineeLabels} href="/styleguide#nominees" /></li>
          <li><NomineeCard name="Sample Nominee 2B" type="PERSON" categoryLabel="Best Female Artist" state="selected" sample labels={nomineeLabels} href="/styleguide#nominees" /></li>
          <li><NomineeCard name="Sample Song 3A" credit="Sample Artist 3A" type="SONG" categoryLabel="Song of the Year" state="disabled" sample labels={nomineeLabels} /></li>
          <li><NomineeCard name="Sample Album 4A" credit="Sample Artist 4A" type="ALBUM" categoryLabel="Album of the Year" state="winner" sample labels={nomineeLabels} /></li>
          <li><NomineeCard name="Sample Film 9A" type="FILM" categoryLabel="Film of the Year" state="disabled" sample labels={nomineeLabels} /></li>
        </ul>
      </Section>

      <Section id="categories" title="Category cards">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li><CategoryCard name="Best Male Artist" nameAm={cats["1"]} icon="mic-vocal" votingType="PUBLIC_VOTE" votingTypeLabel={tv("PUBLIC_VOTE")} nomineeCountLabel={tc("nominees", { count: 5 })} href="/styleguide#categories" memberState="voted" labels={{ voted: tc("voted"), voteNow: tc("voteNow") }} sample /></li>
          <li><CategoryCard name="Song of the Year" nameAm={cats["3"]} icon="disc-3" votingType="PUBLIC_VOTE" votingTypeLabel={tv("PUBLIC_VOTE")} nomineeCountLabel={tc("nominees", { count: 5 })} href="/styleguide#categories" memberState="notVoted" labels={{ voted: tc("voted"), voteNow: tc("voteNow") }} sample /></li>
          <li><CategoryCard name="Album of the Year" nameAm={cats["4"]} icon="album" votingType="HYBRID" votingTypeLabel={tv("HYBRID")} nomineeCountLabel={tc("nominees", { count: 5 })} href="/styleguide#categories" sample /></li>
          <li><CategoryCard name="Lifetime Achievement" nameAm={cats["12"]} icon="crown" votingType="HONORARY" votingTypeLabel={tv("HONORARY")} nomineeCountLabel={tc("nominees", { count: 1 })} href="/styleguide#categories" sample /></li>
        </ul>
      </Section>

      <Section id="countdown" title="Countdown">
        <div className="grid gap-6 lg:grid-cols-2">
          <Countdown target={VOTING_CLOSES} label={tcd("to.votingCloses")} labels={countdownLabels} />
          <Countdown target={CEREMONY} label={tcd("to.ceremony")} labels={countdownLabels} compact />
        </div>
      </Section>

      <Section id="phase" title="Phase banner">
        <div className="space-y-3 overflow-hidden rounded-lg border border-line">
          {(["NOMINEES_ANNOUNCED", "VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"] as Phase[]).map((p) => (
            <PhaseBanner
              key={p}
              phase={p}
              label={tp(p)}
              next={p === "VOTING_OPEN" ? { target: VOTING_CLOSES, template: tp("closesIn", { time: "{time}" }) } : p === "VOTING_CLOSED" ? { target: CEREMONY, template: tp("ceremonyIn", { time: "{time}" }) } : null}
            />
          ))}
        </div>
      </Section>

      <Section id="ballot" title="Ballot progress">
        <div className="grid gap-4 md:grid-cols-3">
          <BallotProgress done={0} total={11} label={tb("progress", { done: 0, total: 11 })} />
          <BallotProgress done={4} total={11} label={tb("progress", { done: 4, total: 11 })} />
          <BallotProgress done={11} total={11} label={tb("progress", { done: 11, total: 11 })} completeLabel={tb("complete")} />
        </div>
      </Section>

      <Section id="winners" title="Winner cards">
        <div className="grid gap-6 lg:grid-cols-2">
          <WinnerCard category="Best Female Artist" categoryAm={cats["2"]} name="Sample Nominee 2C" type="PERSON" publicShare={0.42} sample />
          <WinnerCard category="Song of the Year" categoryAm={cats["3"]} name="Sample Song 3D" credit="Sample Artist 3D" type="SONG" sample />
        </div>
      </Section>

      <Section id="artists" title="Artist cards">
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
          <li><ArtistCard nameEn="Mulatu Astatke" nameAm="ሙላቱ አስታጥቄ" categories={[ta("categories.MUSICIAN")]} isLegend legendLabel={ta("legend")} /></li>
          <li><ArtistCard nameEn="Aster Aweke" nameAm="አስቴር አወቀ" categories={[ta("categories.SINGER")]} isLegend legendLabel={ta("legend")} /></li>
          <li><ArtistCard nameEn="Teddy Afro" nameAm="ቴዲ አፍሮ" categories={[ta("categories.SINGER")]} /></li>
          <li><ArtistCard nameEn="Sample Artist 6A" categories={[ta("categories.SINGER")]} nominee nomineeLabel={ta("nominee")} /></li>
          <li><ArtistCard nameEn="Sample Artist 1C" categories={[ta("categories.SINGER")]} winner winnerLabel={ta("winner")} /></li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Nominee and winner badges are shown only on sample names: real artists are never shown as nominees unless an admin links them.</p>
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
              <p className="mt-2 text-xs text-muted-foreground">{tnt(t)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="soon" title="Coming-soon states">
        <div className="grid gap-5 lg:grid-cols-2">
          <ComingSoon variant="player" icon={PlayCircle} label={tcs("label")} title={tcs("video")} body={tcs("videoBody")} />
          <div className="grid gap-5">
            <ComingSoon variant="compact" icon={Trophy} label={tcs("label")} title={tcs("nominees")} body={tcs("nomineesBody")} />
            <ComingSoon variant="compact" icon={Images} label={tcs("label")} title={tcs("winners")} body={tcs("winnersBody")} />
          </div>
        </div>
      </Section>

      <Section id="ticker" title="Ticker">
        <Ticker items={[tp("VOTING_OPEN"), "Create your account and vote", "Share your favorite nominee", tcd("to.ceremony")]} label="Feta Awards highlights" />
      </Section>

      <Section id="hero" title="Spotlight hero">
        <div className="overflow-hidden rounded-lg border border-line">
          <SpotlightHero
            taglineEn={tbr("tagline")}
            taglineAm={am.brand.tagline}
            year={2026}
            countdown={<Countdown target={VOTING_CLOSES} label={tcd("to.votingCloses")} labels={countdownLabels} compact />}
            actions={
              <>
                <Button size="lg">Vote now <ArrowRight /></Button>
                <Button size="lg" variant="outline">See the nominees</Button>
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
