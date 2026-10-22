import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { predictionQo, rcasQo } from "@/lib/queries";
import { dateTime, pct } from "@/lib/format";
import { ContributionChart } from "@/components/charts";
import { RelTime, DemoTag, HealthBadge, KV, MetricCard, Panel, RiskBadge  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/predictions/$id")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(predictionQo(params.id)),
      context.queryClient.ensureQueryData(rcasQo()),
    ]),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Prediction detail — APIShield" },
      { name: "description", content: "Failure probability, risk category and feature contributions for one prediction." },
      { property: "og:title", content: "Prediction detail — APIShield" },
      { property: "og:description", content: "Failure probability, risk category and feature contributions for one prediction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PredictionDetail,
});

function PredictionDetail() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery({ ...predictionQo(id) });
  const { data: rcas } = useSuspenseQuery({ ...rcasQo() });
  const rca = rcas.find((r) => r.predictionId === p.id);

  return (
    <>
      <Link to="/predictions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All predictions
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{p.apiName}</h1>
        <HealthBadge status={p.currentHealth} />
        <RiskBadge risk={p.risk} score={p.probability} />
        <DemoTag>Simulated prediction</DemoTag>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Failure probability" value={pct(p.probability, 1)} hint={`Within ${p.horizonMin} minutes`} />
        <MetricCard label="Risk category" value={<RiskBadge risk={p.risk} />} hint="Threshold-based classification" />
        <MetricCard label="Prediction horizon" value={`${p.horizonMin} min`} hint="Window the estimate covers" />
        <MetricCard label="Model version" value={<span className="font-mono text-base">{p.modelVersion}</span>} hint={dateTime(p.predictedAt)} />
      </div>

      <Panel
        title="Feature contributions"
        description="How much each input feature pushed the prediction toward (red) or away from (green) failure. Feature importance does not establish the actual root cause."
        className="mt-6"
      >
        <ContributionChart data={p.features} />
      </Panel>

      <Panel title="Reading this prediction" className="mt-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <KV label="Current health">This reflects checks that already ran — {p.currentHealth} right now.</KV>
          <KV label="Predicted risk">This is the model's estimate for the next {p.horizonMin} minutes, not a measurement.</KV>
          <KV label="Generated">{dateTime(p.predictedAt)} (<RelTime at={p.predictedAt} />)</KV>
          <KV label="Explanation">Contributions shown are simulated until a trained backend model is connected.</KV>
        </dl>
      </Panel>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/apis/$id" params={{ id: p.apiId }}>View API</Link>
        </Button>
        {rca && (
          <Button asChild size="sm">
            <Link to="/analysis/$id" params={{ id: rca.id }}><ShieldAlert className="size-3.5" aria-hidden /> Open root-cause analysis</Link>
          </Button>
        )}
      </div>
    </>
  );
}
