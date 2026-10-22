import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { rcasQo } from "@/lib/queries";
import { RelTime, DemoTag, EmptyState, HealthBadge, PageHeader, Panel  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/analysis/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(rcasQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Root-cause analysis — APIShield" },
      { name: "description", content: "Investigations linking incidents, predictions, telemetry evidence and recommendations." },
      { property: "og:title", content: "Root-cause analysis — APIShield" },
      { property: "og:description", content: "Investigations linking incidents, predictions, telemetry evidence and recommendations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { data: rcas } = useSuspenseQuery({ ...rcasQo() });

  return (
    <>
      <PageHeader
        title="Root-cause analysis"
        description="Diagnostics that connect predictions, telemetry and recommended troubleshooting steps for each incident."
        actions={<DemoTag>Simulated diagnostics</DemoTag>}
      />

      <Panel bodyClassName="p-0">
        {rcas.length === 0 ? (
          <EmptyState title="No analyses yet" description="Investigations are created when a failure or high-risk prediction is examined." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API</TableHead>
                <TableHead>Current health</TableHead>
                <TableHead>Latency change</TableHead>
                <TableHead>Error-rate change</TableHead>
                <TableHead>Investigated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rcas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to="/analysis/$id" params={{ id: r.id }} className="text-sm font-medium hover:underline">{r.apiName}</Link>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{r.endpoint}</span>
                  </TableCell>
                  <TableCell><HealthBadge status={r.currentHealth} /></TableCell>
                  <TableCell className="font-mono text-sm text-warning">+{r.latencyChangePct}%</TableCell>
                  <TableCell className="font-mono text-sm text-danger">+{r.errorRateChangePct}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground"><RelTime at={r.investigatedAt} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
