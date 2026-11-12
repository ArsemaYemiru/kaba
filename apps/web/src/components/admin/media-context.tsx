"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { PickerMedia } from "@/server/actions/media";

type Ctx = { media: Record<string, PickerMedia>; remember: (items: PickerMedia[]) => void };
const MediaCtx = createContext<Ctx | null>(null);

/** Lookup of media rows referenced by a form (seeded from the server, grown by the picker). */
export function MediaProvider({ initial, children }: { initial: PickerMedia[]; children: React.ReactNode }) {
  const [media, setMedia] = useState<Record<string, PickerMedia>>(() => Object.fromEntries(initial.map((m) => [m.id, m])));
  const remember = useCallback((items: PickerMedia[]) => setMedia((prev) => ({ ...prev, ...Object.fromEntries(items.map((m) => [m.id, m])) })), []);
  return <MediaCtx.Provider value={{ media, remember }}>{children}</MediaCtx.Provider>;
}

export function useMediaLookup() {
  const ctx = useContext(MediaCtx);
  if (!ctx) throw new Error("useMediaLookup must be used inside <MediaProvider>");
  return ctx;
}
