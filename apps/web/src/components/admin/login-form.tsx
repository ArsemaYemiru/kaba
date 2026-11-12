"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { login, type FormState } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function LoginForm({ children }: { children?: React.ReactNode }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? (
        <p role="alert" className="rounded-md border border-red/50 bg-red/10 px-3 py-2.5 text-sm">
          {state.error}
        </p>
      ) : null}
      <FormField label="Email" name="email" type="email" autoComplete="username" required autoFocus />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" required />
      {children}
      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
