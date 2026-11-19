import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/brand/chip";
import { BarsChart } from "@/components/admin/modules/monitor-charts";
import { RangeModeration, ReasonAction } from "@/components/admin/modules/moderation";
import { AdminPage, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/authz";
import { formatEat } from "@/lib/time";
import { frequentChangers, monitorEdition, signupBursts, signupsPerHour, SUSPICIOUS_ACCOUNTS_PER_IP, topIpHashes, votesPerHour } from "@/server/admin/monitor";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Vote monitor" };

const hourLabel = (d: Date) => formatEat(d, "en-GB", { day: "2-digit", hour: "2-digit", hour12: false });

/** Request-time admin data streams inside its own boundary (A-44). */
export default function MonitorPage(props: PageProps<"/admin/monitor">) {
  return (
    <Suspense fallback={<Loading />}>
      <MonitorPageContent {...props} />
    </Suspense>
  );
}

/** Vote monitor (spec §5.4). IP addresses only ever appear as hashes. */
async function MonitorPageContent({ searchParams }: PageProps<"/admin/monitor">) {
  const me = await requireUser();
  const sa = me.role === "SUPER_ADMIN";
  const { ip } = await searchParams;
  const edition = await monitorEdition();
  if (!edition) return <AdminPage title="Vote monitor">No edition has opened voting yet.</AdminPage>;
  const [votes, signups, ips, bursts, changers] = await Promise.all([votesPerHour(edition.id), signupsPerHour(), topIpHashes(edition.id), signupBursts(edition.id), frequentChangers(edition.id)]);
  const focus = typeof ip === "string" && /^[0-9a-f]{16,64}$/.test(ip) ? ip : null;
  return (
    <AdminPage title="Vote monitor" description={`${edition.nameEn} · last 72 hours. IPs are stored only as one-way hashes.`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Votes per hour">
          <BarsChart data={votes.map((v) => ({ label: hourLabel(v.hour), a: v.votes, b: v.changes }))} aLabel="New votes" bLabel="Changes" />
        </Panel>
        <Panel title="Sign-ups per hour">
          <BarsChart data={signups.map((s) => ({ label: hourLabel(s.hour), a: s.signups }))} aLabel="Sign-ups" />
        </Panel>
      </div>

      <Panel title="Top IP hashes" className="mt-5">
        {focus ? (
          <p className="mb-3 text-xs">
            Showing actions for <code className="font-mono">{focus.slice(0, 16)}…</code>{" "}
            <Link href="/admin/monitor" className="text-gold hover:underline">
              Clear
            </Link>
          </p>
        ) : null}
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">IP hash</th>
                <th className="px-4 py-2 text-right font-medium">Accounts</th>
                <th className="px-4 py-2 text-right font-medium">Votes</th>
                <th className="px-4 py-2 text-right font-medium">Voided</th>
                <th className="px-4 py-2 font-medium">Last vote</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(focus ? ips.filter((r) => r.ipHash === focus) : ips).map((r) => (
                <tr key={r.ipHash} className={r.accounts >= SUSPICIOUS_ACCOUNTS_PER_IP ? "bg-red/5" : undefined}>
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.ipHash.slice(0, 16)}…{r.accounts >= SUSPICIOUS_ACCOUNTS_PER_IP ? <Chip size="sm" variant="red" className="ml-2">Shared by {r.accounts}</Chip> : null}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.accounts}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.votes}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.voided}</td>
                  <td className="px-4 py-2 text-xs tabular-nums">{formatEat(r.lastAt, "en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-4 py-2 text-right">
                    {sa ? (
                      <span className="inline-flex gap-1">
                        <ReasonAction kind="void" size="xs" label="Void" title="Void every counting vote from this IP hash?" description={`All counting votes from ${r.ipHash.slice(0, 12)}… in ${edition.nameEn} stop counting.`} selector={{ editionId: edition.id, ipHash: r.ipHash }} variant="destructive" />
                        {r.voided ? <ReasonAction kind="restore" size="xs" label="Restore" title="Restore voided votes from this IP hash?" description="They count again." selector={{ editionId: edition.id, ipHash: r.ipHash }} /> : null}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Accounts created in bursts">
          {bursts.length ? (
            <ul className="divide-y divide-line text-sm">
              {bursts.map((b) => (
                <li key={`${b.windowStart.toISOString()}-${b.ipHash}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong className="tabular-nums">{b.accounts}</strong> accounts in 10 min ({formatEat(b.windowStart, "en-GB", { dateStyle: "short", timeStyle: "short" })}) voting from{" "}
                    <Link href={`/admin/monitor?ip=${b.ipHash}`} className="font-mono text-xs text-gold hover:underline">
                      {b.ipHash.slice(0, 10)}…
                    </Link>
                    <span className="text-xs text-muted-foreground"> · {b.votes} votes</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No bursts detected.</p>
          )}
        </Panel>
        <Panel title="Members with many vote changes">
          {changers.length ? (
            <ul className="divide-y divide-line text-sm">
              {changers.map((c) => (
                <li key={c.userId} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/members/${c.userId}`} className="truncate hover:text-gold">
                    {c.email}
                  </Link>
                  <span className="text-xs tabular-nums">{c.changes} changes</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nobody has changed votes unusually often.</p>
          )}
        </Panel>
      </div>

      {sa ? (
        <Panel title="Void or restore by time range" className="mt-5">
          <RangeModeration editionId={edition.id} />
        </Panel>
      ) : null}
    </AdminPage>
  );
}
