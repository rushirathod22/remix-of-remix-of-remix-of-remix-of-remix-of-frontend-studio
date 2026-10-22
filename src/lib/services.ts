// Centralized service layer. Pages only talk to `services`; swap mock for HTTP here.
import { config } from "./config";
import * as db from "./mock-data";
import type {
  ActivityEvent,
  Alert,
  AlertStatus,
  ApiEndpoint,
  ApiEndpointInput,
  ExperimentRun,
  HistoryEvent,
  MetricPoint,
  Prediction,
  RegisteredModel,
  RootCauseAnalysis,
  Settings,
  TestRequest,
  TestResult,
  TimeRange,
  User,
} from "./types";

export class ServiceError extends Error {}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new ServiceError(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

let settingsState: Settings = {
  profile: { name: "Demo User", email: "demo@apishield.dev" },
  monitoring: { defaultInterval: 60, defaultRange: "24h", compactTables: false },
  notifications: { email: true, highRisk: true, failures: true, latency: false },
  app: { timezone: "UTC" },
  ml: { horizonMin: 15, riskThreshold: 0.7, modelVersion: "xgb-failure v4" },
};

function simulateTest(req: TestRequest, apiId?: string): TestResult {
  // Deterministic from the URL so the same request yields the same demo result.
  const hash = [...req.url].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rnd = db.seeded(Math.abs(hash) + 1);
  const api = db.apis.find((a) => a.id === apiId || a.url === req.url);
  const testedAt = new Date().toISOString();
  const id = `test_${Date.now()}`;
  if (req.url.includes("timeout") || api?.health === "failing" && rnd() < 0.4) {
    return { id, apiId, passed: false, outcome: "timeout", statusCode: null, expectedStatus: req.expectedStatus, latencyMs: req.timeoutMs, headers: [], body: "", validations: [], error: `No response within ${req.timeoutMs} ms (simulated).`, testedAt, simulated: true };
  }
  const status = api?.health === "failing" ? 503 : req.expectedStatus;
  const latency = Math.round((api?.lastLatencyMs ?? 120 + rnd() * 400) * (0.85 + rnd() * 0.3));
  const ok = status === req.expectedStatus;
  const body = ok
    ? JSON.stringify({ status: "ok", data: { id: "demo_123", items: 3 }, requestId: `req_${Math.abs(hash).toString(16)}` }, null, 2)
    : JSON.stringify({ error: "Service Unavailable", retryAfter: 30 }, null, 2);
  const validations = [
    { rule: `Status equals ${req.expectedStatus}`, passed: ok, detail: `Received ${status}` },
    ...(req.validationRule ? [{ rule: req.validationRule, passed: ok, detail: ok ? "Field present in response" : "Field missing" }] : []),
    { rule: `Responds within ${req.timeoutMs} ms`, passed: latency < req.timeoutMs, detail: `${latency} ms` },
  ];
  return {
    id, apiId, passed: validations.every((v) => v.passed), outcome: ok ? "success" : "failure",
    statusCode: status, expectedStatus: req.expectedStatus, latencyMs: latency,
    headers: [{ key: "content-type", value: "application/json" }, { key: "x-request-id", value: `req_${Math.abs(hash).toString(16)}` }, { key: "cache-control", value: "no-store" }],
    body, validations, testedAt, simulated: true,
  };
}

const testHistory: TestResult[] = [];

const mock = {
  auth: {
    async login(email: string, _password: string): Promise<User> {
      await delay(400);
      return { id: "u_demo", name: email.split("@")[0] ?? "user", email, role: "admin" };
    },
    async signup(name: string, email: string, _password: string): Promise<User> {
      await delay(400);
      return { id: "u_demo", name, email, role: "admin" };
    },
    async requestReset(_email: string) { await delay(400); },
    async resetPassword(_password: string) { await delay(400); },
  },
  apis: {
    async list(): Promise<ApiEndpoint[]> { await delay(); return [...db.apis]; },
    async get(id: string): Promise<ApiEndpoint> {
      await delay();
      const a = db.apis.find((x) => x.id === id);
      if (!a) throw new ServiceError("API not found");
      return a;
    },
    async create(input: ApiEndpointInput): Promise<ApiEndpoint> {
      await delay(400);
      const { secret, ...rest } = input;
      const api: ApiEndpoint = { ...rest, id: `api_${Date.now()}`, hasSecret: !!secret, health: "unknown", lastStatusCode: null, lastLatencyMs: null, lastCheckedAt: null, risk: "unknown", riskScore: null, createdAt: new Date().toISOString() };
      db.apis.unshift(api);
      db.activity.unshift({ id: `ev_${Date.now()}`, kind: "config", message: `API "${api.name}" added`, at: api.createdAt });
      return api;
    },
    async update(id: string, input: ApiEndpointInput): Promise<ApiEndpoint> {
      await delay(400);
      const i = db.apis.findIndex((x) => x.id === id);
      if (i < 0) throw new ServiceError("API not found");
      const { secret, ...rest } = input;
      const current = db.apis[i];
      if (!current) throw new ServiceError("API not found");
      const updated: ApiEndpoint = { ...current, ...rest, hasSecret: secret ? true : current.hasSecret };
      db.apis[i] = updated;
      db.activity.unshift({ id: `ev_${Date.now()}`, kind: "config", message: `Configuration updated for ${updated.name}`, at: new Date().toISOString() });
      return updated;
    },
    async remove(id: string) {
      await delay(300);
      const i = db.apis.findIndex((x) => x.id === id);
      if (i >= 0) db.apis.splice(i, 1);
    },
    async history(id: string): Promise<TestResult[]> { await delay(); return testHistory.filter((t) => t.apiId === id); },
  },
  testing: {
    async run(req: TestRequest, apiId?: string): Promise<TestResult> {
      await delay(700 + Math.min(req.timeoutMs, 800));
      const r = simulateTest(req, apiId);
      testHistory.unshift(r);
      return r;
    },
  },
  predictions: {
    async list(): Promise<Prediction[]> { await delay(); return [...db.predictions]; },
    async get(id: string): Promise<Prediction> {
      await delay();
      const p = db.predictions.find((x) => x.id === id);
      if (!p) throw new ServiceError("Prediction not found");
      return p;
    },
  },
  rca: {
    async list(): Promise<RootCauseAnalysis[]> { await delay(); return [...db.rcas]; },
    async get(id: string): Promise<RootCauseAnalysis> {
      await delay();
      const r = db.rcas.find((x) => x.id === id);
      if (!r) throw new ServiceError("Analysis not found");
      return r;
    },
  },
  monitoring: {
    async metrics(apiId: string | "all", range: TimeRange): Promise<MetricPoint[]> { await delay(); return db.generateMetrics(apiId, range); },
  },
  alerts: {
    async list(): Promise<Alert[]> { await delay(); return [...db.alerts]; },
    async setStatus(id: string, status: AlertStatus): Promise<Alert> {
      await delay(300);
      const a = db.alerts.find((x) => x.id === id);
      if (!a) throw new ServiceError("Alert not found");
      a.status = status;
      return a;
    },
  },
  activity: { async list(): Promise<ActivityEvent[]> { await delay(); return db.activity.slice(0, 6); } },
  experiments: { async list(): Promise<ExperimentRun[]> { await delay(); return [...db.experiments]; } },
  models: { async list(): Promise<RegisteredModel[]> { await delay(); return [...db.models]; } },
  reports: { async history(): Promise<HistoryEvent[]> { await delay(); return db.buildHistory(); } },
  settings: {
    async get(): Promise<Settings> { await delay(); return structuredClone(settingsState); },
    async save(s: Settings): Promise<Settings> { await delay(400); settingsState = structuredClone(s); return s; },
  },
};

// HTTP implementation for the proposed FastAPI contract. Unimplemented areas fall back to mock.
const remote: typeof mock = {
  ...mock,
  apis: {
    ...mock.apis,
    list: () => http("/api/v1/apis"),
    get: (id) => http(`/api/v1/apis/${id}`),
    create: (input) => http("/api/v1/apis", { method: "POST", body: JSON.stringify(input) }),
    remove: async (id) => { await http(`/api/v1/apis/${id}`, { method: "DELETE" }); },
    history: (id) => http(`/api/v1/apis/${id}/history`),
  },
  testing: { run: (req, apiId) => http(`/api/v1/apis/${apiId ?? "adhoc"}/test`, { method: "POST", body: JSON.stringify(req) }) },
  predictions: { ...mock.predictions, list: () => http("/api/v1/predictions") },
  alerts: { ...mock.alerts, list: () => http("/api/v1/alerts") },
};

export const services = config.useMock ? mock : remote;
export const isDemo = config.useMock;
