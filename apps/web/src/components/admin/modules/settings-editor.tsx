"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SiteSettingsData } from "@/schemas/settings";
import type { PickerMedia } from "@/server/actions/media";
import { removeSampleData, saveSettingsSection } from "@/server/actions/settings";
import { SelectField, TextAreaField, TextField } from "../fields";
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

export function SettingsEditor({ settings, media, episodes, artists }: { settings: SiteSettingsData; media: PickerMedia[]; episodes: { id: string; titleEn: string; status: string }[]; artists: { id: string; nameEn: string; status: string }[] }) {
  const { hero, social, contact, seo, about, footer, featured, sponsors, branding, ticker } = settings;
  return (
    <MediaProvider initial={media}>
      <div className="flex flex-col gap-5">
        <SectionForm section="hero" title="Hero" description="The home page spotlight. The video never autoplays on phones or with Save-Data on." defaults={{
          titleEn: hero.titleEn, wordmark: hero.wordmark, taglineEn: hero.taglineEn, taglineAm: s(hero.taglineAm), videoId: hero.videoId ?? "", posterId: hero.posterId ?? "",
          ctas: [0, 1].map((i) => ({ labelEn: s(hero.ctas[i]?.labelEn), labelAm: s(hero.ctas[i]?.labelAm), href: s(hero.ctas[i]?.href) })),
        }} toData={(v) => ({ ...v, ctas: v.ctas.filter((c: { labelEn: string; href: string }) => c.labelEn && c.href) })}>
          <TextField name="wordmark" label="Wordmark" lang="am" />
          <TextField name="titleEn" label="Title under the wordmark" />
          <TextField name="taglineEn" label="Tagline (English)" />
          <TextField name="taglineAm" label="Tagline (Amharic)" lang="am" />
          <MediaField name="posterId" label="Background image / video poster" />
          <MediaField name="videoId" label="Background video (muted loop)" type="VIDEO" />
          <TextField name="ctas.0.labelEn" label="Primary button label" />
          <TextField name="ctas.0.href" label="Primary button link" placeholder="/episodes" />
          <TextField name="ctas.0.labelAm" label="Primary button label (Amharic)" lang="am" />
          <span className="hidden sm:block" />
          <TextField name="ctas.1.labelEn" label="Secondary button label" />
          <TextField name="ctas.1.href" label="Secondary button link" placeholder="/join" />
          <TextField name="ctas.1.labelAm" label="Secondary button label (Amharic)" lang="am" />
        </SectionForm>

        <SectionForm section="ticker" title="Ticker" description="One item per line." defaults={{ text: ticker.join("\n") }} toData={(v) => v.text.split("\n").map((l: string) => l.trim()).filter(Boolean)}>
          <TextAreaField name="text" label="Ticker items" rows={6} />
        </SectionForm>

        <SectionForm section="featured" title="Featured" description="Home page featured matchup and artist spotlight (in this order). Only published items appear." defaults={{ episodeId: featured.episodeId ?? "", artistIds: featured.artistIds }}>
          <SelectField name="episodeId" label="Featured episode" wide empty="— none —" options={episodes.map((e) => ({ value: e.id, label: e.titleEn + (e.status !== "PUBLISHED" ? " (draft)" : "") }))} />
          <OrderedPicker name="artistIds" label="Featured artists" options={artists} />
        </SectionForm>

        <SectionForm section="branding" title="Logo" description="Without a logo, the header uses the ፈታ type wordmark." defaults={{ logoId: branding.logoId ?? "" }}>
          <MediaField name="logoId" label="Logo" />
        </SectionForm>

        <SectionForm section="social" title="Social links" description="Empty links are hidden in the footer." defaults={{ telegram: s(social.telegram), tiktok: s(social.tiktok), youtube: s(social.youtube), instagram: s(social.instagram), facebook: s(social.facebook), x: s(social.x) }}>
          {(["telegram", "tiktok", "youtube", "instagram", "facebook", "x"] as const).map((k) => (
            <TextField key={k} name={k} label={k === "x" ? "X" : k[0]!.toUpperCase() + k.slice(1)} type="url" placeholder="https://" />
          ))}
        </SectionForm>

        <SectionForm section="contact" title="Contact" defaults={{ email: s(contact.email), phone: s(contact.phone) }}>
          <TextField name="email" label="Contact email" type="email" />
          <TextField name="phone" label="Contact phone" type="tel" />
        </SectionForm>

        <SectionForm section="sponsors" title="Sponsors & partners" description="Shown as a logo strip on Home (hidden when empty)." defaults={{ items: sponsors.map((x) => ({ name: x.name, logoId: x.logoId, url: s(x.url) })) }} toData={(v) => v.items}>
          <SponsorsRepeater />
        </SectionForm>

        <SectionForm section="seo" title="Default SEO" description="Used when a page doesn't set its own title, description or social image." defaults={{ title: seo.title, description: seo.description, ogImageId: seo.ogImageId ?? "" }}>
          <TextField name="title" label="Site title" />
          <TextAreaField name="description" label="Description" rows={2} />
          <MediaField name="ogImageId" label="Default social image (1200×630 works best)" />
        </SectionForm>

        <SectionForm section="about" title="About page" description="Story, FAQ and team (the team section is hidden until you add people)." defaults={{ storyEn: about.storyEn, storyAm: s(about.storyAm), faq: about.faq.map((f) => ({ qEn: f.qEn, aEn: f.aEn, qAm: s(f.qAm), aAm: s(f.aAm) })), team: about.team.map((t) => ({ name: t.name, roleEn: t.roleEn, roleAm: s(t.roleAm), photoId: t.photoId ?? "" })) }}>
          <TextAreaField name="storyEn" label="Story (English)" rows={5} />
          <TextAreaField name="storyAm" label="Story (Amharic)" rows={5} lang="am" />
          <FaqRepeater />
          <TeamRepeater />
        </SectionForm>

        <SectionForm section="footer" title="Footer" defaults={{ textEn: s(footer.textEn), textAm: s(footer.textAm), broadcastLine: footer.broadcastLine }}>
          <TextField name="broadcastLine" label="Broadcast line" hint="EBS is named as text only; no EBS logo unless the client supplies it." />
          <span className="hidden sm:block" />
          <TextAreaField name="textEn" label="Footer text (English)" rows={2} />
          <TextAreaField name="textAm" label="Footer text (Amharic)" rows={2} lang="am" />
        </SectionForm>

        <DangerZone />
      </div>
    </MediaProvider>
  );
}

