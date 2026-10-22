import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import { alertsQo, apiQo, metricsQo, predictionsQo, qk } from "@/lib/queries";
import { services } from "@/lib/services";
import type { ApiEndpoint, TimeRange } from "@/lib/types";
import { dateTime, ms, pct } from "@/lib/format";
import { MetricChart, RangePicker } from "@/components/charts";
import { TestHistory, TestRunner } from "@/components/test-runner";
import { RelTime, ConfirmDialog, DemoTag, EmptyState, HealthBadge, KV, MetricCard, Panel, Pill, RiskBadge  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/apis/$id/")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(apiQo(params.id)),
      context.queryClient.ensureQueryData(predictionsQo()),
      context.queryClient.ensureQueryData(alertsQo()),
    ]),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "API detail — APIShield" },
      { name: "description", content: "Inspect a monitored endpoint: health, tests, performance, predictions and configuration." },
      { property: "og:title", content: "API detail — APIShield" },
      { property: "og:description", content: "Inspect a monitored endpoint: health, tests, performance, predictions and configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiDetail,
});

function ApiDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: api } = useSuspenseQuery({ ...apiQo(id) });
  const { data: predictions } = useSuspenseQuery({ ...predictionsQo() });
  const { data: alerts } = useSuspenseQuery({ ...alertsQo() });

  const remove = useMutation({
    mutationFn: () => services.apis.remove(api.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.apis });
      toast.success(`API "${api.name}" removed`);
      navigate({ to: "/apis" });
    },
    onError: () => toast.error("Couldn't remove this API"),
  });

  const apiPredictions = predictions.filter((p) => p.apiId === api.id);
  const apiAlerts = alerts.filter((a) => a.apiId === api.id);

  return (
    <>
      <Link to="/apis" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All APIs
      </Link>
      <div className="mt-3 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">{api.name}</h1>
            <HealthBadge status={api.health} />
            <RiskBadge risk={api.risk} score={api.riskScore} />
            <DemoTag>Simulated data</DemoTag>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            <span className="mr-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-semibold">{api.method}</span>
            {api.url}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/apis/$id/edit" params={{ id: api.id }}><Pencil className="size-3.5" aria-hidden /> Edit</Link>
          </Button>
          <ConfirmDialog
            destructive
            confirmLabel="Remove API"
            title={`Remove ${api.name}?`}
            description="This stops monitoring, tests and predictions for this endpoint. This cannot be undone."
            onConfirm={() => remove.mutate()}
            trigger={
              <Button variant="outline" size="sm" className="text-danger" disabled={remove.isPending}>
                <Trash2 className="size-3.5" aria-hidden /> {remove.isPending ? "Removing…" : "Remove"}
              </Button>
            }
          />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full justify-start gap-0.5 overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Test history</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Current health" value={<HealthBadge status={api.health} />} hint={api.lastCheckedAt ? <>Checked <RelTime at={api.lastCheckedAt} /></> : "Never checked"} />
            <MetricCard label="Last status code" value={<span className="font-mono">{api.lastStatusCode ?? "—"}</span>} hint="From the latest check" />
            <MetricCard label="Last latency" value={ms(api.lastLatencyMs)} hint={`Limit ${api.maxLatencyMs.toLocaleString()} ms`} />
            <MetricCard label="Predicted risk" value={<RiskBadge risk={api.risk} score={api.riskScore} />} hint={`Threshold ${pct(api.riskThreshold)}`} />
          </div>
          <Panel title="Run a test" description="Executes the saved request configuration against this endpoint.">
            <TestRunner api={api} />
          </Panel>
          <Panel title="Monitoring schedule">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KV label="Check interval">{api.intervalSec}s</KV>
              <KV label="Request timeout">{(api.timeoutMs / 1000).toFixed(1)}s</KV>
              <KV label="Expected status"><span className="font-mono">{api.expectedStatus}</span></KV>
              <KV label="Monitoring">{api.monitoring ? "Enabled" : "Paused"}</KV>
            </dl>
          </Panel>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Panel title="Test history" description="Manual tests recorded in this session." bodyClassName="p-0">
            <div className="p-5 pt-0"><TestHistory apiId={api.id} /></div>
          </Panel>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <PerformanceTab apiId={api.id} maxLatencyMs={api.maxLatencyMs} />
        </TabsContent>

        <TabsContent value="predictions" className="mt-4 space-y-4">
          <Panel title="Predicted failure risk" description="A healthy API can still carry elevated future risk — these are separate signals.">
            {apiPredictions.length === 0 ? (
              <EmptyState title="No predictions for this API" description="Predictions appear once the model has run against this endpoint." />
            ) : (
              <div className="space-y-2">
                {apiPredictions.map((p) => (
                  <Link
                    key={p.id}
                    to="/predictions/$id"
                    params={{ id: p.id }}
                    className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors hover:bg-accent"
                  >
                    <RiskBadge risk={p.risk} score={p.probability} />
                    <span className="text-muted-foreground">Failure probability {pct(p.probability, 1)} within {p.horizonMin} min</span>
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldAlert className="size-3.5" aria-hidden /> {p.modelVersion} · <RelTime at={p.predictedAt} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Panel title="Alerts for this API" bodyClassName="p-0">
            {apiAlerts.length === 0 ? (
              <EmptyState title="No alerts for this API" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Raised</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiAlerts.map((al) => (
                    <TableRow key={al.id}>
                      <TableCell>
                        <Link to="/alerts" className="text-sm font-medium hover:underline">{al.title}</Link>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{al.description}</span>
                      </TableCell>
                      <TableCell><Pill t={al.severity === "critical" ? "danger" : al.severity === "warning" ? "warning" : "info"}>{al.severity}</Pill></TableCell>
                      <TableCell className="text-sm capitalize">{al.status}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground"><RelTime at={al.createdAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="config" className="mt-4 space-y-4">
          <ConfigPanel api={api} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function PerformanceTab({ apiId, maxLatencyMs }: { apiId: string; maxLatencyMs: number }) {
  const [range, setRange] = useState<TimeRange>("24h");
  const { data: metrics } = useQuery({ ...metricsQo(apiId, range), placeholderData: keepPreviousData });

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><RangePicker value={range} onChange={setRange} /></div>
      <Panel title="Latency" description={`Average and p95 latency — last ${range}. Limit ${maxLatencyMs.toLocaleString()} ms.`}>
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
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Error rate" description={`4xx / 5xx share of requests — last ${range}.`}>
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
        <Panel title="Availability" description={`Share of successful checks — last ${range}.`}>
          <MetricChart data={metrics ?? []} range={range} area series={[{ key: "availability", label: "Availability", color: "var(--chart-5)", unit: "%" }]} />
        </Panel>
      </div>
    </div>
  );
}

function ConfigPanel({ api }: { api: ApiEndpoint }) {
  return (
    <>
      <Panel title="Request configuration">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV label="URL"><span className="block max-w-xs truncate font-mono text-xs">{api.url}</span></KV>
          <KV label="Method"><span className="font-mono">{api.method}</span></KV>
          <KV label="Auth type">{api.authType}</KV>
          <KV label="Secret">{api.hasSecret ? "Configured (hidden)" : "None"}</KV>
          <KV label="Validation rule">{api.validationRule ? <span className="font-mono text-xs">{api.validationRule}</span> : "—"}</KV>
          <KV label="Query parameters">{api.queryParams.length ? `${api.queryParams.length} configured` : "None"}</KV>
          <KV label="Headers">{api.headers.length ? `${api.headers.length} configured` : "None"}</KV>
          <KV label="Request body">{api.body ? "Configured" : "None"}</KV>
        </dl>
      </Panel>
      <Panel title="Monitoring & thresholds">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KV label="Check interval">{api.intervalSec}s</KV>
          <KV label="Max acceptable latency">{api.maxLatencyMs.toLocaleString()} ms</KV>
          <KV label="Error rate threshold">{api.errorRateThreshold}%</KV>
          <KV label="Expected availability">{api.expectedAvailability}%</KV>
          <KV label="Prediction risk threshold">{pct(api.riskThreshold)}</KV>
          <KV label="Monitoring">{api.monitoring ? "Enabled" : "Paused"}</KV>
          <KV label="Created">{dateTime(api.createdAt)}</KV>
        </dl>
      </Panel>
  </>
  );
}
