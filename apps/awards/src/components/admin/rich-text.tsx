"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2, Unlink } from "lucide-react";
import { useId } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

/** Tiptap rich text bound to a form field; HTML is sanitised again on the server. */
export function RichTextField({ name, label, lang, hint }: { name: string; label: string; lang?: string; hint?: string }) {
  const { control, formState } = useFormContext();
  const error = (get(formState.errors, name) as { message?: string } | undefined)?.message;
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2" data-field={name}>
      <span id={`${id}-label`} className="text-xs font-semibold">
        {label}
      </span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => <Editor_ value={field.value ?? ""} onChange={field.onChange} lang={lang} labelledBy={`${id}-label`} invalid={!!error} />}
      />
      {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-red">{error}</p> : null}
    </div>
  );
}

function Editor_({ value, onChange, lang, labelledBy, invalid }: { value: string; onChange: (html: string) => void; lang?: string; labelledBy: string; invalid: boolean }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] } })],
    content: value,
    editorProps: {
      attributes: {
        class: "prose-feta min-h-40 px-3 py-2.5 text-sm focus:outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        ...(lang ? { lang } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  return (
    <div className={cn("rounded-md border border-line bg-bg focus-within:border-gold", invalid && "border-red")}>
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b border-line" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) => cn("flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-surface-2 hover:text-foreground", active && "bg-surface-2 text-gold");
  const items: { label: string; icon: React.ComponentType<{ className?: string }>; run: () => void; active?: boolean }[] = [
    { label: "Bold", icon: Bold, run: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { label: "Italic", icon: Italic, run: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { label: "Heading", icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { label: "Subheading", icon: Heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { label: "Bullet list", icon: List, run: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { label: "Numbered list", icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { label: "Quote", icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
    {
      label: "Link",
      icon: Link2,
      run: () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL (https://…, mailto:… or /path)", prev ?? "https://");
        if (url === null) return;
        if (!url.trim()) editor.chain().focus().unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      },
      active: editor.isActive("link"),
    },
    { label: "Remove link", icon: Unlink, run: () => editor.chain().focus().unsetLink().run() },
    { label: "Undo", icon: Undo2, run: () => editor.chain().focus().undo().run() },
    { label: "Redo", icon: Redo2, run: () => editor.chain().focus().redo().run() },
  ];
  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-line p-1">
      {items.map((i) => (
        <button key={i.label} type="button" title={i.label} aria-label={i.label} aria-pressed={i.active} className={btn(!!i.active)} onClick={i.run}>
          <i.icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
