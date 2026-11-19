import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/brand/chip";
import { ReasonAction, UnbanButton } from "@/components/admin/modules/moderation";
import { AdminPage, Panel } from "@/components/admin/ui";
import { requireUser } from "@/lib/authz";
import { formatEat } from "@/lib/time";
import { dashboardEdition } from "@/server/admin/dashboard";
import { memberDetail } from "@/server/admin/members";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Member" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function MemberPage(props: PageProps<"/admin/members/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <MemberPageContent {...props} />
    </Suspense>
  );
}

async function MemberPageContent({ params }: PageProps<"/admin/members/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const [data, edition] = await Promise.all([memberDetail(id), dashboardEdition()]);
  if (!data) notFound();
  const { user: m, events } = data;
  const sa = me.role === "SUPER_ADMIN";
  const t = (x: Date | null) => (x ? formatEat(x, "en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
  const facts: [string, React.ReactNode][] = [
    ["Email", <>{m.email} {m.emailVerified ? <Chip size="sm" variant="green">Verified</Chip> : <Chip size="sm" variant="muted">Unverified</Chip>}</>],
    ["Phone", m.phoneNumber ? <>{m.phoneNumber} {m.phoneNumberVerified ? <Chip size="sm" variant="green">Verified</Chip> : null}</> : "—"],
    ["Joined", t(m.createdAt)],
    ["Consent to rules & privacy", t(m.consentAt)],
    ["News opt-in", m.newsOptIn ? "Yes" : "No"],
    ["Last sign-in", t(m.lastLoginAt)],
  ];
  return (
    <AdminPage
      title={m.displayName || m.name}
      description={m.isSample ? "Sample member (removed with “Remove sample data”)." : undefined}
      actions={
        sa ? (
          <>
            {m.banned ? (
              <UnbanButton userId={m.id} />
            ) : (
              <ReasonAction kind="ban" userId={m.id} label="Ban member" title="Ban this member?" description="They're signed out everywhere, can't sign in or vote, and their counting votes in editions not yet published are voided." variant="destructive" />
            )}
            {edition ? (
              <>
                <ReasonAction kind="void" label="Void votes" title={`Void this member's votes in ${edition.nameEn}?`} description="Their counting votes stop counting. You can restore them later." selector={{ editionId: edition.id, userId: m.id }} />
                <ReasonAction kind="restore" label="Restore votes" title="Restore this member's voided votes?" description="Their voided votes count again." selector={{ editionId: edition.id, userId: m.id }} />
              </>
            ) : null}
          </>
        ) : null
      }
    >
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <Panel title="Profile">
          {m.banned ? (
            <p className="mb-3 rounded-md border border-red/50 bg-red/10 px-3 py-2 text-sm">
              <strong>Banned.</strong> {m.banReason}
            </p>
          ) : null}
          <dl className="grid gap-3 text-sm">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-1.5">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Ballot">
            {m.votes.length ? (
              <ul className="divide-y divide-line text-sm">
                {m.votes.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="text-xs text-muted-foreground">
                        {v.category.nameEn} · {v.category.edition.year}
                      </span>
                      <span className="block font-medium">{v.nominee.workTitleEn ?? v.nominee.displayNameEn}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {v.voidedAt ? <Chip size="sm" variant="red" title={v.voidReason ?? undefined}>Voided</Chip> : null}
                      {t(v.updatedAt)}
                      <Link href={`/admin/monitor?ip=${v.ipHash}`} className="font-mono text-gold hover:underline" title="Votes from this IP hash">
                        {v.ipHash.slice(0, 8)}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No votes.</p>
            )}
          </Panel>
          <Panel title="Vote history">
            {events.length ? (
              <ol className="divide-y divide-line text-xs">
                {events.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-x-3 gap-y-1 py-2">
                    <span className="w-36 text-muted-foreground tabular-nums">{t(e.createdAt)}</span>
                    <Chip size="sm" variant={e.type === "VOIDED" ? "red" : e.type === "CHANGED" ? "gold" : "muted"}>{e.type}</Chip>
                    <span>
                      {e.category.nameEn}: {e.from ? `${e.from} → ` : ""}
                      {e.to ?? (e.type === "VOIDED" ? "(voided)" : "")}
                    </span>
                    {e.reason ? <span className="text-muted-foreground">“{e.reason}”</span> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No vote activity.</p>
            )}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
