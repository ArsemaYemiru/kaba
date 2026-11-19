import { useId } from "react";
import { cn } from "@/lib/utils";

/** Labelled input with hint + error wired to aria-describedby. */
export function FormField({
  label,
  error,
  hint,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-md border border-line bg-bg px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-gold",
          error && "border-red",
        )}
        {...input}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
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
