"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Link } from "@/i18n/navigation";
import { forgotPassword, resetPassword, signIn, verifyTwoFactor, type FormState } from "@/server/actions/auth";
import { Checkbox, Field, FormMessage, PasswordField, Submit } from "./fields";

const Next = ({ value }: { value?: string }) => (value ? <input type="hidden" name="next" value={value} /> : null);

export function SignInForm({ next }: { next?: string }) {
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
      <Next value={next ?? state?.values?.next} />
      <Submit>{t("signIn")}</Submit>
    </form>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, undefined);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
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
