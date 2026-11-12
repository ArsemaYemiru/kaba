"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AudienceSchema, CONTESTANT_CATEGORIES, ContestantSchema, SponsorSchema, type JoinResult } from "@/schemas/join";
import { submitJoin } from "@/server/actions/join";

type Tab = "contestant" | "audience" | "sponsor";
const TABS: Tab[] = ["contestant", "audience", "sponsor"];

export function JoinForms() {
  const t = useTranslations("join");
  const params = useSearchParams();
  const initial = (TABS as string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "contestant";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-0">
      <TabsList variant="line" className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto border-b border-line bg-transparent p-0">
        {TABS.map((k) => (
          <TabsTrigger
            key={k}
            value={k}
            className="relative h-12 flex-none rounded-none border-0 px-4 font-display text-sm font-bold text-muted-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-active:text-gold! data-active:bg-transparent! data-active:shadow-none! data-active:after:bg-gold! after:bottom-0! after:opacity-100!"
          >
            {t(`tabs.${k}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="contestant" className="pt-8">
        <ContestantForm />
      </TabsContent>
      <TabsContent value="audience" className="pt-8">
        <AudienceForm />
      </TabsContent>
      <TabsContent value="sponsor" className="pt-8">
        <SponsorForm />
      </TabsContent>
    </Tabs>
  );
}

/* ───────────────────────── shared plumbing ───────────────────────── */

// Field names are fixed in this file, so the helpers take an untyped form
// handle; each schema still validates on the client and again on the server.
type AnyForm = UseFormReturn<FieldValues>;

function useJoinForm<S extends z.ZodType<FieldValues, FieldValues>>(schema: S, defaults: z.input<S>) {
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues: defaults as never,
    // Validate on submit first: blur-time errors shift the layout and can swallow the Send click.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const [result, setResult] = useState<JoinResult | null>(null);
  const [pending, start] = useTransition();

  // Client validation gates the submit; the server re-validates the raw values.
  const onSubmit = form.handleSubmit(() =>
    start(async () => {
      const r = await submitJoin({ ...defaults, ...form.getValues() });
      if (!r.ok && r.fieldErrors) {
        for (const [k, msg] of Object.entries(r.fieldErrors)) (form as unknown as AnyForm).setError(k, { message: msg });
      }
      setResult(r);
    }),
  );
  return { form: form as unknown as AnyForm, reset: () => form.reset(defaults as never), result, setResult, pending, onSubmit };
}

function Success({ onReset }: { onReset: () => void }) {
  const t = useTranslations("join");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void import("canvas-confetti").then(({ default: confetti }) =>
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#FFB800", "#FF3B4E", "#1FAA59", "#F4F4F5"], disableForReducedMotion: true }),
    );
  }, []);
  return (
    <div role="status" className="flex flex-col items-center rounded-lg border border-green/40 bg-surface px-6 py-14 text-center">
      <CheckCircle2 className="size-12 text-green" aria-hidden="true" />
      <h3 className="mt-4 font-display text-2xl font-bold">{t("successTitle")}</h3>
      <p className="mt-2 max-w-md text-muted-foreground">{t("successBody")}</p>
      <Button variant="outline" className="mt-6" onClick={onReset}>
        {t("another")}
      </Button>
    </div>
  );
}

function FormShell({
  form,
  result,
  pending,
  onSubmit,
  intro,
  children,
}: {
  form: AnyForm;
  result: JoinResult | null;
  pending: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  intro: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("join");
  const err = result && !result.ok ? result.error : null;
  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl">
      <p className="mb-6 text-muted-foreground">{intro}</p>
      {err ? (
        <p role="alert" className="mb-6 rounded-md border border-red/50 bg-red/10 px-4 py-3 text-sm text-foreground">
          {t(`errors.${err}`)}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {t("fields.website")}
          <input type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
        </label>
      </div>
      <Consent form={form} />
      <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function Consent({ form }: { form: AnyForm }) {
  const t = useTranslations("join");
  const id = useId();
  const error = form.formState.errors["consent"]?.message as string | undefined;
  return (
    <div className="mt-6">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 accent-[#FFB800]"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          {...form.register("consent")}
        />
        <label htmlFor={id} className="text-sm text-muted-foreground">
          {t.rich("fields.consent", {
            link: (chunks) => (
              <Link href="/privacy" className="font-semibold text-gold underline underline-offset-2" target="_blank">
                {chunks}
              </Link>
            ),
          })}
        </label>
      </div>
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-sm text-red">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  form,
  name,
  label,
  hint,
  type = "text",
  as,
  wide,
  children,
  inputMode,
  autoComplete,
  min,
  max,
}: {
  form: AnyForm;
  name: string;
  label: string;
  hint?: string;
  type?: string;
  as?: "textarea" | "select";
  wide?: boolean;
  children?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  min?: string | number;
  max?: string | number;
}) {
  const t = useTranslations("join");
  const id = useId();
  const error = form.formState.errors[name]?.message as string | undefined;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  const cls = cn(
    "w-full rounded-md border border-line bg-surface px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-gold",
    error && "border-red",
  );
  const common = { id, "aria-invalid": !!error, "aria-describedby": describedBy, ...form.register(name) };
  return (
    <div className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {as === "textarea" ? (
        <textarea rows={5} className={cn(cls, "py-3")} {...common} />
      ) : as === "select" ? (
        <select className={cn(cls, "h-12")} {...common}>
          {children}
        </select>
      ) : (
        <input type={type} className={cn(cls, "h-12")} inputMode={inputMode} autoComplete={autoComplete} min={min} max={max} {...common} />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="text-sm text-red">
          {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.required")}
        </p>
      ) : null}
    </div>
  );
}

/* ───────────────────────── the three forms ───────────────────────── */

function ContestantForm() {
  const t = useTranslations("join");
  const ta = useTranslations("artist");
  const defaults: z.input<typeof ContestantSchema> = {
    type: "CONTESTANT", name: "", phone: "", email: "", city: "", category: "" as never, socialLinks: "", whyYou: "", videoLink: "", consent: false as never, website: "",
  };
  const { form, reset, result, setResult, pending, onSubmit } = useJoinForm(ContestantSchema, defaults);
  if (result?.ok) return <Success onReset={() => { reset(); setResult(null); }} />;
  return (
    <FormShell form={form} result={result} pending={pending} onSubmit={onSubmit} intro={t("tabIntro.contestant")}>
      <Field form={form} name="name" label={t("fields.name")} autoComplete="name" />
      <Field form={form} name="phone" label={t("fields.phone")} hint={t("fields.phoneHint")} type="tel" inputMode="tel" autoComplete="tel" />
      <Field form={form} name="email" label={t("fields.email")} type="email" autoComplete="email" />
      <Field form={form} name="city" label={t("fields.city")} autoComplete="address-level2" />
      <Field form={form} name="category" label={t("fields.category")} as="select" wide>
        <option value="">{t("fields.categoryPlaceholder")}</option>
        {CONTESTANT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {ta(`categories.${c}`)}
          </option>
        ))}
      </Field>
      <Field form={form} name="whyYou" label={t("fields.whyYou")} hint={t("fields.whyYouHint")} as="textarea" wide />
      <Field form={form} name="socialLinks" label={t("fields.socialLinks")} hint={t("fields.socialLinksHint")} as="textarea" wide />
      <Field form={form} name="videoLink" label={t("fields.videoLink")} hint={t("fields.videoLinkHint")} type="url" inputMode="url" wide />
    </FormShell>
  );
}

function AudienceForm() {
  const t = useTranslations("join");
  const defaults: z.input<typeof AudienceSchema> = { type: "AUDIENCE", name: "", phone: "", preferredDate: "", groupSize: 1, consent: false as never, website: "" };
  const { form, reset, result, setResult, pending, onSubmit } = useJoinForm(AudienceSchema, defaults);
  const [today, setToday] = useState<string | undefined>(undefined);
  useEffect(() => {
    const id = window.setTimeout(() => setToday(new Date().toISOString().slice(0, 10)), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (result?.ok) return <Success onReset={() => { reset(); setResult(null); }} />;
  return (
    <FormShell form={form} result={result} pending={pending} onSubmit={onSubmit} intro={t("tabIntro.audience")}>
      <Field form={form} name="name" label={t("fields.name")} autoComplete="name" />
      <Field form={form} name="phone" label={t("fields.phone")} hint={t("fields.phoneHint")} type="tel" inputMode="tel" autoComplete="tel" />
      <Field form={form} name="preferredDate" label={t("fields.preferredDate")} type="date" min={today} />
      <Field form={form} name="groupSize" label={t("fields.groupSize")} hint={t("fields.groupSizeHint")} type="number" inputMode="numeric" min={1} max={10} />
    </FormShell>
  );
}

function SponsorForm() {
  const t = useTranslations("join");
  const defaults: z.input<typeof SponsorSchema> = { type: "SPONSOR", company: "", name: "", phone: "", email: "", message: "", consent: false as never, website: "" };
  const { form, reset, result, setResult, pending, onSubmit } = useJoinForm(SponsorSchema, defaults);
  if (result?.ok) return <Success onReset={() => { reset(); setResult(null); }} />;
  return (
    <FormShell form={form} result={result} pending={pending} onSubmit={onSubmit} intro={t("tabIntro.sponsor")}>
      <Field form={form} name="company" label={t("fields.company")} autoComplete="organization" wide />
      <Field form={form} name="name" label={t("fields.contactName")} autoComplete="name" />
      <Field form={form} name="phone" label={t("fields.phone")} hint={t("fields.phoneHint")} type="tel" inputMode="tel" autoComplete="tel" />
      <Field form={form} name="email" label={t("fields.email")} type="email" autoComplete="email" wide />
      <Field form={form} name="message" label={t("fields.message")} as="textarea" wide />
    </FormShell>
  );
}
