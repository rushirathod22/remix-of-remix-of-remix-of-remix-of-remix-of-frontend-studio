import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CircleX, Loader2, Play } from "lucide-react";
import { services } from "@/lib/services";
import { apiHistoryQo, qk } from "@/lib/queries";
import type { ApiEndpoint, TestResult, TestRequest } from "@/lib/types";
import { dateTime, ms } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DemoTag, EmptyState, Pill, RelTime, type Tone } from "./shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function requestFromApi(api: ApiEndpoint): TestRequest {
  return {
    url: api.url,
    method: api.method,
    queryParams: api.queryParams,
    headers: api.headers,
    authType: api.authType,
    body: api.body,
    expectedStatus: api.expectedStatus,
    validationRule: api.validationRule,
    timeoutMs: api.timeoutMs,
  };
}

const outcomeTone: Record<TestResult["outcome"], Tone> = { success: "success", failure: "danger", timeout: "warning", error: "danger" };

export function TestRunner({ api }: { api: ApiEndpoint }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<TestResult | null>(null);
  const run = useMutation({
    mutationFn: (req: TestRequest) => services.testing.run(req, api.id),
    onSuccess: (r) => {
      setResult(r);
      queryClient.invalidateQueries({ queryKey: qk.apiHistory(api.id) });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => run.mutate(requestFromApi(api))} disabled={run.isPending}>
          {run.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
          {run.isPending ? "Running…" : "Run test"}
        </Button>
        <DemoTag>Simulated test</DemoTag>
        <span className="text-xs text-muted-foreground">No real HTTP request is sent in this demo build.</span>
      </div>

      {run.isError && <Pill t="danger" icon={<CircleX className="size-3" aria-hidden />}>{(run.error as Error).message}</Pill>}

      {result && <TestResultView result={result} />}
    </div>
  );
}

/** Shared result card — reused by the ad-hoc testing page. */
export function TestResultView({ result }: { result: TestResult }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
        <Pill t={outcomeTone[result.outcome]}>{result.outcome}</Pill>
        <span className="font-mono text-sm">
          {result.statusCode ?? "—"} <span className="text-muted-foreground">(expected {result.expectedStatus})</span>
        </span>
        <span className="text-sm text-muted-foreground">{ms(result.latencyMs)}</span>
        <span className="ml-auto text-xs text-muted-foreground">{dateTime(result.testedAt)}</span>
      </div>
      <div className="space-y-4 p-5">
        {result.error && <p className="text-sm text-danger">{result.error}</p>}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validations</h3>
          <ul className="mt-2 space-y-1.5">
            {result.validations.map((v) => (
              <li key={v.rule} className="flex items-start gap-2 text-sm">
                <span className={cn("mt-0.5 font-mono text-xs", v.passed ? "text-success" : "text-danger")}>{v.passed ? "PASS" : "FAIL"}</span>
                <span>
                  {v.rule} <span className="text-muted-foreground">— {v.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {result.headers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response headers</h3>
            <dl className="mt-2 space-y-1 font-mono text-xs">
              {result.headers.map((h) => (
                <div key={h.key} className="flex gap-2">
                  <dt className="text-muted-foreground">{h.key}:</dt>
                  <dd>{h.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {result.body && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response body</h3>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{result.body}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function TestHistory({ apiId }: { apiId: string }) {
  const { data: history } = useSuspenseQuery({ ...apiHistoryQo(apiId) });

  if (!history.length) {
    return <EmptyState title="No test history yet" description="Run a manual test and it will appear here." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Latency</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-sm text-muted-foreground"><RelTime at={t.testedAt} /></TableCell>
            <TableCell><Pill t={outcomeTone[t.outcome]}>{t.outcome}</Pill></TableCell>
            <TableCell className="font-mono text-sm">{t.statusCode ?? "—"}</TableCell>
            <TableCell className="text-right font-mono text-sm">{ms(t.latencyMs)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
