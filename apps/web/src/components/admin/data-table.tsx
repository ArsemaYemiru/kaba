"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BulkOpDef = { op: string; label: string; destructive?: boolean; confirm?: string };
type BulkFn = (input: { ids: string[]; op: string }) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;

export type DataTableProps<T extends { id: string }> = {
  rows: T[];
  columns: ColumnDef<T, unknown>[];
  /** column id → URL sort key */
  sortable?: Record<string, string>;
  sort?: { key: string; dir: "asc" | "desc" };
  bulk?: { ops: BulkOpDef[]; run: BulkFn };
  empty: React.ReactNode;
  label: string;
};

/**
 * Admin data table (TanStack Table v8 + shadcn styling, D-14). Sorting,
 * filtering and pagination live in the URL (server-side); the table handles
 * rendering, row selection and bulk actions.
 */
export function DataTable<T extends { id: string }>({ rows, columns, sortable = {}, sort, bulk, empty, label }: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [pending, start] = useTransition();

  const cols = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!bulk) return columns;
    const select: ColumnDef<T, unknown> = {
      id: "_select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all rows"
          className="size-4 accent-[#FFB800]"
          checked={table.getIsAllRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomeRowsSelected();
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input type="checkbox" aria-label="Select row" className="size-4 accent-[#FFB800]" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
      size: 36,
    };
    return [select, ...columns];
  }, [bulk, columns]);

  // TanStack Table v8 returns unstable functions the React Compiler can't memoise; it skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: cols,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
    enableRowSelection: !!bulk,
    manualSorting: true,
  });

  const selectedIds = Object.keys(selection).filter((k) => selection[k]);

  const sortHref = (key: string) => {
    const qs = new URLSearchParams(params.toString());
    const dir = sort?.key === key && sort.dir === "asc" ? "desc" : "asc";
    qs.set("sort", key);
    qs.set("dir", dir);
    qs.delete("page");
    return `${pathname}?${qs}`;
  };

  const runBulk = (def: BulkOpDef) => {
    if (!bulk) return;
    const msg = def.confirm ?? (def.destructive ? `Delete ${selectedIds.length} item(s)? This can't be undone.` : null);
    if (msg && !window.confirm(msg)) return;
    start(async () => {
      const r = await bulk.run({ ids: selectedIds, op: def.op });
      if (r.ok) {
        toast.success(`${def.label}: ${r.count} item(s)`);
        setSelection({});
        router.refresh();
      } else toast.error(r.error === "forbidden" ? "Not allowed." : r.error);
    });
  };

  return (
    <div className="rounded-lg border border-line bg-surface">
      {bulk && selectedIds.length ? (
        <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <span className="mr-2 text-xs font-semibold tabular-nums">{selectedIds.length} selected</span>
          {bulk.ops.map((o) => (
            <Button key={o.op} size="sm" variant={o.destructive ? "destructive" : "outline"} disabled={pending} onClick={() => runBulk(o)}>
              {o.label}
            </Button>
          ))}
          {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Working" /> : null}
          <button type="button" className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelection({})}>
            Clear selection
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm" aria-label={label}>
          <thead className="border-b border-line text-left text-xs text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sortKey = sortable[h.column.id];
                  const active = sortKey && sort?.key === sortKey;
                  const Icon = active ? (sort!.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      className="px-3 py-2.5 font-medium whitespace-nowrap"
                      style={h.column.columnDef.size ? { width: h.column.columnDef.size } : undefined}
                      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {sortKey ? (
                        <button type="button" onClick={() => router.replace(sortHref(sortKey), { scroll: false })} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-gold")}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <Icon className="size-3" aria-hidden="true" />
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className={cn("hover:bg-surface-2/50", row.getIsSelected() && "bg-surface-2/70")}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={cols.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const STANDARD_BULK: BulkOpDef[] = [
  { op: "publish", label: "Publish" },
  { op: "unpublish", label: "Unpublish" },
  { op: "archive", label: "Archive" },
  { op: "delete", label: "Delete", destructive: true },
];
