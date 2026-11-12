"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { changePassword, type FormState } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? (
        <p role="alert" className="rounded-md border border-red/50 bg-red/10 px-3 py-2.5 text-sm">
          {state.error}
        </p>
      ) : null}
      <FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" error={fe.currentPassword} required />
      <FormField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint="At least 12 characters. Not your current or the seeded default password."
        error={fe.newPassword}
        minLength={12}
        required
      />
      <FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" error={fe.confirmPassword} required />
      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
