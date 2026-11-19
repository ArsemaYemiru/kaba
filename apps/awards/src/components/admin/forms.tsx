"use client";

import { Check, Copy, RefreshCw } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Field, FormMessage, PasswordField, Submit } from "@/components/auth/fields";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/server/actions/auth";
import { changeStaffPassword, confirmTwoFactor, disableTwoFactor, refreshPublicContent, startTwoFactor, type TwoFactorSetup } from "@/server/actions/admin/security";

const sh = { showLabel: "Show password", hideLabel: "Hide password" };

export function StaffPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changeStaffPassword, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <input type="text" name="username" autoComplete="username" hidden readOnly aria-hidden="true" />
      <PasswordField name="currentPassword" label="Current password" autoComplete="current-password" required error={fe.currentPassword} {...sh} />
      <PasswordField name="newPassword" label="New password" hint="At least 12 characters. Not a seeded default." autoComplete="new-password" required error={fe.newPassword} {...sh} />
      <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" required error={fe.confirmPassword} {...sh} />
      <Submit>Change password</Submit>
    </form>
  );
}

export function TwoFactorSetupForm() {
  const [setup, start] = useActionState<TwoFactorSetup, FormData>(startTwoFactor, undefined);
  const [confirm, verify] = useActionState<TwoFactorSetup, FormData>(confirmTwoFactor, undefined);
  const [copied, setCopied] = useState(false);
  if (confirm?.notice) return <FormMessage notice={confirm.notice} />;
  const s = confirm?.qrSvg ? confirm : setup;
  if (!s?.qrSvg)
    return (
      <form action={start} noValidate className="flex max-w-sm flex-col gap-4">
        <FormMessage error={setup?.error} />
        <PasswordField name="password" label="Confirm your password" autoComplete="current-password" required error={setup?.fieldErrors?.password} {...sh} />
        <Submit className="sm:w-auto sm:self-start">Set up two-factor</Submit>
      </form>
    );
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: s.qrSvg }} />
        {s.secret ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigator.clipboard.writeText(s.secret!).then(() => setCopied(true))}
          >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            <span className="font-mono break-all">{s.secret}</span>
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-5">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy…).</li>
          <li>Save the backup codes somewhere safe. Each works once if you lose your phone.</li>
          <li>Enter the 6-digit code from the app to finish.</li>
        </ol>
        {s.backupCodes?.length ? (
          <ul aria-label="Backup codes" className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg p-3 font-mono text-sm sm:grid-cols-3">
            {s.backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
        <form action={verify} noValidate className="flex max-w-sm flex-col gap-4">
          <Field name="code" label="Code from your app" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required error={confirm?.fieldErrors?.code} />
          <Submit className="sm:w-auto sm:self-start">Turn on two-factor</Submit>
        </form>
      </div>
    </div>
  );
}

export function DisableTwoFactorForm() {
  const [state, action] = useActionState<FormState, FormData>(disableTwoFactor, undefined);
  return (
    <form action={action} noValidate className="flex max-w-sm flex-col gap-4">
      <FormMessage notice={state?.notice} error={state?.error} />
      <PasswordField name="password" label="Confirm your password" autoComplete="current-password" required error={state?.fieldErrors?.password} {...sh} />
      <Submit variant="outline" className="sm:w-auto sm:self-start">Turn off two-factor</Submit>
    </form>
  );
}

export function RefreshButton() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await refreshPublicContent();
          setDone(true);
        })
      }
    >
      {done ? <Check /> : <RefreshCw className={pending ? "animate-spin" : undefined} />}
      {done ? "Public pages refreshed" : "Refresh public pages"}
    </Button>
  );
}
