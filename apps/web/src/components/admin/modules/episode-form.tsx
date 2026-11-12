"use client";

import { Plus, Trash2 } from "lucide-react";
import { get, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { deleteEpisode, saveEpisode } from "@/server/actions/episodes";
import type { PickerMedia } from "@/server/actions/media";
import { EditorShell, Section } from "../editor-shell";
import { CheckboxField, SelectField, TextField } from "../fields";
import { MediaProvider } from "../media-context";
import { MediaField, MediaListField } from "../media-field";
import { RichTextField } from "../rich-text";
import { SlugField } from "./artist-form";

export type EpisodeFormValues = {
  titleEn: string;
  titleAm: string;
  slug: string;
  season: string;
  episodeNumber: string;
  type: "GAME_SHOW" | "HOLIDAY_SPECIAL" | "PERFORMANCE" | "BEHIND_THE_SCENES";
  airDate: string;
  participants: { side: "A" | "B"; artistId: string; guestName: string }[];
  rounds: { nameEn: string; nameAm: string; scoreA: string; scoreB: string }[];
  result: "NONE" | "A" | "B" | "TIE";
  videoSource: "NONE" | "YOUTUBE" | "UPLOAD";
  youtubeUrl: string;
  videoMediaId: string | null;
  thumbnailId: string | null;
  descriptionEn: string;
  descriptionAm: string;
  galleryIds: string[];
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type ArtistOpt = { id: string; nameEn: string; status: string };

export function EpisodeForm({ id, initial, media, artists, publishedSlug }: { id: string | null; initial: EpisodeFormValues; media: PickerMedia[]; artists: ArtistOpt[]; publishedSlug: string | null }) {
  const form = useForm<EpisodeFormValues>({ defaultValues: initial });
  const title = useWatch({ control: form.control, name: "titleEn" });
  const source = useWatch({ control: form.control, name: "videoSource" });
  return (
    <MediaProvider initial={media}>
      <EditorShell
        form={form}
        title={title || "New episode"}
        backHref="/admin/episodes"
        backLabel="Episodes"
        previewHref={publishedSlug ? `/episodes/${publishedSlug}` : null}
        editHref={(newId) => `/admin/episodes/${newId}`}
        onSave={(v) => saveEpisode(id, v)}
        onDelete={id ? async () => {
          const r = await deleteEpisode(id);
          return r.ok ? { ok: true } : { ok: false, error: r.error };
        } : undefined}
      >
        <Section title="Episode">
          <TextField name="titleEn" label="Title (English)" required hint="e.g. “Lij Michael vs Hanan Tarik”" />
          <TextField name="titleAm" label="Title (Amharic)" lang="am" />
          <SlugField source="titleEn" />
          <SelectField name="type" label="Type" options={[{ value: "GAME_SHOW", label: "Game show" }, { value: "HOLIDAY_SPECIAL", label: "Holiday special" }, { value: "PERFORMANCE", label: "Performance" }, { value: "BEHIND_THE_SCENES", label: "Behind the scenes" }]} />
          <TextField name="season" label="Season" type="number" />
          <TextField name="episodeNumber" label="Episode number" type="number" />
          <TextField name="airDate" label="Air date" type="date" hint="Leave empty if unknown. Controls “latest” ordering." />
          <SelectField name="status" label="Status" options={[{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }]} />
          <CheckboxField name="featured" label="Featured" hint="Pick the home page's featured matchup in Site Settings." />
        </Section>

        <Section title="Participants" description="Side A vs side B. Pick an artist profile, or type a guest or team name. Linked names only become links once that profile is published.">
          <Participants artists={artists} />
        </Section>

        <Section title="Rounds & result" description="The scoreboard shows only when at least one round has a score.">
          <Rounds />
          <SelectField name="result" label="Result" options={[{ value: "NONE", label: "Not set" }, { value: "A", label: "Side A wins" }, { value: "B", label: "Side B wins" }, { value: "TIE", label: "Tie" }]} />
        </Section>

        <Section title="Video" description="Prefer YouTube for full episodes; upload short clips. With no video, the page shows “Episode video coming soon”.">
          <SelectField name="videoSource" label="Source" options={[{ value: "NONE", label: "None (coming soon)" }, { value: "YOUTUBE", label: "YouTube link" }, { value: "UPLOAD", label: "Uploaded video" }]} />
          {source === "YOUTUBE" ? <TextField name="youtubeUrl" label="YouTube URL" type="url" placeholder="https://www.youtube.com/watch?v=…" /> : null}
          {source === "UPLOAD" ? <MediaField name="videoMediaId" label="Video file" type="VIDEO" /> : null}
          <MediaField name="thumbnailId" label="Thumbnail / poster" />
        </Section>

        <Section title="Description">
          <RichTextField name="descriptionEn" label="Description (English)" />
          <RichTextField name="descriptionAm" label="Description (Amharic)" lang="am" />
        </Section>

        <Section title="Episode photos">
          <MediaListField name="galleryIds" label="Gallery" hint="Drag to reorder. Albums linked to this episode are shown too." />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

function Participants({ artists }: { artists: ArtistOpt[] }) {
  const { control, register, formState } = useFormContext<EpisodeFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "participants" });
  const rows = useWatch({ control, name: "participants" });
  const listError = (get(formState.errors, "participants") as { message?: string } | undefined)?.message;
  const input = "h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2.5 text-sm";
  return (
    <div className="flex flex-col gap-2 sm:col-span-2" data-field="participants">
      {fields.map((f, i) => {
        const artistId = rows?.[i]?.artistId;
        const err = (get(formState.errors, `participants.${i}.guestName`) as { message?: string } | undefined)?.message;
        return (
          <div key={f.id} className="rounded-md border border-line p-2">
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[5rem_1fr_1fr_auto]">
              <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
                Side
                <select {...register(`participants.${i}.side`)} className={input}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
                Artist profile
                <select {...register(`participants.${i}.artistId`)} className={input}>
                  <option value="">— none —</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameEn}
                      {a.status !== "PUBLISHED" ? " (draft)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
                …or guest / team name
                <input {...register(`participants.${i}.guestName`)} disabled={!!artistId} placeholder={artistId ? "Using the artist profile" : "e.g. Traffic Police"} className={input} />
              </label>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove participant ${i + 1}`} onClick={() => remove(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            {err ? <p className="mt-1 text-xs text-red">{err}</p> : null}
          </div>
        );
      })}
      {listError ? <p className="text-xs text-red">{listError}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => append({ side: "A", artistId: "", guestName: "" })}>
          <Plus /> Add to side A
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ side: "B", artistId: "", guestName: "" })}>
          <Plus /> Add to side B
        </Button>
      </div>
    </div>
  );
}

function Rounds() {
  const { control, register } = useFormContext<EpisodeFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "rounds" });
  const input = "h-9 w-full min-w-0 rounded-md border border-line bg-bg px-2.5 text-sm";
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_5rem_5rem_auto]">
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Round (English)
            <input {...register(`rounds.${i}.nameEn`)} className={input} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Round (Amharic)
            <input lang="am" {...register(`rounds.${i}.nameAm`)} className={input} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Score A
            <input type="number" {...register(`rounds.${i}.scoreA`)} className={input} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-[0.6875rem] font-semibold">
            Score B
            <input type="number" {...register(`rounds.${i}.scoreB`)} className={input} />
          </label>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove round ${i + 1}`} onClick={() => remove(i)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => append({ nameEn: fields.length ? `Round ${fields.length + 1}` : "Round 1", nameAm: "", scoreA: "", scoreB: "" })}>
        <Plus /> Add round
      </Button>
    </div>
  );
}
