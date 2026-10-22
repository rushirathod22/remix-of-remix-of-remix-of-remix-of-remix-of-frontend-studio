import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { FeatureContribution, MetricPoint, TimeRange } from "@/lib/types";
import { chartTick, dateTime } from "@/lib/format";
import { EmptyState } from "./shared";
import { LineChart as LineIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }, labelFormatter: (l: string) => dateTime(l) };

export interface SeriesDef { key: keyof MetricPoint; label: string; color: string; unit?: string }

export function MetricChart({ data, series, range, height = 260, area }: { data: MetricPoint[]; series: SeriesDef[]; range: TimeRange; height?: number; area?: boolean }) {
  if (!data.length) return <EmptyState icon={<LineIcon className="size-6" />} title="No data for this period" description="Monitoring may be paused for this API, or no checks have run yet." />;
  const Chart = area ? AreaChart : LineChart;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="t" {...axis} tickFormatter={(v) => chartTick(v, range)} minTickGap={32} />
          <YAxis {...axis} width={52} {...(series[0]?.unit ? { unit: series[0].unit } : {})} />
          <Tooltip {...tooltipStyle} />
          {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) =>
            area ? (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} fill={s.color} fillOpacity={0.08} strokeWidth={1.75} dot={false} {...(s.unit ? { unit: s.unit } : {})} />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={1.75} dot={false} {...(s.unit ? { unit: s.unit } : {})} />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

export function ContributionChart({ data }: { data: FeatureContribution[] }) {
  if (!data.length) return <EmptyState title="No explanation available" />;
  const sorted = [...data].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return (
    <div style={{ height: sorted.length * 40 + 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" {...axis} />
          <YAxis type="category" dataKey="feature" {...axis} width={170} />
          <ReferenceLine x={0} stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={tooltipStyle.contentStyle} formatter={(v: number) => [v > 0 ? `+${v}` : v, "Contribution"]} />
          <Bar dataKey="contribution" radius={2} barSize={16}>
            {sorted.map((d) => <Cell key={d.feature} fill={d.contribution >= 0 ? "var(--danger)" : "var(--success)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RangePicker({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <ToggleGroup type="single" size="sm" variant="outline" value={value} onValueChange={(v) => v && onChange(v as TimeRange)} aria-label="Time range">
      {(["1h", "6h", "24h", "7d"] as TimeRange[]).map((r) => <ToggleGroupItem key={r} value={r} className="px-3 text-xs">{r}</ToggleGroupItem>)}
    </ToggleGroup>
  );
}
