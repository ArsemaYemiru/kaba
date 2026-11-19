"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaLookup } from "./media-context";
import { MediaPickerDialog } from "./media-picker";
import { MediaThumb } from "./media-thumb";

/** Single image/video reference (stores the Media id). */
export function MediaField({ name, label, type = "IMAGE", hint }: { name: string; label: string; type?: "IMAGE" | "VIDEO"; hint?: string }) {
  const { control, formState } = useFormContext();
  const { media, remember } = useMediaLookup();
  const [open, setOpen] = useState(false);
  const error = (get(formState.errors, name) as { message?: string } | undefined)?.message;
  const id = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const m = field.value ? media[field.value] : undefined;
        return (
          <div className="flex min-w-0 flex-col gap-1.5" data-field={name}>
            <span id={id} className="text-xs font-semibold">
              {label}
            </span>
            <div className="flex items-center gap-3">
              <MediaThumb media={m} className={cn("rounded-md border border-line", type === "IMAGE" ? "size-20" : "h-20 w-32")} />
              <div className="flex min-w-0 flex-col gap-1.5">
                {m ? <p className="truncate text-xs text-muted-foreground">{m.alt || "(no description)"}</p> : <p className="text-xs text-muted-foreground">None selected</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)} aria-describedby={id}>
                    <ImagePlus /> {m ? "Change" : "Choose"}
                  </Button>
                  {m ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => field.onChange(null)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
            {error ? <p className="text-xs text-red">{error}</p> : null}
            <MediaPickerDialog
              open={open}
              onOpenChange={setOpen}
              type={type}
              onPick={([picked]) => {
                if (!picked) return;
                remember([picked]);
                field.onChange(picked.id);
              }}
            />
          </div>
        );
      }}
    />
  );
}

/** Ordered list of image ids (gallery): pick many, drag (or keyboard) to reorder. */
export function MediaListField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  const { control } = useFormContext();
  const { media, remember } = useMediaLookup();
  const [open, setOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const ids: string[] = field.value ?? [];
        const onDragEnd = (e: DragEndEvent) => {
          if (!e.over || e.active.id === e.over.id) return;
          field.onChange(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
        };
        return (
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2" data-field={name}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                {label} <span className="font-normal text-muted-foreground">({ids.length})</span>
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
                <ImagePlus /> Add images
              </Button>
            </div>
            {ids.length ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={ids} strategy={rectSortingStrategy}>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {ids.map((mid) => (
                      <SortableTile key={mid} id={mid} label={media[mid]?.alt ?? "Image"} onRemove={() => field.onChange(ids.filter((x) => x !== mid))}>
                        <MediaThumb media={media[mid]} className="aspect-square w-full rounded" />
                      </SortableTile>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-muted-foreground">No images yet.</p>
            )}
            {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
            <MediaPickerDialog
              open={open}
              onOpenChange={setOpen}
              type="IMAGE"
              multiple
              onPick={(picked) => {
                remember(picked);
                field.onChange([...ids, ...picked.map((p) => p.id).filter((p) => !ids.includes(p))]);
              }}
            />
          </div>
        );
      }}
    />
  );
}

export function SortableTile({ id, label, onRemove, children }: { id: string; label: string; onRemove: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("relative rounded-md border border-line bg-bg p-1", isDragging && "z-10 border-gold shadow-lg")}>
      {children}
      <button type="button" {...attributes} {...listeners} aria-label={`Reorder ${label}`} className="absolute top-1 left-1 flex size-6 cursor-grab items-center justify-center rounded bg-bg/80 text-muted-foreground hover:text-foreground">
        <GripVertical className="size-3.5" />
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="absolute top-1 right-1 flex size-6 items-center justify-center rounded bg-bg/80 text-muted-foreground hover:text-red">
        <X className="size-3.5" />
      </button>
    </li>
  );
}
