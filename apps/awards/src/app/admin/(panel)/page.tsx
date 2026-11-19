import { CheckCircle2, CircleAlert, ImagePlus, Images, Newspaper, PlaySquare, Plus, Trophy, UserRound, Users, Vote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityRow } from "@/components/admin/activity-row";
import { RefreshButton } from "@/components/admin/forms";
import { PHASE_LABEL as PHASE_LABELS } from "@/server/admin/phase";
import { BarsChart } from "@/components/admin/modules/monitor-charts";
import { AdminPage, Panel } from "@/components/admin/ui";
import { RelativeTime } from "@/components/awards/relative-time";
import { Button } from "@/components/ui/button";
import { isSuperAdmin, requireUser } from "@/lib/authz";
import { upcomingMilestone } from "@/lib/phase";
import { formatEat } from "@/lib/time";
import { cn } from "@/lib/utils";
import { dashboardEdition, getKpis, launchChecklist, participation, recentActivity, votesPerDay } from "@/server/admin/dashboard";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Dashboard" };

const MILESTONE = { votingOpens: "Voting opens", votingCloses: "Voting closes", ceremony: "Awards night" } as const;

/** Request-time admin data streams inside its own boundary (A-44). */
export default function Dashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await requireUser();
  const edition = await dashboardEdition();
  const [kpis, activity, checklist, perDay, perCategory] = await Promise.all([
    getKpis(edition?.id ?? null),
    recentActivity(10),
    launchChecklist(),
    edition ? votesPerDay(edition.id) : [],
    edition ? participation(edition.id) : [],
  ]);
  const visible = checklist.filter((c) => !c.superAdminOnly || isSuperAdmin(user));
  const done = visible.filter((c) => c.ok).length;
  const next = edition ? upcomingMilestone(edition) : null;
  const n = (v: number) => v.toLocaleString("en");

  const cards = [
    { label: "Verified / total members", value: `${n(kpis.verified)} / ${n(kpis.members)}`, href: "/admin/members", icon: Users },
    { label: "Votes counting", value: n(kpis.votes), sub: `${n(kpis.votes24h)} new in 24 h`, href: "/admin/results", icon: Vote },
    { label: "Published artists", value: n(kpis.artists), href: "/admin/artists", icon: UserRound },
    { label: "Published news", value: n(kpis.news), href: "/admin/news", icon: Newspaper },
    { label: "Published videos", value: n(kpis.videos), href: "/admin/videos", icon: PlaySquare },
    { label: "Media files", value: n(kpis.media), href: "/admin/media", icon: Images },
  ];

  return (
    <AdminPage
      title={`Selam, ${user.name.split(" ")[0]}`}
      description="Here's what's happening on Feta Awards."
      actions={
        <>
          <Button asChild size="sm">
            <Link href="/admin/nominees/new">
              <Plus /> New nominee
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/media">
              <ImagePlus /> Upload media
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/news/new">
              <Newspaper /> Write news
            </Link>
          </Button>
        </>
      }
    >
      {edition ? (
        <section aria-label="Current edition" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gold/40 bg-surface p-5">
          <div className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold text-bg">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Current edition</p>
              <Link href={`/admin/editions/${edition.id}`} className="font-display text-lg font-bold hover:text-gold">
                {edition.nameEn} · {PHASE_LABELS[edition.phase]}
              </Link>
            </div>
          </div>
          {next ? (
            <p className="text-sm">
              <span className="text-muted-foreground">{MILESTONE[next.key]}: </span>
              <strong>{formatEat(next.target, "en-GB", { dateStyle: "medium", timeStyle: "short" })} EAT</strong>{" "}
              <span className="text-gold">
                (<RelativeTime target={next.target.toISOString()} template="in {time}" />)
              </span>
            </p>
          ) : null}
        </section>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="flex h-full flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-gold/60">
              <c.icon className="size-4 text-gold" aria-hidden="true" />
              <span className="font-display text-2xl font-bold tabular-nums">{c.value}</span>
              <span className="text-xs text-muted-foreground">{c.label}</span>
              {c.sub ? <span className="text-xs text-gold">{c.sub}</span> : null}
            </Link>
          </li>
        ))}
      </ul>

      {edition ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Votes over time (last 21 days)">
            <BarsChart data={perDay.map((d) => ({ label: d.day.toISOString().slice(5, 10), a: d.votes, b: d.changes }))} aLabel="New votes" bLabel="Changes" />
          </Panel>
          <Panel title="Participation per category" action={<span className="text-xs text-muted-foreground">staff only</span>}>
            <BarsChart data={perCategory.map((c) => ({ label: c.name.replace(/ of the Year$/, ""), a: c.votes }))} aLabel="Counting votes" />
          </Panel>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="Launch checklist" action={<span className="text-xs text-muted-foreground tabular-nums">{done}/{visible.length} done</span>}>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={visible.length} aria-valuenow={done} aria-label="Launch checklist progress">
            <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${(done / Math.max(1, visible.length)) * 100}%` }} />
          </div>
          <ul className="divide-y divide-line">
            {visible.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" aria-label="Done" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-label="To do" />}
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", c.ok && "text-muted-foreground")}>{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </div>
                {!c.ok && c.href ? (
                  <Link href={c.href} className="shrink-0 text-xs font-semibold text-gold hover:underline">
                    Fix
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Recent activity" action={<Link href="/admin/activity" className="text-xs font-semibold text-gold hover:underline">View all</Link>}>
            {activity.length ? (
              <ul className="divide-y divide-line">
                {activity.map((a) => (
                  <ActivityRow key={a.id} entry={a} />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            )}
          </Panel>
          <Panel title="Tools">
            <p className="mb-3 text-xs text-muted-foreground">Clear the public page caches (after editing data directly in the database).</p>
            <RefreshButton />
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
