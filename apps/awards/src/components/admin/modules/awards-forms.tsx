"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/awards/category-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addArtistsToCategory, bulkCategories, bulkHonorees, deleteEdition, reorderCategories, reorderHonorees, saveCategory, saveEdition, saveHonoree } from "@/server/actions/admin/awards";
import type { PickerMedia } from "@/server/actions/admin/media";
import { EditorShell, Section } from "../editor-shell";
import { SelectField, TextAreaField, TextField } from "../fields";
import { MediaProvider } from "../media-context";
import { MediaField } from "../media-field";
import { SlugField } from "./artist-form";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
const EDITION_STATUS_OPTS = [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Announced" }, { value: "ARCHIVED", label: "Archived" }];
const STATUS_OPTS = [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }];
/* ───────────────────────── Editions ───────────────────────── */
export type EditionFormValues = {
  year: string; nameEn: string; nameAm: string; slug: string; ceremonyAt: string;
  venue: string; broadcastPartner: string; heroMediaId: string | null; status: Status;
};
export function EditionForm({ id, initial, media, canDelete }: { id: string | null; initial: EditionFormValues; media: PickerMedia[]; canDelete: boolean }) {
  const form = useForm<EditionFormValues>({ defaultValues: initial });
  return (
    <MediaProvider initial={media}>
      <EditorShell
        form={form}
        title={useWatch({ control: form.control, name: "nameEn" }) || "New edition"}
        backHref="/admin/editions"
        backLabel="Editions"
        previewHref={id && initial.status === "PUBLISHED" ? `/awards/${initial.slug || initial.year}` : null}
        editHref={(i) => `/admin/editions/${i}`}
        onSave={(v) => saveEdition(id, v)}
        onDelete={
          id && canDelete
            ? async () => {
                const r = await deleteEdition(id);
                return r.ok ? { ok: true } : { ok: false, error: "error" in r ? r.error : "Couldn't delete." };
              }
            : undefined
        }
      >
        <Section title="Edition">
          <TextField name="year" label="Year" type="number" required />
          <TextField name="slug" label="URL slug" hint="Defaults to the year: /awards/2027." />
          <TextField name="nameEn" label="Name (English)" required />
          <TextField name="nameAm" label="Name (Amharic)" lang="am" />
          <SelectField name="status" label="Status" options={EDITION_STATUS_OPTS} hint="Draft stays hidden. Announced shows the edition, its genres and honorees on the site." />
        </Section>
        <Section title="Awards night (East Africa Time, optional)">
          <TextField name="ceremonyAt" label="Awards night" type="datetime-local" />
          <TextField name="venue" label="Venue" hint="Leave empty until confirmed (shows “To be confirmed”)." />
          <TextField name="broadcastPartner" label="Broadcast partner" />
          <MediaField name="heroMediaId" label="Hero image (fallback when Site Settings has none)" />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

/* ───────────────────────── Categories ───────────────────────── */
export type CategoryFormValues = {
  editionId: string; nameEn: string; nameAm: string; slug: string; descriptionEn: string; descriptionAm: string; icon: string; sortOrder: string; status: Status;
};
export function CategoryForm({ id, initial, editions, liveHref }: { id: string | null; initial: CategoryFormValues; editions: { id: string; label: string }[]; liveHref: string | null }) {
  const form = useForm<CategoryFormValues>({ defaultValues: initial });
  const icon = useWatch({ control: form.control, name: "icon" });
  return (
    <EditorShell
      form={form}
      title={useWatch({ control: form.control, name: "nameEn" }) || "New genre category"}
      backHref="/admin/categories"
      backLabel="Categories"
      previewHref={liveHref}
      editHref={(i) => `/admin/categories/${i}`}
      onSave={(v) => saveCategory(id, v)}
      onDelete={
        id
          ? async () => {
              const r = await bulkCategories({ ids: [id], op: "delete" });
              return r.ok ? { ok: true } : { ok: false, error: r.error };
            }
          : undefined
      }
    >
      <Section title="Genre category" description="A genre within this edition, e.g. Classical, Bati, Afrobeat.">
        <SelectField name="editionId" label="Edition" options={editions.map((e) => ({ value: e.id, label: e.label }))} wide />
        <TextField name="nameEn" label="Name (English)" required />
        <TextField name="nameAm" label="Name (Amharic)" lang="am" />
        <SlugField source="nameEn" />
        <SelectField name="status" label="Status" options={STATUS_OPTS} />
        <TextAreaField name="descriptionEn" label="Description (English)" rows={2} />
        <TextAreaField name="descriptionAm" label="Description (Amharic)" rows={2} lang="am" />
        <div className="flex flex-col gap-1.5">
          <SelectField name="icon" label="Icon" options={Object.keys(CATEGORY_ICONS).map((k) => ({ value: k, label: k }))} />
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <CategoryIcon name={icon} className="size-5 text-gold" /> Preview
          </span>
        </div>
        <TextField name="sortOrder" label="Sort order" type="number" hint="Or drag to reorder on the Categories list." />
      </Section>
    </EditorShell>
  );
}

/* ───────────────────────── Honorees ───────────────────────── */
export type HonoreeFormValues = {
  categoryId: string; artistId: string; displayNameEn: string; displayNameAm: string; slug: string; workTitleEn: string; workTitleAm: string;
  imageId: string | null; blurbEn: string; blurbAm: string; youtubeUrl: string; sortOrder: string; status: Status;
};
type ArtistOption = { id: string; nameEn: string; status: string };
const artistLabel = (a: ArtistOption) => a.nameEn + (a.status !== "PUBLISHED" ? " (draft: hidden until the artist is published)" : "");

export function HonoreeForm({ id, initial, media, categories, artists, liveHref }: {
  id: string | null; initial: HonoreeFormValues; media: PickerMedia[]; categories: { id: string; label: string }[]; artists: ArtistOption[]; liveHref: string | null;
}) {
  const form = useForm<HonoreeFormValues>({ defaultValues: initial });
  const artistId = useWatch({ control: form.control, name: "artistId" });
  const displayName = useWatch({ control: form.control, name: "displayNameEn" });
  const artistName = artists.find((a) => a.id === artistId)?.nameEn;
  return (
    <MediaProvider initial={media}>
      <EditorShell
        form={form}
        title={displayName || artistName || "New honoree"}
        backHref="/admin/honorees"
        backLabel="Honorees"
        previewHref={liveHref}
        editHref={(i) => `/admin/honorees/${i}`}
        onSave={(v) => saveHonoree(id, v)}
        onDelete={
          id
            ? async () => {
                const r = await bulkHonorees({ ids: [id], op: "delete" });
                return r.ok ? { ok: true } : { ok: false, error: r.error };
              }
            : undefined
        }
      >
        <Section title="Recognition" description="An artist honored in one genre category. Everyone in a category is recognized equally.">
          <SelectField name="categoryId" label="Genre category" options={categories.map((c) => ({ value: c.id, label: c.label }))} wide />
          <SelectField name="artistId" label="Artist" options={artists.map((a) => ({ value: a.id, label: artistLabel(a) }))} empty="Choose an artist…" wide hint="Add new artists under Content → Artists first." />
          <SelectField name="status" label="Status" options={STATUS_OPTS} hint="Published honorees appear once their edition is announced." />
          <TextField name="sortOrder" label="Sort order" type="number" />
        </Section>
        <Section title="Citation" description="Why this artist is recognized. Stick to facts you can stand behind.">
          <TextAreaField name="blurbEn" label="Citation (English)" rows={4} />
          <TextAreaField name="blurbAm" label="Citation (Amharic)" rows={4} lang="am" />
        </Section>
        <Section title="Featured work (optional)">
          <TextField name="workTitleEn" label="Song, album or video (English)" />
          <TextField name="workTitleAm" label="Song, album or video (Amharic)" lang="am" />
          <TextField name="youtubeUrl" label="YouTube link" type="url" placeholder="https://www.youtube.com/watch?v=…" />
          <MediaField name="imageId" label="Image (defaults to the artist's portrait)" />
        </Section>
        <Section title="Display (optional)">
          <TextField name="displayNameEn" label="Display name (English)" hint="Leave empty to use the artist's name." />
          <TextField name="displayNameAm" label="Display name (Amharic)" lang="am" />
          <SlugField source="displayNameEn" />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

/** Category edit page: place several artists into this genre at once (created as drafts). */
export function AddArtistsPanel({ categoryId, artists, placed }: { categoryId: string; artists: ArtistOption[]; placed: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const taken = new Set(placed);
  const shown = artists.filter((a) => !taken.has(a.id) && a.nameEn.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60);
  return (
    <section aria-labelledby="add-artists-title" className="rounded-lg border border-line bg-surface p-5">
      <h2 id="add-artists-title" className="font-display text-sm font-bold">Add artists to this genre</h2>
      <p className="mt-1 text-sm text-muted-foreground">They&apos;re added as drafts. Open each one to write the citation, then publish.</p>
      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
        Search artists
        <input value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-md border border-line bg-bg px-3 text-sm font-normal" placeholder="Type a name…" />
      </label>
      <ul className="mt-3 grid max-h-64 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2" aria-label="Artists">
        {shown.map((a) => (
          <li key={a.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={picked.includes(a.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))} />
              {artistLabel(a)}
            </label>
          </li>
        ))}
        {!shown.length ? <li className="px-2 py-1.5 text-sm text-muted-foreground">No artists to add.</li> : null}
      </ul>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={pending || !picked.length}
        onClick={() =>
          start(async () => {
            const r = await addArtistsToCategory({ categoryId, artistIds: picked });
            if (r.ok) {
              toast.success(`Added ${r.added} artist${r.added === 1 ? "" : "s"}${r.skipped ? ` (${r.skipped} already here)` : ""}`);
              setPicked([]);
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Add {picked.length || ""} selected
      </Button>
    </section>
  );
}

/* ───────────────────────── Drag to reorder ───────────────────────── */
function Row({ id, label, status, index }: { id: string; label: string; status: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex items-center gap-3 rounded-md border border-line bg-bg px-3 py-2 text-sm", isDragging && "z-10 border-gold shadow-lg")}>
      <button type="button" {...attributes} {...listeners} aria-label={`Drag ${label}`} className="cursor-grab text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
      <span className="flex-1 truncate">{label}</span>
      {status !== "PUBLISHED" ? <span className="text-xs text-muted-foreground lowercase">{status}</span> : null}
    </li>
  );
}

export function ReorderList({ kind, items }: { kind: "categories" | "honorees"; items: { id: string; label: string; status: string }[] }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [pending, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = list.findIndex((x) => x.id === e.active.id);
    const to = list.findIndex((x) => x.id === e.over!.id);
    const next = arrayMove(list, from, to);
    setList(next);
    start(async () => {
      const r = await (kind === "categories" ? reorderCategories : reorderHonorees)({ ids: next.map((x) => x.id) });
      if (r.ok) {
        toast.success("Order saved");
        router.refresh();
      } else toast.error("Couldn't save the order.");
    });
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={list.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <ol className={cn("flex flex-col gap-1.5", pending && "opacity-70")} aria-label={`Drag to reorder ${kind}`}>
          {list.map((x, i) => (
            <Row key={x.id} {...x} index={i} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