function OrderedPicker({ name, label, options }: { name: string; label: string; options: { id: string; nameEn: string; status: string }[] }) {
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
            <span className="flex-1">{byId.get(id)?.nameEn ?? "(deleted)"}{byId.get(id) && byId.get(id)!.status !== "PUBLISHED" ? " (draft, hidden)" : ""}</span>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...ids]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; set(n); }} className="text-muted-foreground disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => { const n = [...ids]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; set(n); }} className="text-muted-foreground disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" aria-label="Remove" onClick={() => set(ids.filter((x) => x !== id))} className="text-muted-foreground hover:text-red"><X className="size-4" /></button>
          </li>
        ))}
      </ol>
      <select aria-label={`Add to ${label}`} value="" onChange={(e) => e.target.value && set([...ids, e.target.value])} className="h-9 max-w-xs rounded-md border border-line bg-bg px-2 text-sm">
        <option value="">+ Add artist…</option>
        {available.map((o) => <option key={o.id} value={o.id}>{o.nameEn}{o.status !== "PUBLISHED" ? " (draft)" : ""}</option>)}
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

function TeamRepeater() {
  const { control } = useFormContext<{ team: { name: string; roleEn: string; roleAm: string; photoId: string }[] }>();
  const { fields, append, remove } = useFieldArray({ control, name: "team" });
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <span className="text-xs font-semibold">Team & host</span>
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-3">
          <TextField name={`team.${i}.name`} label="Name" />
          <TextField name={`team.${i}.roleEn`} label="Role (English)" />
          <TextField name={`team.${i}.roleAm`} label="Role (Amharic)" lang="am" />
          <MediaField name={`team.${i}.photoId`} label="Photo (only with permission)" />
          <Button type="button" size="sm" variant="ghost" className="self-end justify-self-start text-red" onClick={() => remove(i)}><Trash2 /> Remove</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => append({ name: "", roleEn: "", roleAm: "", photoId: "" })}><Plus /> Add person</Button>
    </div>
  );
}

function DangerZone() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <section aria-labelledby="danger" className="rounded-lg border border-red/50 bg-red/5 p-5">
      <h2 id="danger" className="flex items-center gap-2 font-display text-sm font-bold text-red">
        <TriangleAlert className="size-4" /> Danger zone
      </h2>
      <p className="mt-1 text-sm">
        <strong>Remove sample data</strong> deletes everything flagged as sample: the generated artwork and its files, the sample albums, the two draft
        sample news posts and the demo submissions. Artists, episodes, videos, the welcome post and these settings stay. This can&apos;t be undone.
      </p>
      <label className="mt-3 flex flex-col gap-1 text-xs font-semibold">
        Type REMOVE SAMPLE DATA to confirm
        <input value={text} onChange={(e) => setText(e.target.value)} className="h-9 max-w-xs rounded-md border border-line bg-bg px-3 text-sm" />
      </label>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="mt-3"
        disabled={text !== "REMOVE SAMPLE DATA" || pending}
        onClick={() =>
          start(async () => {
            const r = await removeSampleData({ confirm: text });
            if (r.ok) {
              toast.success(`Removed: ${Object.entries(r.removed).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing"}`);
              setText("");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Remove sample data
      </Button>
    </section>
  );
}
