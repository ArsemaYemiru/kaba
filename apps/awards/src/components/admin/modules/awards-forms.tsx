"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, GripVertical, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/awards/category-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { changePhase, deleteEdition, reorderCategories, reorderNominees, saveCategory, saveEdition, saveNominee, bulkCategories, bulkNominees } from "@/server/actions/admin/awards";
import type { PickerMedia } from "@/server/actions/admin/media";
import { EditorShell, Section } from "../editor-shell";
import { CheckboxField, ChipsField, SelectField, TextAreaField, TextField } from "../fields";
import { MediaProvider } from "../media-context";
import { MediaField } from "../media-field";
import { SlugField } from "./artist-form";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
const STATUS_OPTS = [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }, { value: "ARCHIVED", label: "Archived" }];
const VOTING_OPTS = [
  { value: "PUBLIC_VOTE", label: "Public vote" },
  { value: "HYBRID", label: "Public + Jury" },
  { value: "JURY", label: "Jury" },
  { value: "HONORARY", label: "Honorary (single recipient)" },
];
const NOMINEE_TYPE_OPTS = ["PERSON", "GROUP", "SONG", "ALBUM", "MUSIC_VIDEO", "FILM", "SERIES", "CREATOR", "OTHER"].map((v) => ({ value: v, label: v.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) }));

/* ───────────────────────── Editions ───────────────────────── */
export type EditionFormValues = {
  year: string; nameEn: string; nameAm: string; slug: string; nomineesAnnouncedAt: string; votingOpensAt: string; votingClosesAt: string; ceremonyAt: string;
  venue: string; broadcastPartner: string; heroMediaId: string | null; showPublicPercentages: boolean; status: Status;
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
          <SelectField name="status" label="Status" options={STATUS_OPTS} hint="Only published editions appear on the site." />
          <CheckboxField name="showPublicPercentages" label="Show public vote percentages on the winners page" />
        </Section>
        <Section title="Key dates (East Africa Time)" description="Votes are accepted only between “Voting opens” and “Voting closes”, and only while the phase is Voting open.">
          <TextField name="nomineesAnnouncedAt" label="Nominees announced" type="datetime-local" />
          <TextField name="votingOpensAt" label="Voting opens" type="datetime-local" />
          <TextField name="votingClosesAt" label="Voting closes" type="datetime-local" />
          <TextField name="ceremonyAt" label="Awards night" type="datetime-local" />
          <TextField name="venue" label="Venue" hint="Leave empty until confirmed (shows “To be confirmed”)." />
          <TextField name="broadcastPartner" label="Broadcast partner" />
          <MediaField name="heroMediaId" label="Hero image (fallback when Site Settings has none)" />
        </Section>
      </EditorShell>
    </MediaProvider>
  );
}

const PHASES = ["DRAFT", "NOMINEES_ANNOUNCED", "VOTING_OPEN", "VOTING_CLOSED", "WINNERS_ANNOUNCED"] as const;
const PHASE_LABEL: Record<(typeof PHASES)[number], string> = { DRAFT: "Draft", NOMINEES_ANNOUNCED: "Nominees announced", VOTING_OPEN: "Voting open", VOTING_CLOSED: "Voting closed", WINNERS_ANNOUNCED: "Winners announced" };
const PHASE_HELP: Record<(typeof PHASES)[number], string> = {
  DRAFT: "Hidden: categories and nominees aren't public yet.",
  NOMINEES_ANNOUNCED: "Nominees are public; voting hasn't started.",
  VOTING_OPEN: "Members can vote inside the voting window.",
  VOTING_CLOSED: "No more votes. Lock the results on the Results page.",
  WINNERS_ANNOUNCED: "Winners are public (from the locked results and any overrides).",
};

