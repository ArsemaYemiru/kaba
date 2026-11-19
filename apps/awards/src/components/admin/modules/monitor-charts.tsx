"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { label: string; a: number; b?: number };

/** Small dark bar chart for admin analytics (Recharts; colours from the Gold Night tokens). */
export function BarsChart({ data, aLabel, bLabel, height = 220 }: { data: Point[]; aLabel: string; bLabel?: string; height?: number }) {
  if (!data.length) return <p className="py-10 text-center text-xs text-muted-foreground">No data in this period.</p>;
  return (
    <div style={{ height }} role="img" aria-label={`${aLabel}${bLabel ? ` and ${bLabel}` : ""} chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip cursor={{ fill: "rgba(255,184,0,0.08)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--foreground)" }} />
          <Bar dataKey="a" name={aLabel} fill="var(--gold)" radius={[3, 3, 0, 0]} />
          {bLabel ? <Bar dataKey="b" name={bLabel} fill="var(--red)" radius={[3, 3, 0, 0]} /> : null}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
