"use client";

import { ArrowLeft, ExternalLink, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { FormProvider, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SaveResult } from "@/schemas/admin/common";

/**
 * Edit page frame (spec §5): sticky save bar, Ctrl/Cmd+S, unsaved-changes
 * warning (reloads, closing the tab and in-app links), toasts, server field
 * errors mapped back onto the form.
 */
export function EditorShell<T extends FieldValues>({
  form,
  title,
  backHref,
  backLabel,
  previewHref,
  onSave,
  onDelete,
  editHref,
  children,
}: {
  form: UseFormReturn<T>;
  title: string;
  backHref: string;
  backLabel: string;
  previewHref?: string | null;
  onSave: (values: T) => Promise<SaveResult>;
  onDelete?: () => Promise<{ ok: boolean; error?: string }>;
  /** Builds the edit URL for a newly created item. */
  editHref: (id: string) => string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dirty = form.formState.isDirty;
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const submit = useCallback(() => {
    const values = form.getValues();
    start(async () => {
      form.clearErrors();
      const r = await onSave(values);
      if (r.ok) {
        toast.success("Saved");
        // Show the server-generated slug (empty slug = derived from the title).
        const next = r.slug && "slug" in values ? ({ ...values, slug: r.slug } as T) : values;
        form.reset(next);
        dirtyRef.current = false;
        if (!window.location.pathname.endsWith(`/${r.id}`)) router.replace(editHref(r.id)); // just created
        router.refresh();
        return;
      }
      if ("fieldErrors" in r && r.fieldErrors) {
        for (const [path, message] of Object.entries(r.fieldErrors)) form.setError(path as Path<T>, { type: "server", message });
        const first = Object.keys(r.fieldErrors)[0];
        if (first) document.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"], [data-field="${CSS.escape(first)}"]`)?.focus();
      }
      toast.error(r.error === "forbidden" ? "You're not allowed to do that." : r.error);
    });
  }, [editHref, form, onSave, router]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pending) submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, submit]);

  // Warn before losing unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || e.metaKey || e.ctrlKey) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mx-auto w-full max-w-5xl px-4 pb-28 sm:px-6"
      >
        <div className="sticky top-14 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> {backLabel}
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold">{title}</h1>
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {pending ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          {previewHref ? (
            <Button asChild size="sm" variant="ghost">
              <a href={previewHref} target="_blank" rel="noopener">
                Preview <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red hover:text-red"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Delete “${title}”? This can't be undone.`)) return;
                start(async () => {
                  const r = await onDelete();
                  if (r.ok) {
                    dirtyRef.current = false;
                    toast.success("Deleted");
                    router.replace(backHref);
                    router.refresh();
                  } else toast.error(r.error ?? "Couldn't delete.");
                });
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={pending} aria-keyshortcuts="Control+S Meta+S">
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
        </div>
        <div className="flex flex-col gap-6">{children}</div>
      </form>
    </FormProvider>
  );
}

export function Section({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 ${className ?? ""}`}>
      <h2 className="font-display text-sm font-bold">{title}</h2>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
