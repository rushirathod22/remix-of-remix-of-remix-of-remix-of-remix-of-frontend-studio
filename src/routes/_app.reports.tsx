import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { historyQo } from "@/lib/queries";
import type { HistoryEvent } from "@/lib/types";
import { dateTime, downloadCsv, ms, pct } from "@/lib/format";
import { RelTime, DemoTag, EmptyState, PageHeader, Panel, Pill  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/reports")({
  loader: ({ context }) => context.queryClient.ensureQueryData(historyQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Reports — APIShield" },
      { name: "description", content: "Combined history of tests, failures, predictions, alerts and model events, exportable as CSV." },
      { property: "og:title", content: "Reports — APIShield" },
      { property: "og:description", content: "Combined history of tests, failures, predictions, alerts and model events, exportable as CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const categoryLabel: Record<HistoryEvent["category"], string> = {
  test: "Test",
  failure: "Failure",
  prediction: "Prediction",
  alert: "Alert",
  model: "Model",
};

const categoryTone: Record<HistoryEvent["category"], Parameters<typeof Pill>[0]["t"]> = {
  test: "info",
  failure: "danger",
  prediction: "warning",
  alert: "danger",
  model: "neutral",
};

function ReportsPage() {
  const { data: events } = useSuspenseQuery({ ...historyQo() });
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(
    () => (category === "all" ? events : events.filter((e) => e.category === category)),
    [events, category],
  );

  const exportCsv = () => {
    downloadCsv(
      `apishield-history-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((e) => ({
        at: e.at,
        category: e.category,
        api: e.apiName,
        description: e.description,
        status: e.status,
        statusCode: e.statusCode ?? "",
        latencyMs: e.latencyMs ?? "",
        riskScore: e.riskScore ?? "",
      })),
    );
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Combined event history across tests, failures, predictions, alerts and model evaluations. Simulated demo data."
        actions={
          <>
            <DemoTag />
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="size-4" aria-hidden /> Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44" aria-label="Filter by category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="test">Tests</SelectItem>
            <SelectItem value="failure">Failures</SelectItem>
            <SelectItem value="prediction">Predictions</SelectItem>
            <SelectItem value="alert">Alerts</SelectItem>
            <SelectItem value="model">Model events</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState title="No events match this filter" description="Try another category." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>API</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Code</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground" title={dateTime(e.at)}><RelTime at={e.at} /></TableCell>
                  <TableCell><Pill t={categoryTone[e.category]}>{categoryLabel[e.category]}</Pill></TableCell>
                  <TableCell className="text-sm">{e.apiName}</TableCell>
                  <TableCell className="max-w-72 truncate text-sm" title={e.description}>{e.description}</TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">{e.status}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{e.statusCode ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{e.latencyMs != null ? ms(e.latencyMs) : e.riskScore != null ? pct(e.riskScore, 1) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
