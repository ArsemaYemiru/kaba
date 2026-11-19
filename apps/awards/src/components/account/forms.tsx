"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Checkbox, Field, FormMessage, PasswordField, Submit } from "@/components/auth/fields";
import { changePassword, deleteAccount, sendPhoneCode, signOutEverywhere, updateProfile, verifyPhone } from "@/server/actions/account";
import type { FormState } from "@/server/actions/auth";

export function ProfileForm({ displayName, newsOptIn }: { displayName: string; newsOptIn: boolean }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage notice={state?.notice} error={state?.error} />
      <Field name="displayName" label={t("auth.displayName")} hint={t("auth.displayNameHint")} defaultValue={displayName} maxLength={60} required autoComplete="nickname" error={state?.fieldErrors?.displayName} />
      <Checkbox name="newsOptIn" defaultChecked={newsOptIn} label={t("account.newsOptIn")} />
      <Submit variant="outline" className="sm:w-auto sm:self-start">{t("account.save")}</Submit>
    </form>
  );
}

export function PasswordForm({ min }: { min: number }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(changePassword, undefined);
  const fe = state?.fieldErrors ?? {};
  const sh = { showLabel: t("auth.show"), hideLabel: t("auth.hide") };
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage notice={state?.notice} error={state?.error} />
      <input type="text" name="username" autoComplete="username" hidden readOnly aria-hidden="true" />
      <PasswordField name="currentPassword" label={t("auth.currentPassword")} autoComplete="current-password" required error={fe.currentPassword} {...sh} />
      <PasswordField name="newPassword" label={t("auth.newPassword")} hint={`${min}+`} autoComplete="new-password" required error={fe.newPassword} {...sh} />
      <PasswordField name="confirmPassword" label={t("auth.confirmPassword")} autoComplete="new-password" required error={fe.confirmPassword} {...sh} />
      <Submit variant="outline" className="sm:w-auto sm:self-start">{t("account.changePassword")}</Submit>
    </form>
  );
}

export function PhoneForm({ current }: { current?: string | null }) {
  const t = useTranslations("account");
  const [sendState, send] = useActionState<FormState, FormData>(sendPhoneCode, undefined);
  const [verifyState, verify] = useActionState<FormState, FormData>(verifyPhone, undefined);
  const phone = verifyState?.values?.phone ?? sendState?.values?.phone ?? current ?? "";
  const sent = (sendState?.values?.sent === "1" || verifyState?.values?.sent === "1") && !verifyState?.notice;
  return (
    <div className="flex flex-col gap-4">
      <FormMessage notice={verifyState?.notice ?? sendState?.notice} error={verifyState?.error ?? sendState?.error} />
      <form action={send} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field name="phone" type="tel" label={t("phone")} autoComplete="tel" inputMode="tel" defaultValue={phone} required className="flex-1" error={sendState?.fieldErrors?.phone} />
        <Submit variant="outline" className="sm:w-auto">{t("sendPhoneCode")}</Submit>
      </form>
      {sent ? (
        <form action={verify} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="phone" value={phone} />
          <Field name="code" label={t("phoneCode")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="flex-1" error={verifyState?.fieldErrors?.code} />
          <Submit className="sm:w-auto">{t("verifyPhone")}</Submit>
        </form>
      ) : null}
    </div>
  );
}

export function SignOutAllForm() {
  const t = useTranslations("account");
  return (
    <form action={signOutEverywhere}>
      <Submit variant="outline" className="sm:w-auto">{t("signOutAll")}</Submit>
    </form>
  );
}

export function DeleteForm({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations();
  const [state, action] = useActionState<FormState, FormData>(deleteAccount, undefined);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage error={state?.error} />
      {hasPassword ? (
        <PasswordField name="password" label={t("auth.password")} autoComplete="current-password" required error={state?.fieldErrors?.password} showLabel={t("auth.show")} hideLabel={t("auth.hide")} />
      ) : (
        <input type="hidden" name="password" value="-" />
      )}
      <Field name="confirm" label={t("account.deleteConfirm")} autoComplete="off" required error={state?.fieldErrors?.confirm} />
      <Submit variant="destructive" className="sm:w-auto sm:self-start">{t("account.deleteButton")}</Submit>
    </form>
  );
}
