"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SiteSettingsData } from "@/schemas/settings";
import type { PickerMedia } from "@/server/actions/admin/media";
import { saveSettingsSection } from "@/server/actions/admin/settings";
import { SelectField, TextAreaField, TextField } from "../fields";
import { RichTextField } from "../rich-text";
import { MediaProvider } from "../media-context";
import { MediaField } from "../media-field";

type Section = keyof SiteSettingsData;

/** "" → null for *Id keys and undefined for other optional strings, recursively. */
function clean(v: unknown, key = ""): unknown {
  if (Array.isArray(v)) return v.map((x) => clean(x));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x, k)]));
  if (v === "" && /Id$/.test(key)) return null;
  return v;
}

function SectionForm<T extends FieldValues>({ section, title, description, defaults, toData, children }: { section: Section; title: string; description?: string; defaults: T; toData?: (v: T) => unknown; children: React.ReactNode }) {
  const form = useForm<T>({ defaultValues: defaults as never });
  const router = useRouter();
  const [pending, start] = useTransition();
  const [issues, setIssues] = useState<string[]>([]);
  const save = form.handleSubmit((values) =>
    start(async () => {
      const r = await saveSettingsSection({ section, data: clean(toData ? toData(values) : values) });
      if (r.ok) {
        setIssues([]);
        toast.success(`${title} saved`);
        form.reset(values);
        router.refresh();
      } else {
        setIssues("issues" in r && r.issues ? r.issues : [r.error]);
        toast.error(r.error === "forbidden" ? "Super admins only." : r.error);
      }
    }),
  );
  return (
    <FormProvider {...form}>
      <form onSubmit={save} noValidate className="rounded-lg border border-line bg-surface p-5" aria-labelledby={`s-${section}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id={`s-${section}`} className="font-display text-sm font-bold">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        {issues.length ? (
          <ul role="alert" className="mt-3 text-xs text-red">
            {issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        ) : null}
      </form>
    </FormProvider>
  );
}

const s = (v: string | null | undefined) => v ?? "";

type Option = { id: string; label: string; status: string };

export function SettingsEditor({ settings, media, editions, honorees, artists }: { settings: SiteSettingsData; media: PickerMedia[]; editions: { id: string; label: string }[]; honorees: Option[]; artists: Option[] }) {
  const { hero, social, contact, seo, footer, featured, sponsors, branding, ticker, pages } = settings;
  const pageDefaults = {
    about: { bodyEn: pages.about.bodyEn, bodyAm: s(pages.about.bodyAm) },
    privacy: { bodyEn: pages.privacy.bodyEn, bodyAm: s(pages.privacy.bodyAm) },
    terms: { bodyEn: pages.terms.bodyEn, bodyAm: s(pages.terms.bodyAm) },
  };
  return (
    <MediaProvider initial={media}>
      <div className="flex flex-col gap-5">
        <SectionForm section="currentEditionId" title="Current edition" description="Drives the home page and /awards." defaults={{ id: settings.currentEditionId ?? "" }} toData={(v) => v.id || null}>
          <SelectField name="id" label="Edition" wide empty="— latest published —" options={editions.map((e) => ({ value: e.id, label: e.label }))} />
        </SectionForm>

        <SectionForm section="hero" title="Hero" description="The home page spotlight. The video never autoplays on phones or with Save-Data on." defaults={{
          titleEn: hero.titleEn, wordmark: hero.wordmark, taglineEn: hero.taglineEn, taglineAm: s(hero.taglineAm), videoId: hero.videoId ?? "", posterId: hero.posterId ?? "",
        }}>
          <TextField name="wordmark" label="Wordmark" lang="am" />
          <TextField name="titleEn" label="Title under the wordmark" />
          <TextField name="taglineEn" label="Tagline (English)" />
          <TextField name="taglineAm" label="Tagline (Amharic)" lang="am" />
          <MediaField name="posterId" label="Background image / video poster" />
          <MediaField name="videoId" label="Background video (muted loop)" type="VIDEO" />
        </SectionForm>

        <SectionForm section="ticker" title="Ticker" description="One item per line. The current edition and its awards night are added automatically." defaults={{ text: ticker.join("\n") }} toData={(v) => v.text.split("\n").map((l: string) => l.trim()).filter(Boolean)}>
          <TextAreaField name="text" label="Ticker items" rows={5} />
        </SectionForm>

        <SectionForm section="featured" title="Featured" description="Home page featured honorees and artist spotlight, in this order. Only published items appear." defaults={{ nomineeIds: featured.nomineeIds, artistIds: featured.artistIds }}>
          <OrderedPicker name="nomineeIds" label="Featured honorees" addLabel="+ Add honoree…" options={honorees} />
          <OrderedPicker name="artistIds" label="Featured artists" addLabel="+ Add artist…" options={artists} />
        </SectionForm>

        <SectionForm section="branding" title="Logo" description="Without a logo, the header uses the ፈታ type wordmark." defaults={{ logoId: branding.logoId ?? "" }}>
          <MediaField name="logoId" label="Logo" />
        </SectionForm>

        <SectionForm section="social" title="Social links" description="Empty links are hidden in the footer." defaults={{ telegram: s(social.telegram), tiktok: s(social.tiktok), youtube: s(social.youtube), instagram: s(social.instagram), facebook: s(social.facebook), x: s(social.x) }}>
          {(["telegram", "tiktok", "youtube", "instagram", "facebook", "x"] as const).map((k) => (
            <TextField key={k} name={k} label={k === "x" ? "X" : k[0]!.toUpperCase() + k.slice(1)} type="url" placeholder="https://" />
          ))}
        </SectionForm>

        <SectionForm section="contact" title="Contact" defaults={{ email: s(contact.email) }}>
          <TextField name="email" label="Contact email" type="email" />
        </SectionForm>

        <SectionForm section="sponsors" title="Sponsors & partners" description="Shown as a logo strip on Home (hidden when empty)." defaults={{ items: sponsors.map((x) => ({ name: x.name, logoId: x.logoId, url: s(x.url) })) }} toData={(v) => v.items}>
          <SponsorsRepeater />
        </SectionForm>

        <SectionForm section="seo" title="Default SEO" description="Used when a page doesn't set its own title, description or social image." defaults={{ title: seo.title, description: seo.description, ogImageId: seo.ogImageId ?? "" }}>
          <TextField name="title" label="Site title" />
          <TextAreaField name="description" label="Description" rows={2} />
          <MediaField name="ogImageId" label="Default social image (1200×630 works best)" />
        </SectionForm>

        <SectionForm section="footer" title="Footer" defaults={{ textEn: s(footer.textEn), textAm: s(footer.textAm) }}>
          <TextAreaField name="textEn" label="Footer text (English)" rows={2} />
          <TextAreaField name="textAm" label="Footer text (Amharic)" rows={2} lang="am" />
        </SectionForm>

        <div id="pages" className="scroll-mt-20">
          <SectionForm
            section="pages"
            title="Pages: About, Privacy, Terms"
            description="Seeded as templates for organizer and legal review. A page stops being flagged as a template once you edit it."
            defaults={{ ...pageDefaults, faq: pages.faq.map((f) => ({ qEn: f.qEn, aEn: f.aEn, qAm: s(f.qAm), aAm: s(f.aAm) })), organizer: s(pages.organizer) }}
            toData={(v) => {
              const page = (k: "about" | "privacy" | "terms") => ({
                bodyEn: v[k].bodyEn,
                bodyAm: v[k].bodyAm || undefined,
                isTemplate: pages[k].isTemplate && v[k].bodyEn === pageDefaults[k].bodyEn && v[k].bodyAm === pageDefaults[k].bodyAm,
              });
              return { about: page("about"), privacy: page("privacy"), terms: page("terms"), faq: v.faq, organizer: v.organizer || undefined };
            }}
          >
            {(["about", "privacy", "terms"] as const).map((k) => (
              <div key={k} className="flex flex-col gap-3 sm:col-span-2">
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {{ about: "About", privacy: "Privacy", terms: "Terms" }[k]}
                  {pages[k].isTemplate ? <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[0.625rem] text-gold normal-case">template</span> : null}
                </h3>
                <RichTextField name={`${k}.bodyEn`} label="English" />
                <RichTextField name={`${k}.bodyAm`} label="Amharic" lang="am" />
              </div>
            ))}
            <TextField name="organizer" label="Organizer (shown on About; hidden when empty)" wide />
            <FaqRepeater />
          </SectionForm>
        </div>
      </div>
    </MediaProvider>
  );
}

function OrderedPicker({ name, label, options, addLabel }: { name: string; label: string; options: Option[]; addLabel: string }) {
  const { control, setValue } = useFormContext();
  const ids: string[] = useWatch({ control, name }) ?? [];
  const set = (next: string[]) => setValue(name, next, { shouldDirty: true });
  const byId = new Map(options.map((o) => [o.id, o]));
  const available = options.filter((o) => !ids.includes(o.id));
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <span className="text-xs font-semibold">{label}</span>
      <ol className="flex flex-col gap-1">
        {ids.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-1.5 text-sm">
            <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
            <span className="flex-1">{byId.get(id)?.label ?? "(deleted)"}{byId.get(id) && byId.get(id)!.status !== "PUBLISHED" ? " (draft, hidden)" : ""}</span>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...ids]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; set(n); }} className="text-muted-foreground disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => { const n = [...ids]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; set(n); }} className="text-muted-foreground disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" aria-label="Remove" onClick={() => set(ids.filter((x) => x !== id))} className="text-muted-foreground hover:text-red"><X className="size-4" /></button>
          </li>
        ))}
      </ol>
      <select aria-label={`Add to ${label}`} value="" onChange={(e) => e.target.value && set([...ids, e.target.value])} className="h-9 max-w-xs rounded-md border border-line bg-bg px-2 text-sm">
        <option value="">{addLabel}</option>
        {available.map((o) => <option key={o.id} value={o.id}>{o.label}{o.status !== "PUBLISHED" ? " (draft)" : ""}</option>)}
      </select>
    </div>
  );
}

function SponsorsRepeater() {
  const { control } = useFormContext<{ items: { name: string; logoId: string; url: string }[] }>();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
          <TextField name={`items.${i}.name`} label="Name" />
          <TextField name={`items.${i}.url`} label="Link (optional)" type="url" />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove sponsor ${i + 1}`} onClick={() => remove(i)} className="self-end"><Trash2 className="size-4" /></Button>
          <MediaField name={`items.${i}.logoId`} label="Logo" />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => append({ name: "", logoId: "", url: "" })}><Plus /> Add sponsor</Button>
    </div>
  );
}

function FaqRepeater() {
  const { control } = useFormContext<{ faq: { qEn: string; aEn: string; qAm: string; aAm: string }[] }>();
  const { fields, append, remove } = useFieldArray({ control, name: "faq" });
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <span className="text-xs font-semibold">FAQ</span>
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-2">
          <TextField name={`faq.${i}.qEn`} label="Question (English)" />
          <TextField name={`faq.${i}.qAm`} label="Question (Amharic)" lang="am" />
          <TextAreaField name={`faq.${i}.aEn`} label="Answer (English)" rows={2} wide={false} />
          <TextAreaField name={`faq.${i}.aAm`} label="Answer (Amharic)" rows={2} wide={false} lang="am" />
          <Button type="button" size="sm" variant="ghost" className="justify-self-start text-red" onClick={() => remove(i)}><Trash2 /> Remove</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => append({ qEn: "", aEn: "", qAm: "", aAm: "" })}><Plus /> Add question</Button>
    </div>
  );
}

