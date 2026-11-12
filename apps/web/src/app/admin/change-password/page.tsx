import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/admin/auth-card";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { requireUser } from "@/lib/authz";

export const metadata: Metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<AuthCard title="Change your password">{null}</AuthCard>}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requireUser({ allowMustChange: true });
  return (
    <AuthCard
      title={user.mustChangePassword ? "Set a new password" : "Change your password"}
      subtitle={
        user.mustChangePassword
          ? `Welcome, ${user.name}. For security, choose a new password before you continue.`
          : undefined
      }
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
