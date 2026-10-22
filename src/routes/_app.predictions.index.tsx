import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { predictionsQo, apisQo } from "@/lib/queries";
import type { RiskLevel } from "@/lib/types";
import { pct } from "@/lib/format";
import { RelTime, DemoTag, EmptyState, HealthBadge, PageHeader, Panel, RiskBadge  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/predictions/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(predictionsQo()),
      context.queryClient.ensureQueryData(apisQo()),
    ]),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Failure predictions — APIShield" },
      { name: "description", content: "Model-generated failure risk per endpoint, with feature explanations." },
      { property: "og:title", content: "Failure predictions — APIShield" },
      { property: "og:description", content: "Model-generated failure risk per endpoint, with feature explanations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const { data: predictions } = useSuspenseQuery({ ...predictionsQo() });
  const { data: apis } = useSuspenseQuery({ ...apisQo() });

  const [apiFilter, setApiFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      predictions.filter(
        (p) => (apiFilter === "all" || p.apiId === apiFilter) && (riskFilter === "all" || p.risk === (riskFilter as RiskLevel)),
      ),
    [predictions, apiFilter, riskFilter],
  );

  return (
    <>
      <PageHeader
        title="Predictions"
        description="Estimated failure probability for a future window, produced by the trained model. Risk estimates are probabilistic and cannot guarantee future failures."
        actions={<DemoTag>Simulated model output</DemoTag>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={apiFilter} onValueChange={setApiFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by API"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All APIs</SelectItem>
            {apis.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by risk"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState title="No predictions match these filters" description="Try a different API or risk level." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API</TableHead>
                <TableHead>Current health</TableHead>
                <TableHead>Failure probability</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Horizon</TableHead>
                <TableHead>Predicted</TableHead>
                <TableHead>Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link to="/predictions/$id" params={{ id: p.id }} className="text-sm font-medium hover:underline">{p.apiName}</Link>
                  </TableCell>
                  <TableCell><HealthBadge status={p.currentHealth} /></TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{pct(p.probability, 1)}</TableCell>
                  <TableCell><RiskBadge risk={p.risk} /></TableCell>
                  <TableCell className="text-sm">{p.horizonMin} min</TableCell>
                  <TableCell className="text-sm text-muted-foreground"><RelTime at={p.predictedAt} /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.modelVersion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
