import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { apisQo, metricsQo } from "@/lib/queries";
import type { TimeRange } from "@/lib/types";
import { ms, pct } from "@/lib/format";
import { MetricChart, RangePicker } from "@/components/charts";
import { DemoTag, MetricCard, PageHeader, Panel } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/monitoring")({
  loader: ({ context }) => context.queryClient.ensureQueryData(apisQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Monitoring — APIShield" },
      { name: "description", content: "Historical latency, error rates, timeouts and availability per endpoint." },
      { property: "og:title", content: "Monitoring — APIShield" },
      { property: "og:description", content: "Historical latency, error rates, timeouts and availability per endpoint." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const { data: apis } = useSuspenseQuery({ ...apisQo() });
  const [apiId, setApiId] = useState<string>("all");
  const [range, setRange] = useState<TimeRange>("24h");
  const { data: metrics } = useQuery({ ...metricsQo(apiId, range), placeholderData: keepPreviousData });

  const latest = metrics?.[metrics.length - 1];
  const avgLatency = metrics?.length ? Math.round(metrics.reduce((s, m) => s + m.avgLatency, 0) / metrics.length) : null;
  const timeouts = metrics?.reduce((s, m) => s + m.timeouts, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Monitoring"
        description="Historical checks per endpoint. CPU and memory metrics appear here only when the backend provides infrastructure telemetry."
        actions={<DemoTag>Simulated telemetry</DemoTag>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={apiId} onValueChange={setApiId}>
          <SelectTrigger className="w-48" aria-label="Select API"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All monitored APIs</SelectItem>
            {apis.filter((a) => a.monitoring).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Avg latency (window)" value={ms(avgLatency)} hint={`Last ${range}`} />
        <MetricCard label="Latest p95" value={ms(latest?.p95Latency)} hint={latest ? "Most recent check window" : "No data"} />
        <MetricCard label="Availability (latest)" value={latest ? `${latest.availability}%` : "—"} hint="Successful check share" t={latest && latest.availability < 99 ? "warning" : "success"} />
        <MetricCard label="Timeouts (window)" value={timeouts} hint={`Total in last ${range}`} t={timeouts > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Latency" description={`Average and p95 latency — last ${range}.`}>
          <MetricChart
            data={metrics ?? []}
            range={range}
            area
            series={[
              { key: "avgLatency", label: "Avg latency", color: "var(--chart-1)", unit: " ms" },
              { key: "p95Latency", label: "p95 latency", color: "var(--chart-2)", unit: " ms" },
            ]}
          />
        </Panel>
        <Panel title="Request volume" description={`Requests seen by checks — last ${range}.`}>
          <MetricChart data={metrics ?? []} range={range} series={[{ key: "requests", label: "Requests", color: "var(--chart-3)" }]} />
        </Panel>
        <Panel title="Error rates" description={`HTTP 4xx and 5xx share of requests — last ${range}.`}>
          <MetricChart
            data={metrics ?? []}
            range={range}
            area
            series={[
              { key: "errorRate5xx", label: "5xx %", color: "var(--chart-4)", unit: "%" },
              { key: "errorRate4xx", label: "4xx %", color: "var(--chart-3)", unit: "%" },
            ]}
          />
        </Panel>
        <Panel title="Timeouts" description={`Checks that exceeded the configured timeout — last ${range}.`}>
          <MetricChart data={metrics ?? []} range={range} series={[{ key: "timeouts", label: "Timeouts", color: "var(--chart-4)" }]} />
        </Panel>
        <Panel title="Availability" description={`Successful check share — last ${range}.`} className="lg:col-span-2">
          <MetricChart data={metrics ?? []} range={range} area series={[{ key: "availability", label: "Availability", color: "var(--chart-5)", unit: "%" }]} />
        </Panel>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Metrics shown are simulated. Risk estimates ({pct(0.7)} and above classify as high) come from predictions, not from these charts.
      </p>
    </>
  );
}