/** Phase control (spec §6): one step at a time, confirmation, reason when going back. */
export function PhasePanel({ editionId, phase, isSuperAdmin }: { editionId: string; phase: (typeof PHASES)[number]; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<(typeof PHASES)[number] | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const i = PHASES.indexOf(phase);
  const next = PHASES[i + 1];
  const prev = i > 0 ? PHASES[i - 1] : undefined;
  const back = target !== null && PHASES.indexOf(target) < i;
  const needsSuper = (t: (typeof PHASES)[number]) => (t === "WINNERS_ANNOUNCED" || phase === "WINNERS_ANNOUNCED") && !isSuperAdmin;
  return (
    <section aria-labelledby="phase-title" className="rounded-lg border border-gold/40 bg-surface p-5">
      <h2 id="phase-title" className="font-display text-sm font-bold">Phase</h2>
      <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Edition phases">
        {PHASES.map((p, k) => (
          <li key={p} aria-current={p === phase ? "step" : undefined} className={cn("rounded-full border px-2.5 py-1", p === phase ? "border-gold bg-gold font-bold text-bg" : k < i ? "border-line text-muted-foreground line-through" : "border-line text-muted-foreground")}>
            {PHASE_LABEL[p]}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">{PHASE_HELP[phase]}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {prev ? (
          <Button type="button" size="sm" variant="outline" disabled={needsSuper(prev)} onClick={() => setTarget(prev)}>
            <ArrowLeft /> Back to {PHASE_LABEL[prev]}
          </Button>
        ) : null}
        {next ? (
          <Button type="button" size="sm" disabled={needsSuper(next)} onClick={() => setTarget(next)}>
            Move to {PHASE_LABEL[next]} <ArrowRight />
          </Button>
        ) : null}
      </div>
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="border-line bg-surface sm:max-w-md">
          <DialogTitle className="font-display text-lg font-bold">{target ? `Move to “${PHASE_LABEL[target]}”?` : ""}</DialogTitle>
          <DialogDescription>{target ? PHASE_HELP[target] : ""} The change is logged.</DialogDescription>
          {back ? (
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Reason for going back (required)
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="rounded-md border border-line bg-bg p-2 text-sm font-normal" />
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={back ? "destructive" : "default"}
              disabled={pending || (back && reason.trim().length < 5)}
              onClick={() =>
                start(async () => {
                  const r = await changePhase({ editionId, to: target, reason: back ? reason : undefined });
                  if (r.ok) {
                    toast.success(`Phase: ${PHASE_LABEL[target!]}`);
                    setTarget(null);
                    setReason("");
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : null} Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ───────────────────────── Categories ───────────────────────── */
export type CategoryFormValues = {
  editionId: string; nameEn: string; nameAm: string; slug: string; descriptionEn: string; descriptionAm: string; icon: string;
  votingType: "PUBLIC_VOTE" | "JURY" | "HYBRID" | "HONORARY"; publicWeight: string; juryWeight: string; nomineeType: string; sortOrder: string; status: Status;
};
export function CategoryForm({ id, initial, editions, liveHref }: { id: string | null; initial: CategoryFormValues; editions: { id: string; label: string }[]; liveHref: string | null }) {
  const form = useForm<CategoryFormValues>({ defaultValues: initial });
  const votingType = useWatch({ control: form.control, name: "votingType" });
  const icon = useWatch({ control: form.control, name: "icon" });
  return (
    <EditorShell
      form={form}
      title={useWatch({ control: form.control, name: "nameEn" }) || "New category"}
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
      <Section title="Category">
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
        <SelectField name="nomineeType" label="Nominee type" options={NOMINEE_TYPE_OPTS} hint="Sets the fallback artwork (initials, disc, film…)." />
        <TextField name="sortOrder" label="Sort order" type="number" hint="Or drag to reorder on the Categories list." />
      </Section>
      <Section title="How the winner is decided">
        <SelectField name="votingType" label="Voting type" options={VOTING_OPTS} wide />
        {votingType === "HYBRID" ? (
          <>
            <TextField name="publicWeight" label="Public weight (%)" type="number" />
            <TextField name="juryWeight" label="Jury weight (%)" type="number" hint="Public + jury must add up to 100." />
          </>
        ) : (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {votingType === "PUBLIC_VOTE" ? "Decided 100% by valid public votes." : votingType === "JURY" ? "Decided by jury scores entered on the Results page. No public votes." : "One recipient chosen by the organizers. No vote."}
          </p>
        )}
      </Section>
    </EditorShell>
  );
}

/* ───────────────────────── Nominees ───────────────────────── */
export type NomineeFormValues = {
  categoryId: string; displayNameEn: string; displayNameAm: string; slug: string; workTitleEn: string; workTitleAm: string; artistIds: string[];
  imageId: string | null; blurbEn: string; blurbAm: string; youtubeUrl: string; sortOrder: string; status: Status;
};
export function NomineeForm({ id, initial, media, categories, artists, liveHref, hasVotes }: {
  id: string | null; initial: NomineeFormValues; media: PickerMedia[]; categories: { id: string; label: string; nomineeType: string }[]; artists: { id: string; nameEn: string; status: string }[]; liveHref: string | null; hasVotes: boolean;
}) {
  const form = useForm<NomineeFormValues>({ defaultValues: initial });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });
  const workTitle = useWatch({ control: form.control, name: "workTitleEn" });
  const displayName = useWatch({ control: form.control, name: "displayNameEn" });
  const type = categories.find((c) => c.id === categoryId)?.nomineeType ?? "PERSON";
  const isWork = ["SONG", "ALBUM", "MUSIC_VIDEO", "FILM", "SERIES"].includes(type);
  return (
    <MediaProvider initial={media}>
      <EditorShell
        form={form}
        title={workTitle || displayName || "New nominee"}
        backHref="/admin/nominees"
        backLabel="Nominees"
        previewHref={liveHref}
        editHref={(i) => `/admin/nominees/${i}`}
        onSave={(v) => saveNominee(id, v)}
        onDelete={
          id && !hasVotes
            ? async () => {
                const r = await bulkNominees({ ids: [id], op: "delete" });
                return r.ok ? { ok: true } : { ok: false, error: r.error };
              }
            : undefined
        }
      >
        <Section title="Nominee" description={hasVotes ? "This nominee has votes: it can be archived but not deleted or moved to another category." : undefined}>
          <SelectField name="categoryId" label="Category" options={categories.map((c) => ({ value: c.id, label: c.label }))} wide />
          {isWork ? (
            <>
              <TextField name="workTitleEn" label="Work title (English)" required hint="Shown as the nominee's name, e.g. the song or film." />
              <TextField name="workTitleAm" label="Work title (Amharic)" lang="am" />
              <TextField name="displayNameEn" label="Credited artist / studio (English)" required />
              <TextField name="displayNameAm" label="Credited artist / studio (Amharic)" lang="am" />
            </>
          ) : (
            <>
              <TextField name="displayNameEn" label="Display name (English)" required />
              <TextField name="displayNameAm" label="Display name (Amharic)" lang="am" />
            </>
          )}
          <SlugField source="displayNameEn" />
          <SelectField name="status" label="Status" options={STATUS_OPTS} />
          <TextField name="sortOrder" label="Sort order" type="number" />
          <TextField name="youtubeUrl" label="YouTube link (optional)" type="url" placeholder="https://www.youtube.com/watch?v=…" />
          <MediaField name="imageId" label={isWork ? "Artwork" : "Photo (only with permission to use it)"} />
        </Section>
        <Section title="About">
          <TextAreaField name="blurbEn" label="Blurb (English)" rows={3} />
          <TextAreaField name="blurbAm" label="Blurb (Amharic)" rows={3} lang="am" />
          <ChipsField name="artistIds" label="Linked artist profiles" hint="Adds this nomination to the artist's Feta Awards tab." searchable options={artists.map((a) => ({ value: a.id, label: a.nameEn + (a.status !== "PUBLISHED" ? " (draft)" : ""), muted: a.status !== "PUBLISHED" }))} />
        </Section>
      </EditorShell>
    </MediaProvider>
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

export function ReorderList({ kind, items }: { kind: "categories" | "nominees"; items: { id: string; label: string; status: string }[] }) {
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
      const r = await (kind === "categories" ? reorderCategories : reorderNominees)({ ids: next.map((x) => x.id) });
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
