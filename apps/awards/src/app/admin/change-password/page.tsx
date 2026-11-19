import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StaffPasswordForm } from "@/components/admin/forms";
import { requireStaff } from "@/lib/authz";

export const metadata: Metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<AdminShell>{null}</AdminShell>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await connection();
  const v = await requireStaff({ allowMustChange: true });
  return (
    <AdminShell user={{ name: v.name, role: v.role }}>
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {v.mustChangePassword ? "Your account was created with a default password. Choose your own before using the admin." : "Other devices will be signed out."}
        </p>
        <div className="mt-6">
          <StaffPasswordForm />
        </div>
      </div>
    </AdminShell>
  );
}
