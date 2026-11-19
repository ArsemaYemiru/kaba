import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { DisableTwoFactorForm, TwoFactorSetupForm } from "@/components/admin/forms";
import { AdminPage, Panel } from "@/components/admin/ui";
import { requireStaff } from "@/lib/authz";
import { Suspense } from "react";
import Loading from "@/app/admin/(panel)/loading";

export const metadata: Metadata = { title: "Two-factor authentication" };

/** Request-time admin data streams inside its own boundary (A-44). */
export default function SecurityPage(props: PageProps<"/admin/security">) {
  return (
    <Suspense fallback={<Loading />}>
      <SecurityPageContent {...props} />
    </Suspense>
  );
}

async function SecurityPageContent({ searchParams }: PageProps<"/admin/security">) {
  const v = await requireStaff();
  const enabled = (await searchParams).enabled === "1" && v.twoFactorEnabled;
  return (
    <AdminPage title="Security" description="Two-factor authentication for your staff account. Super admins should always use it.">
      <Panel
        title="Two-factor authentication"
        action={
          <span className={v.twoFactorEnabled ? "flex items-center gap-1 text-xs text-green" : "text-xs text-muted-foreground"}>
            {v.twoFactorEnabled ? <ShieldCheck className="size-4" /> : null}
            {v.twoFactorEnabled ? "On" : "Off"}
          </span>
        }
      >
        <p className="mb-5 text-sm text-muted-foreground">
          {v.twoFactorEnabled ? "You'll enter a code from your authenticator app when you sign in." : "Protect your account with a code from an authenticator app (Google Authenticator, 1Password, Authy…)."}
        </p>
        {enabled ? (
          <p role="status" className="mb-5 rounded-md border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm">
            Two-factor authentication is on.
          </p>
        ) : null}
        {v.twoFactorEnabled ? <DisableTwoFactorForm /> : <TwoFactorSetupForm />}
      </Panel>
    </AdminPage>
  );
}
