"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TabDef = { id: string; label: string; content: React.ReactNode };

/** Accessible tabs (Radix: roving focus, arrow keys, aria-selected). */
export function ProfileTabs({ tabs }: { tabs: TabDef[] }) {
  if (tabs.length === 0) return null;
  return (
    <Tabs defaultValue={tabs[0]!.id} className="gap-0">
      <div className="no-scrollbar -mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        <TabsList variant="line" className="h-auto gap-1 bg-transparent p-0">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="relative h-12 flex-none rounded-none border-0 px-4 font-display text-sm font-bold text-muted-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-active:text-gold! data-active:bg-transparent! data-active:shadow-none! data-active:after:bg-gold! after:bottom-0! after:opacity-100!"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="pt-8 focus-visible:outline-none">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
