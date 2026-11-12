import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/admin/auth-card";
import { LoginForm } from "@/components/admin/login-form";
import { safeNext } from "@/schemas/auth";

export const metadata: Metadata = { title: "Sign in" };

/**
 * The form renders immediately; only the hidden `next` field streams in.
 * (A Suspense fallback form would be swapped for a fresh one when the stream
 * arrives, wiping anything already typed.)
 */
export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <AuthCard title="Sign in" subtitle="Feta Show admin. Accounts are created by a super admin.">
      <LoginForm>
        <Suspense fallback={null}>
          <NextField searchParams={searchParams} />
        </Suspense>
      </LoginForm>
    </AuthCard>
  );
}

async function NextField({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const { next } = await searchParams;
  const value = safeNext(typeof next === "string" ? next : undefined);
  return value === "/admin" ? null : <input type="hidden" name="next" value={value} />;
}
