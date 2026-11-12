import { CheckCircle2, CircleAlert, FileVideo, ImagePlus, Inbox, PlaySquare, Plus, UserRound, Clapperboard, Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityRow } from "@/components/admin/activity-row";
import { AdminPage, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { isSuperAdmin, requireUser } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { getKpis, launchChecklist, recentActivity } from "@/server/admin/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const [kpis, activity, checklist] = await Promise.all([getKpis(), recentActivity(10), launchChecklist()]);
  const visible = checklist.filter((c) => !c.superAdminOnly || isSuperAdmin(user));
  const done = visible.filter((c) => c.ok).length;

  const cards = [
    { label: "Published artists", value: kpis.artists, href: "/admin/artists", icon: UserRound },
    { label: "Published episodes", value: kpis.episodes, href: "/admin/episodes", icon: Clapperboard },
    { label: "Published videos", value: kpis.videos, href: "/admin/videos", icon: PlaySquare },
    { label: "Media files", value: kpis.media, href: "/admin/media", icon: Images },
    { label: "New submissions", value: kpis.newSubmissions, href: "/admin/submissions", icon: Inbox, alert: kpis.newSubmissions > 0 },
  ];

  return (
    <AdminPage
      title={`Selam, ${user.name.split(" ")[0]}`}
      description="Here's what's happening on Feta Show."
      actions={
        <>
          <Button asChild size="sm">
            <Link href="/admin/artists/new">
              <Plus /> Add artist
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/episodes/new">
              <FileVideo /> New episode
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/media">
              <ImagePlus /> Upload media
            </Link>
          </Button>
        </>
      }
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="group flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-gold/60">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{c.label}</span>
                <c.icon className="size-4" aria-hidden="true" />
              </div>
              <span className={cn("mt-3 font-display text-3xl font-extrabold tabular-nums", c.alert ? "text-red" : "text-foreground")}>{c.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="Launch checklist" action={<span className="text-xs text-muted-foreground tabular-nums">{done}/{visible.length} done</span>}>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={visible.length} aria-valuenow={done} aria-label="Launch checklist progress">
            <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${(done / Math.max(1, visible.length)) * 100}%` }} />
          </div>
          <ul className="divide-y divide-line">
            {visible.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" aria-label="Done" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-label="To do" />
                )}
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
      </div>
    </AdminPage>
  );
}
