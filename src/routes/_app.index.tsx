import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, BellRing, CircleCheck, CircleX, Gauge, Search, ShieldAlert, TriangleAlert } from "lucide-react";
import { activityQo, alertsQo, apisQo, metricsQo } from "@/lib/queries";
import type { TimeRange } from "@/lib/types";
import { ms, pct } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { MetricChart, RangePicker } from "@/components/charts";
import { RelTime, DemoTag, EmptyState, HealthBadge, MetricCard, Panel, PageHeader, RiskBadge  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(apisQo()),
      context.queryClient.ensureQueryData(alertsQo()),
      context.queryClient.ensureQueryData(activityQo()),
    ]),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Dashboard — APIShield" },
      { name: "description", content: "API health, failure-risk predictions, alerts and activity at a glance." },
      { property: "og:title", content: "Dashboard — APIShield" },
      { property: "og:description", content: "API health, failure-risk predictions, alerts and activity at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const kindIcon = {
  test: Gauge,
  config: Activity,
  prediction: ShieldAlert,
  alert: BellRing,
} as const;

function Dashboard() {
  const { data: apis } = useSuspenseQuery({ ...apisQo() });
  const { data: alerts } = useSuspenseQuery({ ...alertsQo() });
  const { data: activity } = useSuspenseQuery({ ...activityQo() });

  const [range, setRange] = useState<TimeRange>("24h");
  const { data: metrics } = useQuery({ ...metricsQo("all", range), placeholderData: keepPreviousData });

  const monitored = apis.filter((a) => a.monitoring);
  const healthy = monitored.filter((a) => a.health === "healthy").length;
  const degraded = monitored.filter((a) => a.health === "degraded").length;
  const failing = monitored.filter((a) => a.health === "failing").length;
  const highRisk = apis.filter((a) => a.risk === "high");
  const latencies = monitored.map((a) => a.lastLatencyMs).filter((v): v is number => v != null);
  const avgLatency = latencies.length ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : null;

  const [query, setQuery] = useState("");
  const filteredApis = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apis;
    return apis.filter((a) => a.name.toLowerCase().includes(q) || a.url.toLowerCase().includes(q));
  }, [apis, query]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of monitored endpoints, current health, predicted failure risk and recent alerts."
        actions={<DemoTag />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Total APIs" value={apis.length} hint={`${monitored.length} monitored`} icon={<Gauge className="size-4" />} />
        <MetricCard label="Healthy" value={healthy} icon={<CircleCheck className="size-4" />} t="success" />
        <MetricCard label="Degraded" value={degraded} icon={<TriangleAlert className="size-4" />} {...(degraded ? { t: "warning" as const } : {})} />
        <MetricCard label="Failing" value={failing} icon={<CircleX className="size-4" />} {...(failing ? { t: "danger" as const } : {})} />
        <MetricCard label="High risk" value={highRisk.length} hint="Predicted failure risk" icon={<ShieldAlert className="size-4" />} t={highRisk.length ? "warning" : "success"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Fleet latency"
          description={`Average and p95 latency across all monitored APIs — last ${range}.`}
          actions={<RangePicker value={range} onChange={setRange} />}
        >
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
        <Panel title="Fleet error rate" description={`4xx / 5xx error rate (% of requests) across the fleet — last ${range}.`} actions={<span className="text-xs text-muted-foreground">Avg latency {ms(avgLatency)}</span>}>
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
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title="API health"
          description="Latest check result per endpoint."
          className="lg:col-span-2"
          bodyClassName="p-0"
          actions={
            <div className="relative w-56 max-w-full">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search APIs…" aria-label="Search APIs" className="h-8 pl-8 text-sm" />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>HTTP</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Last latency</TableHead>
                <TableHead className="text-right">Last check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApis.length === 0 ? (
                <TableRow><TableCell colSpan={6}><EmptyState title="No APIs match your search" /></TableCell></TableRow>
              ) : (
                filteredApis.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer">
                    <TableCell>
                      <Link to="/apis/$id" params={{ id: a.id }} className="block">
                        <span className="text-sm font-medium hover:underline">{a.name}</span>
                        <span className="mt-0.5 block max-w-64 truncate font-mono text-xs text-muted-foreground">{a.url}</span>
                      </Link>
                    </TableCell>
                    <TableCell><HealthBadge status={a.health} /></TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{a.lastStatusCode ?? "—"}</TableCell>
                    <TableCell><RiskBadge risk={a.risk} score={a.riskScore} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">{ms(a.lastLatencyMs)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground"><RelTime at={a.lastCheckedAt} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Panel>

        <div className="space-y-4">
          <Panel title="Recent alerts" actions={<Link to="/alerts" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
            {alerts.length === 0 ? (
              <EmptyState title="No alerts" description="Nothing needs attention right now." />
            ) : (
              <ul className="space-y-3">
                {alerts.slice(0, 4).map((al) => (
                  <li key={al.id} className="flex items-start gap-2.5 text-sm">
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${al.severity === "critical" ? "bg-danger" : al.severity === "warning" ? "bg-warning" : "bg-primary"}`} aria-hidden />
                    <div>
                      <p className="font-medium leading-snug">{al.title}</p>
                      <p className="text-xs text-muted-foreground"><RelTime at={al.createdAt} /> · {al.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Recent activity">
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="space-y-3">
                {activity.map((ev) => {
                  const Icon = kindIcon[ev.kind];
                  return (
                    <li key={ev.id} className="flex items-start gap-2.5 text-sm">
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <div>
                        <p className="leading-snug">{ev.message}</p>
                        <p className="text-xs text-muted-foreground"><RelTime at={ev.at} /></p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
