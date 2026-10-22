import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ApiEndpoint, ApiEndpointInput, AuthType, HttpMethod, KeyValue } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "./shared";

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const authTypes: AuthType[] = ["none", "bearer", "api_key", "basic"];

export function KeyValueList({ label, rows, onChange }: { label: string; rows: KeyValue[]; onChange: (rows: KeyValue[]) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1.5 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={row.key}
              placeholder="Key"
              className="font-mono text-xs"
              aria-label={`${label} key ${i + 1}`}
              onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))}
            />
            <Input
              value={row.value}
              placeholder="Value"
              className="font-mono text-xs"
              aria-label={`${label} value ${i + 1}`}
              onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
            />
            <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`Remove ${label} row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange([...rows, { key: "", value: "" }])}>
        <Plus className="size-3.5" aria-hidden /> Add row
      </Button>
    </div>
  );
}

type FormState = Omit<ApiEndpointInput, "queryParams" | "headers" | "secret"> & {
  queryParams: KeyValue[];
  headers: KeyValue[];
  secret: string;
};

function stateFromApi(api?: ApiEndpoint): FormState {
  return {
    name: api?.name ?? "",
    url: api?.url ?? "",
    method: api?.method ?? "GET",
    queryParams: api?.queryParams ?? [],
    headers: api?.headers ?? [{ key: "Accept", value: "application/json" }],
    authType: api?.authType ?? "none",
    secret: "",
    body: api?.body,
    expectedStatus: api?.expectedStatus ?? 200,
    validationRule: api?.validationRule,
    timeoutMs: api?.timeoutMs ?? 5000,
    intervalSec: api?.intervalSec ?? 60,
    maxLatencyMs: api?.maxLatencyMs ?? 800,
    errorRateThreshold: api?.errorRateThreshold ?? 2,
    expectedAvailability: api?.expectedAvailability ?? 99.9,
    riskThreshold: api?.riskThreshold ?? 0.7,
    monitoring: api?.monitoring ?? true,
  };
}

function validate(s: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!s.name.trim()) errors.name = "Name is required.";
  if (!s.url.trim()) errors.url = "URL is required.";
  else {
    try {
      const u = new URL(s.url);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol");
    } catch {
      errors.url = "Enter a valid http(s) URL.";
    }
  }
  if (!Number.isInteger(s.expectedStatus) || s.expectedStatus < 100 || s.expectedStatus > 599) errors.expectedStatus = "Expected status must be between 100 and 599.";
  if (s.timeoutMs <= 0) errors.timeoutMs = "Timeout must be positive.";
  if (s.intervalSec <= 0) errors.intervalSec = "Interval must be positive.";
  if (s.maxLatencyMs <= 0) errors.maxLatencyMs = "Latency limit must be positive.";
  if (s.errorRateThreshold < 0 || s.errorRateThreshold > 100) errors.errorRateThreshold = "Error rate threshold must be 0–100%.";
  if (s.expectedAvailability <= 0 || s.expectedAvailability > 100) errors.expectedAvailability = "Availability must be between 0 and 100%.";
  if (s.riskThreshold <= 0 || s.riskThreshold >= 1) errors.riskThreshold = "Risk threshold must be between 0 and 1.";
  return errors;
}

export function ApiForm({ api, onSubmit, saving, submitLabel }: { api?: ApiEndpoint; onSubmit: (input: ApiEndpointInput) => Promise<unknown>; saving: boolean; submitLabel: string }) {
  const [state, setState] = useState<FormState>(() => stateFromApi(api));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setState((s) => ({ ...s, [key]: value }));

  const err = (key: keyof FormState) =>
    errors[key] ? <p className="mt-1 text-xs text-danger">{errors[key]}</p> : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(state);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await onSubmit({
      name: state.name.trim(),
      url: state.url.trim(),
      method: state.method,
      queryParams: state.queryParams.filter((r) => r.key.trim()),
      headers: state.headers.filter((r) => r.key.trim()),
      authType: state.authType,
      secret: state.secret.trim() || undefined,
      body: state.method === "GET" || state.method === "DELETE" ? undefined : state.body?.trim() || undefined,
      expectedStatus: state.expectedStatus,
      validationRule: state.validationRule?.trim() || undefined,
      timeoutMs: state.timeoutMs,
      intervalSec: state.intervalSec,
      maxLatencyMs: state.maxLatencyMs,
      errorRateThreshold: state.errorRateThreshold,
      expectedAvailability: state.expectedAvailability,
      riskThreshold: state.riskThreshold,
      monitoring: state.monitoring,
    });
  };

  const hasBody = state.method === "POST" || state.method === "PUT" || state.method === "PATCH";
  const numField = (key: keyof FormState, label: string, hint?: string) => (
    <div>
      <Label htmlFor={`f-${key}`} className="text-xs font-medium">{label}</Label>
      <Input
        id={`f-${key}`}
        type="number"
        className="mt-1.5"
        value={String(state[key] as number)}
        onChange={(e) => set(key, Number(e.target.value) as never)}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {err(key)}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Panel title="Request">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="f-name" className="text-xs font-medium">Name</Label>
            <Input id="f-name" className="mt-1.5" value={state.name} onChange={(e) => set("name", e.target.value)} placeholder="Payments Service" aria-invalid={!!errors.name} />
            {err("name")}
          </div>
          <div>
            <Label htmlFor="f-method" className="text-xs font-medium">Method</Label>
            <Select value={state.method} onValueChange={(v) => set("method", v as HttpMethod)}>
              <SelectTrigger id="f-method" className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{methods.map((m) => <SelectItem key={m} value={m} className="font-mono">{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="f-url" className="text-xs font-medium">URL</Label>
            <Input id="f-url" className="mt-1.5 font-mono text-sm" value={state.url} onChange={(e) => set("url", e.target.value)} placeholder="https://api.example.com/v1/resource" aria-invalid={!!errors.url} />
            {err("url")}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <KeyValueList label="Query parameters" rows={state.queryParams} onChange={(r) => set("queryParams", r)} />
          <KeyValueList label="Headers" rows={state.headers} onChange={(r) => set("headers", r)} />
        </div>
        {hasBody && (
          <div className="mt-4">
            <Label htmlFor="f-body" className="text-xs font-medium">Request body (JSON)</Label>
            <Textarea id="f-body" className="mt-1.5 min-h-28 font-mono text-xs" value={state.body ?? ""} onChange={(e) => set("body", e.target.value)} placeholder='{ "ping": true }' />
          </div>
        )}
      </Panel>

      <Panel title="Authentication">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="f-auth" className="text-xs font-medium">Auth type</Label>
            <Select value={state.authType} onValueChange={(v) => set("authType", v as AuthType)}>
              <SelectTrigger id="f-auth" className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>{authTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="f-secret" className="text-xs font-medium">
              {state.authType === "none" ? "Secret (unused)" : api ? "Replace secret" : "Secret"}
            </Label>
            <Input
              id="f-secret"
              type="password"
              className="mt-1.5 font-mono text-sm"
              value={state.secret}
              disabled={state.authType === "none"}
              onChange={(e) => set("secret", e.target.value)}
              placeholder={api ? "Leave blank to keep the existing secret" : "Token or API key"}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">Stored securely and never displayed again. Simulated in this demo build.</p>
          </div>
        </div>
      </Panel>

      <Panel title="Expected result">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="f-expectedStatus" className="text-xs font-medium">Expected status</Label>
            <Input id="f-expectedStatus" type="number" className="mt-1.5 font-mono" value={String(state.expectedStatus)} onChange={(e) => set("expectedStatus", Number(e.target.value))} aria-invalid={!!errors.expectedStatus} />
            {err("expectedStatus")}
          </div>
          <div>
            <Label htmlFor="f-validationRule" className="text-xs font-medium">Validation rule</Label>
            <Input id="f-validationRule" className="mt-1.5 font-mono text-sm" value={state.validationRule ?? ""} onChange={(e) => set("validationRule", e.target.value)} placeholder="$.status exists" />
            <p className="mt-1 text-xs text-muted-foreground">Checked against the response body.</p>
          </div>
          {numField("timeoutMs", "Timeout (ms)")}
        </div>
      </Panel>

      <Panel title="Monitoring schedule & thresholds" description="Used by scheduled checks and risk prediction features.">
        <div className="grid gap-4 sm:grid-cols-3">
          {numField("intervalSec", "Check interval (s)")}
          {numField("maxLatencyMs", "Max latency (ms)")}
          {numField("errorRateThreshold", "Error rate threshold (%)")}
          {numField("expectedAvailability", "Expected availability (%)")}
          {numField("riskThreshold", "Prediction risk threshold", "0–1; alerts fire when predicted probability crosses it.")}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <Label htmlFor="f-monitoring" className="text-sm">Monitoring enabled</Label>
            <p className="text-xs text-muted-foreground">Run scheduled checks against this endpoint.</p>
          </div>
          <Switch id="f-monitoring" checked={state.monitoring} onCheckedChange={(v) => set("monitoring", v)} />
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

