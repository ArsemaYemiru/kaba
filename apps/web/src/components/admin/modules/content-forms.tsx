"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { deleteAlbum, saveAlbum } from "@/server/actions/albums";
import type { PickerMedia } from "@/server/actions/media";
import { deleteNews, saveNews } from "@/server/actions/news";
import { deleteVideo, saveVideo } from "@/server/actions/videos";
import { EditorShell, Section } from "../editor-shell";
import { CheckboxField, ChipsField, SelectField, TagsField, TextAreaField, TextField } from "../fields";
import { MediaProvider, useMediaLookup } from "../media-context";
import { MediaField, SortableTile } from "../media-field";
import { MediaPickerDialog } from "../media-picker";
import { MediaThumb } from "../media-thumb";
import { RichTextField } from "../rich-text";
import { SlugField } from "./artist-form";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
const STATUS_OPTS = [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }];
const del = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, id: string | null) =>
  id
    ? async () => {
        const r = await fn(id);
        return r.ok ? { ok: true } : { ok: false, error: r.error };
      }
    : undefined;

/* ─────────────── Videos ─────────────── */
export type VideoFormValues = {
  titleEn: string; titleAm: string; slug: string; type: string; source: "NONE" | "YOUTUBE" | "UPLOAD"; youtubeUrl: string; mediaId: string | null;
  captionsUrl: string; posterId: string | null; episodeId: string; artistIds: string[]; featured: boolean; status: Status; publishedAt: string;
};
export function VideoForm({ id, initial, media, episodes, artists }: { id: string | null; initial: VideoFormValues; media: PickerMedia[]; episodes: { id: string; titleEn: string }[]; artists: { id: string; nameEn: string; status: string }[] }) {
  const form = useForm<VideoFormValues>({ defaultValues: initial });
  const source = useWatch({ control: form.control, name: "source" });
  return (
    <MediaProvider initial={media}>
      <EditorShell form={form} title={useWatch({ control: form.control, name: "titleEn" }) || "New video"} backHref="/admin/videos" backLabel="Videos" previewHref={initial.status === "PUBLISHED" && id ? `/videos?type=${initial.type}` : null} editHref={(i) => `/admin/videos/${i}`} onSave={(v) => saveVideo(id, v)} onDelete={del(deleteVideo, id)}>
        <Section title="Video">
          <TextField name="titleEn" label="Title (English)" required />
          <TextField name="titleAm" label="Title (Amharic)" lang="am" />
          <SlugField source="titleEn" />
          <SelectField name="type" label="Type" options={[{ value: "FULL_EPISODE", label: "Full episode" }, { value: "HIGHLIGHT", label: "Highlight" }, { value: "PERFORMANCE", label: "Performance" }, { value: "BEHIND_THE_SCENES", label: "Behind the scenes" }, { value: "INTERVIEW", label: "Interview" }]} />
          <SelectField name="status" label="Status" options={STATUS_OPTS} />
          <TextField name="publishedAt" label="Publish date (Addis Ababa time)" type="datetime-local" hint="Set automatically when first published." />
          <CheckboxField name="featured" label="Featured" />
        </Section>
        <Section title="Source" description="With no source the player shows “Video coming soon”.">
          <SelectField name="source" label="Source" options={[{ value: "NONE", label: "None (coming soon)" }, { value: "YOUTUBE", label: "YouTube link" }, { value: "UPLOAD", label: "Uploaded file" }]} />
          {source === "YOUTUBE" ? <TextField name="youtubeUrl" label="YouTube URL" type="url" placeholder="https://www.youtube.com/watch?v=…" /> : null}
          {source === "UPLOAD" ? <MediaField name="mediaId" label="Video file (MP4/WebM)" type="VIDEO" /> : null}
          {source === "UPLOAD" ? <TextField name="captionsUrl" label="Captions (WebVTT URL)" type="url" hint="Optional .vtt subtitles for accessibility." /> : null}
          <MediaField name="posterId" label="Poster image" />
        </Section>
        <Section title="Links">
          <SelectField name="episodeId" label="Episode" empty="— none —" options={episodes.map((e) => ({ value: e.id, label: e.titleEn }))} wide />
          <ChipsField name="artistIds" label="Artists in this video" searchable options={artists.map((a) => ({ value: a.id, label: a.nameEn + (a.status !== "PUBLISHED" ? " (draft)" : ""), muted: a.status !== "PUBLISHED" }))} />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

/* ─────────────── Albums ─────────────── */
export type AlbumFormValues = { titleEn: string; titleAm: string; slug: string; descriptionEn: string; descriptionAm: string; coverId: string | null; episodeId: string; items: { mediaId: string; caption: string }[]; status: Status };
export function AlbumForm({ id, initial, media, episodes }: { id: string | null; initial: AlbumFormValues; media: PickerMedia[]; episodes: { id: string; titleEn: string }[] }) {
  const form = useForm<AlbumFormValues>({ defaultValues: initial });
  return (
    <MediaProvider initial={media}>
      <EditorShell form={form} title={useWatch({ control: form.control, name: "titleEn" }) || "New album"} backHref="/admin/gallery" backLabel="Gallery" previewHref={initial.status === "PUBLISHED" && initial.slug ? `/gallery/${initial.slug}` : null} editHref={(i) => `/admin/gallery/${i}`} onSave={(v) => saveAlbum(id, v)} onDelete={del(deleteAlbum, id)}>
        <Section title="Album">
          <TextField name="titleEn" label="Title (English)" required />
          <TextField name="titleAm" label="Title (Amharic)" lang="am" />
          <SlugField source="titleEn" />
          <SelectField name="status" label="Status" options={STATUS_OPTS} />
          <TextAreaField name="descriptionEn" label="Description (English)" rows={2} />
          <TextAreaField name="descriptionAm" label="Description (Amharic)" rows={2} lang="am" />
          <SelectField name="episodeId" label="Linked episode" empty="— none —" options={episodes.map((e) => ({ value: e.id, label: e.titleEn }))} />
          <MediaField name="coverId" label="Cover (defaults to the first photo)" />
        </Section>
        <Section title="Photos" description="Drag to reorder. Captions show in the lightbox; credits come from the Media Library.">
          <AlbumItems />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

function AlbumItems() {
  const { control, register } = useFormContext<AlbumFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "items" });
  const { media, remember } = useMediaLookup();
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = fields.map((f) => f.id);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <ImagePlus /> Add photos
      </Button>
      {fields.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {fields.map((f, i) => (
                <SortableTile key={f.id} id={f.id} label={media[f.mediaId]?.alt ?? "Photo"} onRemove={() => remove(i)}>
                  <MediaThumb media={media[f.mediaId]} className="aspect-square w-full rounded" />
                  <input {...register(`items.${i}.caption`)} placeholder="Caption" aria-label={`Caption for photo ${i + 1}`} className="mt-1 h-7 w-full rounded border border-line bg-bg px-1.5 text-xs" />
                </SortableTile>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-muted-foreground">No photos yet.</p>
      )}
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        type="IMAGE"
        multiple
        onPick={(picked) => {
          remember(picked);
          const existing = new Set(fields.map((f) => f.mediaId));
          for (const p of picked) if (!existing.has(p.id)) append({ mediaId: p.id, caption: "" });
        }}
      />
    </div>
  );
}

/* ─────────────── News ─────────────── */
export type NewsFormValues = { titleEn: string; titleAm: string; slug: string; excerptEn: string; excerptAm: string; bodyEn: string; bodyAm: string; coverId: string | null; tags: string[]; featured: boolean; status: Status; publishedAt: string };
export function NewsForm({ id, initial, media, liveSlug }: { id: string | null; initial: NewsFormValues; media: PickerMedia[]; liveSlug: string | null }) {
  const form = useForm<NewsFormValues>({ defaultValues: initial });
  return (
    <MediaProvider initial={media}>
      <EditorShell form={form} title={useWatch({ control: form.control, name: "titleEn" }) || "New post"} backHref="/admin/news" backLabel="News" previewHref={liveSlug ? `/news/${liveSlug}` : null} editHref={(i) => `/admin/news/${i}`} onSave={(v) => saveNews(id, v)} onDelete={del(deleteNews, id)}>
        <Section title="Post">
          <TextField name="titleEn" label="Title (English)" required />
          <TextField name="titleAm" label="Title (Amharic)" lang="am" />
          <SlugField source="titleEn" />
          <SelectField name="status" label="Status" options={STATUS_OPTS} />
          <TextField name="publishedAt" label="Publish date (Addis Ababa time)" type="datetime-local" hint="A future date with status Published schedules the post." />
          <CheckboxField name="featured" label="Featured" hint="Shown large at the top of the News page." />
          <TagsField name="tags" label="Tags" wide />
          <MediaField name="coverId" label="Cover image" />
        </Section>
        <Section title="Content">
          <TextAreaField name="excerptEn" label="Excerpt (English)" rows={2} />
          <TextAreaField name="excerptAm" label="Excerpt (Amharic)" rows={2} lang="am" />
          <RichTextField name="bodyEn" label="Body (English)" />
          <RichTextField name="bodyAm" label="Body (Amharic)" lang="am" />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}
