import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  login: "text-green",
  logout: "text-muted-foreground",
  password_change: "text-gold",
  create: "text-green",
  update: "text-foreground",
  publish: "text-gold",
  unpublish: "text-muted-foreground",
  delete: "text-red",
  deactivate: "text-red",
  activate: "text-green",
};

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  meta: unknown;
  createdAt: Date;
  user: { name: string; email: string } | null;
};

function label(meta: unknown): string | null {
  if (meta && typeof meta === "object" && "label" in meta && typeof (meta as { label: unknown }).label === "string") {
    return (meta as { label: string }).label;
  }
  return null;
}

export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const what = label(entry.meta);
  return (
    <li className="flex items-baseline gap-3 py-2.5">
      <time
        dateTime={entry.createdAt.toISOString()}
        className="w-32 shrink-0 text-xs text-muted-foreground tabular-nums"
        title={entry.createdAt.toISOString()}
      >
        {entry.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "short", timeStyle: "short" })}
      </time>
      <p className="min-w-0 flex-1 truncate">
        <span className="font-medium">{entry.user?.name ?? "System"}</span>{" "}
        <span className={cn("font-semibold", COLORS[entry.action])}>{entry.action.replace("_", " ")}</span>{" "}
        <span className="text-muted-foreground">
          {entry.entityType}
          {what ? ` · ${what}` : ""}
        </span>
      </p>
    </li>
  );
}
