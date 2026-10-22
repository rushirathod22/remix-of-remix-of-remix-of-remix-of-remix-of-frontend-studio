import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { experimentsQo } from "@/lib/queries";
import type { RunStatus } from "@/lib/types";
import { dateTime, pct } from "@/lib/format";
import { DemoTag, EmptyState, PageHeader, Panel, Pill, type Tone } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/experiments")({
  loader: ({ context }) => context.queryClient.ensureQueryData(experimentsQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Experiments — APIShield" },
      { name: "description", content: "Training runs for the failure-prediction model, with metrics and artifacts." },
      { property: "og:title", content: "Experiments — APIShield" },
      { property: "og:description", content: "Training runs for the failure-prediction model, with metrics and artifacts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExperimentsPage,
});

const statusMap: Record<RunStatus, { t: Tone; label: string }> = {
  completed: { t: "success", label: "Completed" },
  running: { t: "info", label: "Running" },
  failed: { t: "danger", label: "Failed" },
};

function RunStatusBadge({ status }: { status: RunStatus }) {
  const { t, label } = statusMap[status];
  return <Pill t={t}>{label}</Pill>;
}

function ExperimentsPage() {
  const { data: runs } = useSuspenseQuery({ ...experimentsQo() });
  const best = runs.reduce<{ id: string; f1: number } | null>((acc, r) => {
    const f1 = r.metrics?.f1;
    return f1 != null && (!acc || f1 > acc.f1) ? { id: r.id, f1 } : acc;
  }, null);

  return (
    <>
      <PageHeader
        title="Experiments"
        description="Training runs evaluated on labelled telemetry. Higher PR-AUC matters most because failures are rare compared with healthy checks."
        actions={<DemoTag>Simulated runs</DemoTag>}
      />

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Precision</TableHead>
              <TableHead className="text-right">Recall</TableHead>
              <TableHead className="text-right">F1</TableHead>
              <TableHead className="text-right">PR-AUC</TableHead>
              <TableHead className="text-right">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id} className={r.id === best?.id ? "bg-info-soft/40" : undefined}>
                <TableCell>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.runId}</div>
                </TableCell>
                <TableCell className="text-sm">{r.modelType}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.datasetVersion}</TableCell>
                <TableCell><RunStatusBadge status={r.status} /></TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{r.metrics ? pct(r.metrics.precision) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{r.metrics ? pct(r.metrics.recall) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{r.metrics ? pct(r.metrics.f1) : "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">{r.metrics ? pct(r.metrics.prAuc) : "—"}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{dateTime(r.startedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {runs.length === 0 && <EmptyState title="No experiments yet" icon={<FlaskConical className="size-6" />} />}
      </Panel>

      {best && (
        <p className="mt-3 text-xs text-muted-foreground">
          Highlighted row: best completed run so far (F1 {pct(best.f1)}). Its model powers live predictions where noted.
        </p>
      )}
    </>
  );
}
