import { Chip } from "@/components/brand/chip";

const MAP = {
  PUBLISHED: { label: "Published", variant: "green" },
  DRAFT: { label: "Draft", variant: "muted" },
  ARCHIVED: { label: "Archived", variant: "default" },
  NEW: { label: "New", variant: "red" },
  REVIEWED: { label: "Reviewed", variant: "default" },
  SHORTLISTED: { label: "Shortlisted", variant: "gold" },
} as const;

export function StatusBadge({ status, scheduled }: { status: keyof typeof MAP; scheduled?: boolean }) {
  if (status === "PUBLISHED" && scheduled) return <Chip size="sm" variant="gold">Scheduled</Chip>;
  const m = MAP[status];
  return (
    <Chip size="sm" variant={m.variant}>
      {m.label}
    </Chip>
  );
}
