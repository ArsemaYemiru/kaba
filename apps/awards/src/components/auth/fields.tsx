"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

const inputCls = (error?: string) =>
  cn(
    "h-12 w-full rounded-md border border-line bg-bg px-3.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-gold sm:text-sm",
    error && "border-red",
  );

/** Labelled input with hint and error wired to aria-describedby. */
export function Field({ label, error, hint, className, ...input }: InputProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className={inputCls(error)} {...input} />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({ label, error, hint, className, showLabel, hideLabel, ...input }: InputProps & { showLabel: string; hideLabel: string }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} aria-invalid={!!error} aria-describedby={describedBy} className={cn(inputCls(error), "pr-12")} {...input} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ name, label, error, defaultChecked, required }: { name: string; label: React.ReactNode; error?: string; defaultChecked?: boolean; required?: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex items-start gap-3 text-sm leading-snug">
        <input
          id={id}
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-gold"
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${id}-err`} className="pl-8 text-xs font-medium text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Submit({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: "default" | "outline" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant={variant} className={cn("w-full", className)} disabled={pending} aria-busy={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  );
}

export function FormMessage({ error, notice }: { error?: string; notice?: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-md border border-red/50 bg-red/10 px-3 py-2.5 text-sm">
        {error}
      </p>
    );
  if (notice)
    return (
      <p role="status" className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2.5 text-sm">
        {notice}
      </p>
    );
  return null;
}
