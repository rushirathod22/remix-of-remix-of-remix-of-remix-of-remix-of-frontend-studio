import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CircleCheck, CircleX, Lightbulb } from "lucide-react";
import { rcaQo } from "@/lib/queries";
import { dateTime, ms } from "@/lib/format";
import { ContributionChart } from "@/components/charts";
import { RelTime, DemoTag, EmptyState, HealthBadge, KV, Panel, Pill  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/analysis/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(rcaQo(params.id)),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Root-cause detail — APIShield" },
      { name: "description", content: "Diagnostic evidence, SHAP/LIME explanations and recommended troubleshooting steps." },
      { property: "og:title", content: "Root-cause detail — APIShield" },
      { property: "og:description", content: "Diagnostic evidence, SHAP/LIME explanations and recommended troubleshooting steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysisDetail,
});

function AnalysisDetail() {
  const { id } = Route.useParams();
  const { data: r } = useSuspenseQuery({ ...rcaQo(id) });

  return (
    <>
      <Link to="/analysis" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All analyses
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{r.apiName}</h1>
        <HealthBadge status={r.currentHealth} />
        <DemoTag>Simulated diagnostics</DemoTag>
        <span className="text-xs text-muted-foreground">Investigated {dateTime(r.investigatedAt)} (<RelTime at={r.investigatedAt} />)</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Telemetry changes" className="lg:col-span-1">
          <dl className="space-y-3">
            <KV label="Latency change"><span className="font-mono text-warning">+{r.latencyChangePct}%</span></KV>
            <KV label="Error-rate change"><span className="font-mono text-danger">+{r.errorRateChangePct}%</span></KV>
          </dl>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTTP errors (window)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8">Code</TableHead>
                <TableHead className="h-8 text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.httpErrors.map((e) => (
                <TableRow key={e.code}>
                  <TableCell className="py-1.5 font-mono text-sm">{e.code}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-sm">{e.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Diagnostic evidence" description="Observations collected around the incident window." className="lg:col-span-2">
          <ul className="space-y-2.5">
            {r.evidence.map((e) => (
              <li key={e} className="flex items-start gap-2 text-sm">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Related prediction: {r.predictionId ? <Link to="/predictions/$id" params={{ id: r.predictionId }} className="font-medium text-primary hover:underline">{r.predictionId}</Link> : "none"}.
          </p>
        </Panel>
      </div>

      <Panel
        title="SHAP feature contributions"
        description="Ranked impact of each feature on the model output. Red pushes toward failure, green pushes away. Feature importance alone does not establish the actual root cause."
        className="mt-4"
      >
        <ContributionChart data={r.shap} />
      </Panel>

      {r.lime && r.lime.length > 0 && (
        <Panel title="LIME feature contributions" description="Local approximation — simulated in this demo build." className="mt-4">
          <ContributionChart data={r.lime} />
        </Panel>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Possible causes">
          {r.causes.length === 0 ? (
            <EmptyState title="No causes identified" />
          ) : (
            <ul className="space-y-3">
              {r.causes.map((c) => (
                <li key={c.title} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{c.title}</p>
                    <Pill t={c.likelihood === "likely" ? "warning" : "neutral"}>{c.likelihood}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.evidence}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recommendations" description="Practical troubleshooting steps, not guaranteed fixes.">
          <ul className="space-y-3">
            {r.recommendations.map((rec) => (
              <li key={rec.title} className="rounded-md border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium"><Lightbulb className="size-3.5 text-warning" aria-hidden /> {rec.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{rec.description}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
                  {rec.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/apis/$id" params={{ id: r.apiId }}><CircleX className="size-3.5" aria-hidden /> View API</Link>
        </Button>
        {r.predictionId && (
          <Button asChild variant="outline" size="sm">
            <Link to="/predictions/$id" params={{ id: r.predictionId }}>View prediction &amp; risk explanation</Link>
          </Button>
        )}
      </div>
    </>
  );
}
