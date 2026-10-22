import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Plus, X } from "lucide-react";
import { services } from "@/lib/services";
import type { AuthType, HttpMethod, KeyValue, TestRequest, TestResult } from "@/lib/types";
import { KeyValueList } from "@/components/api-form";
import { TestResultView } from "@/components/test-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DemoTag, ErrorState, Panel, PageHeader } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";

export const Route = createFileRoute("/_app/testing")({
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "API testing — APIShield" },
      { name: "description", content: "Build a request, run it and inspect the response — ad-hoc, without saving an API." },
      { property: "og:title", content: "API testing — APIShield" },
      { property: "og:description", content: "Build a request, run it and inspect the response — ad-hoc, without saving an API." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestingPage,
});

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const authTypes: AuthType[] = ["none", "bearer", "api_key", "basic"];

function TestingPage() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [queryParams, setQueryParams] = useState<KeyValue[]>([]);
  const [headers, setHeaders] = useState<KeyValue[]>([{ key: "Accept", value: "application/json" }]);
  const [authType, setAuthType] = useState<AuthType>("none");
  const [secret, setSecret] = useState("");
  const [body, setBody] = useState("");
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [validationRule, setValidationRule] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  const run = useMutation({
    mutationFn: (req: TestRequest) => services.testing.run(req),
    onSuccess: (r) => {
      setError(null);
      setResult(r);
    },
    onError: (e) => {
      setResult(null);
      setError((e as Error).message);
    },
  });

  const hasBody = method === "POST" || method === "PUT" || method === "PATCH";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Enter a request URL.");
      return;
    }
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol");
    } catch {
      setError("Enter a valid http(s) URL.");
      return;
    }
    run.mutate({
      url: url.trim(),
      method,
      queryParams: queryParams.filter((r) => r.key.trim()),
      headers: headers.filter((r) => r.key.trim()),
      authType,
      body: hasBody ? body.trim() || undefined : undefined,
      expectedStatus,
      validationRule: validationRule.trim() || undefined,
      timeoutMs,
    });
  };

  return (
    <>
      <PageHeader
        title="API testing"
        description="Build a request and inspect the result. Nothing is saved — use it to verify an endpoint before adding it to monitoring."
        actions={<DemoTag>Simulated responses</DemoTag>}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr]">
              <div>
                <Label htmlFor="t-method" className="text-xs font-medium">Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                  <SelectTrigger id="t-method" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{methods.map((m) => <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="t-url" className="text-xs font-medium">URL</Label>
                <Input id="t-url" className="mt-1.5 font-mono text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/v1/resource" />
              </div>
            </div>

            <Tabs defaultValue="params">
              <TabsList>
                <TabsTrigger value="params">Params</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="auth">Authorization</TabsTrigger>
                {hasBody && <TabsTrigger value="body">Body</TabsTrigger>}
              </TabsList>
              <TabsContent value="params" className="mt-3">
                <KeyValueList label="Query parameters" rows={queryParams} onChange={setQueryParams} />
              </TabsContent>
              <TabsContent value="headers" className="mt-3">
                <KeyValueList label="Headers" rows={headers} onChange={setHeaders} />
              </TabsContent>
              <TabsContent value="auth" className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="t-auth" className="text-xs font-medium">Auth type</Label>
                    <Select value={authType} onValueChange={(v) => setAuthType(v as AuthType)}>
                      <SelectTrigger id="t-auth" className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>{authTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="t-secret" className="text-xs font-medium">Secret</Label>
                    <Input
                      id="t-secret"
                      type="password"
                      className="mt-1.5 font-mono text-sm"
                      value={secret}
                      disabled={authType === "none"}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="Token or API key"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">The secret is used only for this simulated request and is never stored.</p>
              </TabsContent>
              {hasBody && (
                <TabsContent value="body" className="mt-3">
                  <Label htmlFor="t-body" className="text-xs font-medium">Request body (JSON)</Label>
                  <Textarea id="t-body" className="mt-1.5 min-h-28 font-mono text-xs" value={body} onChange={(e) => setBody(e.target.value)} placeholder='{ "ping": true }' />
                </TabsContent>
              )}
            </Tabs>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="t-status" className="text-xs font-medium">Expected status</Label>
                <Input id="t-status" type="number" className="mt-1.5 font-mono" value={String(expectedStatus)} onChange={(e) => setExpectedStatus(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="t-rule" className="text-xs font-medium">Validation rule</Label>
                <Input id="t-rule" className="mt-1.5 font-mono text-sm" value={validationRule} onChange={(e) => setValidationRule(e.target.value)} placeholder="$.status exists" />
              </div>
              <div>
                <Label htmlFor="t-timeout" className="text-xs font-medium">Timeout (ms)</Label>
                <Input id="t-timeout" type="number" className="mt-1.5" value={String(timeoutMs)} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={run.isPending}>
                {run.isPending ? <X className="size-3.5 animate-spin" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                {run.isPending ? "Running…" : "Run test"}
              </Button>
              <span className="text-xs text-muted-foreground">No real HTTP request is sent in this demo build.</span>
            </div>
          </form>
        </Panel>

        <div className="lg:col-span-2">
          {error ? (
            <ErrorState message={error} />
          ) : result ? (
            <TestResultView result={result} />
          ) : (
            <Panel title="Result">
              <p className="py-8 text-center text-sm text-muted-foreground">Run a test to see the response here.</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
