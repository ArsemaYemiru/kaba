"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";
import { ARTIST_CATEGORIES, SOCIAL_PLATFORMS } from "@/schemas/admin/content";
import { deleteArtist, saveArtist } from "@/server/actions/artists";
import type { PickerMedia } from "@/server/actions/media";
import { EditorShell, Section } from "../editor-shell";
import { CheckboxField, ChipsField, SelectField, TagsField, TextAreaField, TextField } from "../fields";
import { MediaProvider } from "../media-context";
import { MediaField, MediaListField } from "../media-field";
import { RichTextField } from "../rich-text";

export type ArtistFormValues = {
  nameEn: string;
  nameAm: string;
  slug: string;
  stageName: string;
  legalNameEn: string;
  legalNameAm: string;
  isGroup: boolean;
  categories: string[];
  shortBioEn: string;
  shortBioAm: string;
  bioEn: string;
  bioAm: string;
  birthYear: string;
  deathYear: string;
  yearsActive: string;
  genres: string[];
  notableWorks: { title: string; year: string; type: string }[];
  socialLinks: { platform: string; url: string }[];
  portraitId: string | null;
  coverId: string | null;
  galleryIds: string[];
  videoIds: string[];
  isLegend: boolean;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sortOrder: string;
  seoTitle: string;
  seoDescription: string;
};

const CATEGORY_LABELS: Record<string, string> = { SINGER: "Singer", MUSICIAN: "Musician", ACTOR: "Actor", COMEDIAN: "Comedian", DANCER: "Dancer", PRODUCER_DJ: "Producer/DJ", HOST_MEDIA: "Host/Media", OTHER: "Other" };

export function ArtistForm({
  id,
  initial,
  media,
  videos,
  publishedSlug,
}: {
  id: string | null;
  initial: ArtistFormValues;
  media: PickerMedia[];
  videos: { id: string; titleEn: string; status: string }[];
  publishedSlug: string | null;
}) {
  const form = useForm<ArtistFormValues>({ defaultValues: initial });
  const name = useWatch({ control: form.control, name: "nameEn" });
  return (
    <MediaProvider initial={media}>
      <EditorShell
        form={form}
        title={id ? name || "Artist" : name ? `New: ${name}` : "New artist"}
        backHref="/admin/artists"
        backLabel="Artists"
        previewHref={publishedSlug ? `/artists/${publishedSlug}` : null}
        editHref={(newId) => `/admin/artists/${newId}`}
        onSave={(v) => saveArtist(id, v)}
        onDelete={id ? async () => {
          const r = await deleteArtist(id);
          return r.ok ? { ok: true } : { ok: false, error: r.error };
        } : undefined}
      >
        <Section title="Names">
          <TextField name="nameEn" label="Name (English)" required />
          <TextField name="nameAm" label="Name (Amharic)" lang="am" />
          <TextField name="stageName" label="Stage name" />
          <SlugField source="nameEn" />
          <TextField name="legalNameEn" label="Legal name (English)" />
          <TextField name="legalNameAm" label="Legal name (Amharic)" lang="am" />
          <CheckboxField name="isGroup" label="This is a band or group" hint="Shown as a group (MusicGroup) instead of a person." />
        </Section>

        <Section title="Publishing">
          <SelectField name="status" label="Status" options={[{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }]} />
          <TextField name="sortOrder" label="Sort order" type="number" hint="Lower numbers appear first." />
          <CheckboxField name="isLegend" label="Legend" hint="Shown in the “Legends of Ethiopian music” rail." />
          <CheckboxField name="featured" label="Featured" hint="Eligible for the home page spotlight (order set in Site Settings)." />
        </Section>

        <Section title="About">
          <ChipsField name="categories" label="Categories" options={ARTIST_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))} />
          <TagsField name="genres" label="Genres" wide />
          <TextField name="birthYear" label="Birth year" type="number" />
          <TextField name="deathYear" label="Death year" type="number" />
          <TextField name="yearsActive" label="Years active" hint={`A start year like “2012” shows as “Active since 2012”. Never “–present”.`} />
          <TextAreaField name="shortBioEn" label="Short bio (English)" rows={3} />
          <TextAreaField name="shortBioAm" label="Short bio (Amharic)" rows={3} lang="am" />
          <RichTextField name="bioEn" label="Full bio (English)" />
          <RichTextField name="bioAm" label="Full bio (Amharic)" lang="am" />
        </Section>

        <Section title="Photos" description="Upload only photos you have the rights to use. Without a portrait, the branded fallback is shown.">
          <MediaField name="portraitId" label="Portrait (3:4)" />
          <MediaField name="coverId" label="Cover (wide)" />
          <MediaListField name="galleryIds" label="Gallery" hint="Drag to reorder." />
        </Section>

        <Section title="Notable works">
          <WorksRepeater />
        </Section>

        <Section title="Social links">
          <SocialRepeater />
        </Section>

        <Section title="Linked videos">
          <ChipsField name="videoIds" label="Videos featuring this artist" searchable options={videos.map((v) => ({ value: v.id, label: v.titleEn + (v.status !== "PUBLISHED" ? " (draft)" : ""), muted: v.status !== "PUBLISHED" }))} />
        </Section>

        <Section title="SEO">
          <TextField name="seoTitle" label="SEO title" hint="Up to 70 characters. Defaults to the name." />
          <TextAreaField name="seoDescription" label="SEO description" rows={2} />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

/** Slug input with a "generate from title" helper. */
export function SlugField({ source }: { source: string }) {
  const { setValue, getValues } = useFormContext();
  return (
    <div className="flex flex-col gap-1.5">
      <TextField name="slug" label="URL slug" hint="Leave empty to generate from the name." />
      <button type="button" className="self-start text-[0.6875rem] text-gold hover:underline" onClick={() => setValue("slug", slugify(String(getValues(source) ?? "")), { shouldDirty: true })}>
        Generate from title
      </button>
    </div>
  );
}

function WorksRepeater() {
  const { control, register } = useFormContext<ArtistFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "notableWorks" });
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Title
            <input {...register(`notableWorks.${i}.title`)} className="h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2.5 text-sm" />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Year
            <input type="number" {...register(`notableWorks.${i}.year`)} className="h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2.5 text-sm" />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Type
            <input {...register(`notableWorks.${i}.type`)} placeholder="Album, film…" className="h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2.5 text-sm" />
          </label>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove work ${i + 1}`} onClick={() => remove(i)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => append({ title: "", year: "", type: "" })}>
        <Plus /> Add work
      </Button>
    </div>
  );
}

function SocialRepeater() {
  const { control, register } = useFormContext<ArtistFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "socialLinks" });
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[9rem_1fr_auto]">
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Platform
            <select {...register(`socialLinks.${i}.platform`)} className="h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2 text-sm">
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            URL
            <input type="url" {...register(`socialLinks.${i}.url`)} placeholder="https://" className="h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2.5 text-sm" />
          </label>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove link ${i + 1}`} onClick={() => remove(i)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => append({ platform: "instagram", url: "" })}>
        <Plus /> Add link
      </Button>
    </div>
  );
}
