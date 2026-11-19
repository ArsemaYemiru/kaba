"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { forgotPassword, resendCode, resetPassword, signIn, signUp, verifyEmail, verifyTwoFactor, type FormState } from "@/server/actions/auth";
import { Checkbox, Field, FormMessage, PasswordField, Submit } from "./fields";
import { Turnstile } from "./turnstile";

const Next = ({ value }: { value?: string }) => (value ? <input type="hidden" name="next" value={value} /> : null);

export function SignUpForm({ siteKey, next }: { siteKey: string | null; next?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(signUp, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <Field name="displayName" label={t("displayName")} hint={t("displayNameHint")} autoComplete="nickname" required maxLength={60} defaultValue={state?.values?.displayName} error={fe.displayName} />
      <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required defaultValue={state?.values?.email} error={fe.email} />
      <PasswordField name="password" label={t("password")} hint={t("passwordHint")} autoComplete="new-password" required minLength={10} error={fe.password} showLabel={t("show")} hideLabel={t("hide")} />
      <Checkbox
        name="consent"
        required
        error={fe.consent}
        label={t.rich("consent", {
          rules: (c) => (
            <Link href="/rules" target="_blank" className="font-semibold text-gold underline-offset-2 hover:underline">
              {c}
            </Link>
          ),
          privacy: (c) => (
            <Link href="/privacy" target="_blank" className="font-semibold text-gold underline-offset-2 hover:underline">
              {c}
            </Link>
          ),
        })}
      />
      <Checkbox name="newsOptIn" label={t("newsOptIn")} />
      <Turnstile siteKey={siteKey} label={t("securityCheck")} />
      <Next value={next ?? state?.values?.next} />
      <Submit className="mt-1">{t("signUp")}</Submit>
    </form>
  );
}

export function SignInForm({ siteKey, next }: { siteKey: string | null; next?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(signIn, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <Field name="email" type="email" label={t("email")} autoComplete="username" inputMode="email" required defaultValue={state?.values?.email} error={fe.email} />
      <PasswordField name="password" label={t("password")} autoComplete="current-password" required error={fe.password} showLabel={t("show")} hideLabel={t("hide")} />
      <div className="-mt-1 text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-gold hover:underline">
          {t("forgot")}
        </Link>
      </div>
      <Turnstile siteKey={siteKey} label={t("securityCheck")} />
      <Next value={next ?? state?.values?.next} />
      <Submit>{t("signIn")}</Submit>
    </form>
  );
}

export function VerifyForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(verifyEmail, undefined);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field
        name="code"
        label={t("code")}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        className="[&_input]:text-center [&_input]:font-display [&_input]:text-2xl [&_input]:tracking-[0.5em]"
        error={state?.fieldErrors?.code}
      />
      <Next value={next} />
      <Submit>{t("verify")}</Submit>
    </form>
  );
}

/** Resend with the 60-second cooldown the server enforces (the countdown is just a hint). */
export function ResendForm({ initialWait = 0 }: { initialWait?: number }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState>(resendCode, undefined);
  const [left, setLeft] = useState(initialWait);
  const wait = state?.retryAfter;
  useEffect(() => {
    if (wait === undefined) return;
    const end = Date.now() + wait * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [wait, state]);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage notice={state?.notice} error={state?.error} />
      <button type="submit" disabled={left > 0} className="text-sm font-semibold text-gold hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline">
        {left > 0 ? t("resendIn", { seconds: left }) : t("resend")}
      </button>
    </form>
  );
}

export function ForgotForm({ siteKey }: { siteKey: string | null }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, undefined);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      <Turnstile siteKey={siteKey} label={t("securityCheck")} />
      <Submit>{t("sendCode")}</Submit>
    </form>
  );
}

export function ResetForm({ email }: { email?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(resetPassword, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <Field name="email" type="email" label={t("email")} autoComplete="username" required defaultValue={state?.values?.email ?? email} error={fe.email} />
      <Field name="code" label={t("code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required error={fe.code} />
      <PasswordField name="password" label={t("newPassword")} hint={t("passwordHint")} autoComplete="new-password" required error={fe.password} showLabel={t("show")} hideLabel={t("hide")} />
      <PasswordField name="confirmPassword" label={t("confirmPassword")} autoComplete="new-password" required error={fe.confirmPassword} showLabel={t("show")} hideLabel={t("hide")} />
      <Submit>{t("resetSubmit")}</Submit>
    </form>
  );
}

export function TwoFactorForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(verifyTwoFactor, undefined);
  const [backup, setBackup] = useState(false);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <input type="hidden" name="method" value={backup ? "backup" : "totp"} />
      <Field
        key={backup ? "b" : "t"}
        name="code"
        label={backup ? t("backupCode") : t("authCode")}
        inputMode={backup ? "text" : "numeric"}
        autoComplete="one-time-code"
        required
        autoFocus
        error={state?.fieldErrors?.code}
      />
      <Checkbox name="trustDevice" label={t("trustDevice")} />
      <Next value={next} />
      <Submit>{t("continue")}</Submit>
      <button type="button" onClick={() => setBackup((b) => !b)} className="text-sm font-medium text-gold hover:underline">
        {backup ? t("useApp") : t("useBackup")}
      </button>
    </form>
  );
}
