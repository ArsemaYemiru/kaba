import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";

export default function Forbidden() {
  return (
    <AdminShell>
      <section className="mx-auto max-w-md py-16 text-center">
        <p className="mx-auto flex size-16 items-center justify-center rounded-full bg-red font-display text-lg font-extrabold text-bg shadow-[0_0_0_4px_var(--gold)]">403</p>
        <h1 className="mt-6 font-display text-2xl font-bold">Not allowed</h1>
        <p className="mt-2 text-muted-foreground">The admin is for Feta Awards staff. If you work on the awards, ask a super admin for access.</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-gold hover:underline">
          Back to the site
        </Link>
      </section>
    </AdminShell>
  );
}
