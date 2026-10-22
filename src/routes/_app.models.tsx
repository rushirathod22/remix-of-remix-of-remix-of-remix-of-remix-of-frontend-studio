import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { modelsQo } from "@/lib/queries";
import type { DeploymentStatus } from "@/lib/types";
import { dateTime, pct } from "@/lib/format";
import { DemoTag, EmptyState, PageHeader, Panel, Pill, type Tone } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/models")({
  loader: ({ context }) => context.queryClient.ensureQueryData(modelsQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Models — APIShield" },
      { name: "description", content: "Registered failure-prediction models and their deployment status." },
      { property: "og:title", content: "Models — APIShield" },
      { property: "og:description", content: "Registered failure-prediction models and their deployment status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModelsPage,
});

const statusMap: Record<DeploymentStatus, { t: Tone; label: string }> = {
  production: { t: "success", label: "Production" },
  staging: { t: "info", label: "Staging" },
  registered: { t: "neutral", label: "Registered" },
  not_deployed: { t: "neutral", label: "Not deployed" },
  failed: { t: "danger", label: "Deploy failed" },
};

function DeploymentBadge({ status }: { status: DeploymentStatus }) {
  const { t, label } = statusMap[status];
  return <Pill t={t}>{label}</Pill>;
}

function ModelsPage() {
  const { data: models } = useSuspenseQuery({ ...modelsQo() });
  const live = models.filter((m) => m.status === "production");

  return (
    <>
      <PageHeader
        title="Models"
        description="Model registry: each version is evaluated on the same labelled telemetry before deployment."
        actions={<DemoTag>Simulated registry</DemoTag>}
      />

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead className="text-right">F1</TableHead>
              <TableHead className="text-right">PR-AUC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Serving endpoint</TableHead>
              <TableHead className="text-right">Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="text-sm font-medium">{m.name} {m.version}</div>
                  <div className="font-mono text-xs text-muted-foreground">run {m.runId}</div>
                </TableCell>
                <TableCell className="text-sm">{m.modelType}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.datasetVersion}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{pct(m.f1)}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{pct(m.prAuc)}</TableCell>
                <TableCell><DeploymentBadge status={m.status} /></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.endpoint ?? "—"}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{dateTime(m.registeredAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {models.length === 0 && <EmptyState title="No registered models" icon={<Boxes className="size-6" />} />}
      </Panel>

      <p className="mt-3 text-xs text-muted-foreground">
        {live.length > 0
          ? `${live.map((m) => `${m.name} ${m.version}`).join(" and ")} currently serve live predictions.`
          : "No model is currently serving live predictions."}
      </p>
    </>
  );
}
