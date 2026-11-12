"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-md border border-line bg-bg px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-gold aria-[invalid=true]:border-red";

/** Error + server-rendered default (so fields aren't blank until hydration). */
function useFieldMeta(name: string) {
  const { formState } = useFormContext();
  const error = (get(formState.errors, name) as { message?: string } | undefined)?.message;
  const defaultValue = get(formState.defaultValues ?? {}, name) as unknown;
  return { error, defaultValue };
}

export function FieldShell({ id, label, hint, error, wide, children, required }: { id: string; label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactNode; required?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", wide && "sm:col-span-2")}>
      <label htmlFor={id} className="text-xs font-semibold">
        {label}
        {required ? <span className="text-red" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-[0.6875rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="text-xs text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) => [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;

export function TextField({ name, label, hint, type = "text", wide, required, lang, placeholder }: { name: string; label: string; hint?: string; type?: string; wide?: boolean; required?: boolean; lang?: string; placeholder?: string }) {
  const { register } = useFormContext();
  const { error, defaultValue } = useFieldMeta(name);
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} wide={wide} required={required}>
      <input
        id={id}
        type={type}
        defaultValue={defaultValue as string | undefined}
        lang={lang}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(inputCls, "h-10")}
        {...register(name)}
      />
    </FieldShell>
  );
}

export function TextAreaField({ name, label, hint, rows = 4, wide = true, lang }: { name: string; label: string; hint?: string; rows?: number; wide?: boolean; lang?: string }) {
  const { register } = useFormContext();
  const { error, defaultValue } = useFieldMeta(name);
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} wide={wide}>
      <textarea id={id} rows={rows} lang={lang} defaultValue={defaultValue as string | undefined} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={cn(inputCls, "py-2")} {...register(name)} />
    </FieldShell>
  );
}

export function SelectField({ name, label, options, hint, wide, empty }: { name: string; label: string; options: { value: string; label: string }[]; hint?: string; wide?: boolean; empty?: string }) {
  const { register } = useFormContext();
  const { error, defaultValue } = useFieldMeta(name);
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} wide={wide}>
      <select id={id} defaultValue={defaultValue as string | undefined} aria-invalid={!!error} aria-describedby={describedBy(id, hint, error)} className={cn(inputCls, "h-10")} {...register(name)}>
        {empty !== undefined ? <option value="">{empty}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const { register } = useFormContext();
  const { defaultValue } = useFieldMeta(name);
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" defaultChecked={!!defaultValue} className="mt-0.5 size-4 accent-[#FFB800]" aria-describedby={hint ? `${id}-hint` : undefined} {...register(name)} />
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-[0.6875rem] text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Multi-select as toggle chips (e.g. artist categories, linked artists). */
export function ChipsField({ name, label, options, hint, wide = true, searchable }: { name: string; label: string; options: { value: string; label: string; muted?: boolean }[]; hint?: string; wide?: boolean; searchable?: boolean }) {
  const { control } = useFormContext();
  const { error } = useFieldMeta(name);
  const id = useId();
  const [filter, setFilter] = useState("");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? [];
        const toggle = (v: string) => field.onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
        const shown = options.filter((o) => value.includes(o.value) || !filter || o.label.toLowerCase().includes(filter.toLowerCase()));
        return (
          <div className={cn("flex min-w-0 flex-col gap-1.5", wide && "sm:col-span-2")} role="group" aria-labelledby={`${id}-label`} data-field={name}>
            <span id={`${id}-label`} className="text-xs font-semibold">
              {label}
            </span>
            {searchable ? (
              <input type="search" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(inputCls, "h-8 max-w-60 text-xs")} aria-label={`Filter ${label}`} />
            ) : null}
            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {shown.map((o) => {
                const on = value.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(o.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on ? "border-gold bg-gold text-bg" : "border-line text-muted-foreground hover:text-foreground",
                      o.muted && !on && "opacity-70",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
            {error ? <p className="text-xs text-red">{error}</p> : null}
          </div>
        );
      }}
    />
  );
}

/** Free-form tags: Enter or comma adds, × removes. */
export function TagsField({ name, label, hint, wide }: { name: string; label: string; hint?: string; wide?: boolean }) {
  const { control } = useFormContext();
  const { error } = useFieldMeta(name);
  const id = useId();
  const [draft, setDraft] = useState("");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? [];
        const add = () => {
          const v = draft.trim().replace(/,$/, "");
          if (v && !value.includes(v)) field.onChange([...value, v]);
          setDraft("");
        };
        return (
          <FieldShell id={id} label={label} hint={hint ?? "Press Enter to add"} error={error} wide={wide}>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-line bg-bg px-2 py-1.5 focus-within:border-gold">
              {value.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs">
                  {t}
                  <button type="button" aria-label={`Remove ${t}`} onClick={() => field.onChange(value.filter((x) => x !== t))} className="text-muted-foreground hover:text-red">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id={id}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    add();
                  } else if (e.key === "Backspace" && !draft && value.length) field.onChange(value.slice(0, -1));
                }}
                onBlur={add}
                className="h-7 min-w-24 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </FieldShell>
        );
      }}
    />
  );
}
