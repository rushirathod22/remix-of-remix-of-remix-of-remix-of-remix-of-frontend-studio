// Deterministic demonstration data. Not produced by real monitoring or a trained model.
import type {
  ActivityEvent,
  Alert,
  ApiEndpoint,
  ExperimentRun,
  FeatureContribution,
  HealthStatus,
  HistoryEvent,
  MetricPoint,
  Prediction,
  RegisteredModel,
  RiskLevel,
  RootCauseAnalysis,
  TimeRange,
} from "./types";

export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const NOW = Math.floor(Date.now() / 60000) * 60000;
export const ago = (min: number) => new Date(NOW - min * 60000).toISOString();

export function riskFromScore(p: number | null): RiskLevel {
  if (p == null) return "unknown";
  if (p >= 0.7) return "high";
  if (p >= 0.35) return "medium";
  return "low";
}

type Seed = [string, string, string, HealthStatus, number | null, number | null, number | null, boolean];
const apiSeeds: Seed[] = [
  ["Payments Service", "https://api.acme-demo.dev/v2/payments", "POST", "degraded", 200, 842, 0.74, true],
  ["User Auth", "https://auth.acme-demo.dev/v1/token", "POST", "healthy", 200, 118, 0.12, true],
  ["Orders API", "https://api.acme-demo.dev/v2/orders", "GET", "healthy", 200, 204, 0.41, true],
  ["Inventory Sync", "https://inventory.acme-demo.dev/sync", "PUT", "failing", 503, 5012, 0.88, true],
  ["Search", "https://search.acme-demo.dev/v1/query", "GET", "healthy", 200, 96, 0.08, true],
  ["Notifications", "https://notify.acme-demo.dev/v1/send", "POST", "healthy", 202, 310, 0.22, true],
  ["Shipping Rates", "https://ship.acme-demo.dev/rates", "GET", "degraded", 200, 1290, 0.52, true],
  ["Legacy Reports", "https://legacy.acme-demo.dev/reports", "GET", "unknown", null, null, null, false],
];

export const apis: ApiEndpoint[] = apiSeeds.map(([name, url, method, health, code, lat, score, mon], i) => ({
  id: `api_${i + 1}`,
  name,
  url,
  method: method as ApiEndpoint["method"],
  queryParams: method === "GET" ? [{ key: "limit", value: "50" }] : [],
  headers: [{ key: "Accept", value: "application/json" }],
  authType: i % 3 === 0 ? "bearer" : i % 3 === 1 ? "api_key" : "none",
  hasSecret: i % 3 !== 2,
  body: method === "POST" || method === "PUT" ? '{\n  "ping": true\n}' : undefined,
  expectedStatus: method === "POST" && name === "Notifications" ? 202 : 200,
  validationRule: "$.status exists",
  timeoutMs: 5000,
  intervalSec: 60,
  maxLatencyMs: 800,
  errorRateThreshold: 2,
  expectedAvailability: 99.9,
  riskThreshold: 0.7,
  monitoring: mon,
  health,
  lastStatusCode: code,
  lastLatencyMs: lat,
  lastCheckedAt: mon ? ago(1 + i) : ago(60 * 24 * 3),
  risk: riskFromScore(score),
  riskScore: score,
  createdAt: ago(60 * 24 * (30 - i)),
}));

const rangeSpec: Record<TimeRange, { points: number; stepMin: number }> = {
  "1h": { points: 30, stepMin: 2 },
  "6h": { points: 36, stepMin: 10 },
  "24h": { points: 48, stepMin: 30 },
  "7d": { points: 42, stepMin: 240 },
};

export function generateMetrics(apiId: string | "all", range: TimeRange): MetricPoint[] {
  const { points, stepMin } = rangeSpec[range];
  const api = apis.find((a) => a.id === apiId);
  if (api && !api.monitoring) return [];
  const base = api?.lastLatencyMs ?? 380;
  const stress = api ? (api.riskScore ?? 0.2) : 0.4;
  const rnd = seeded((apiId.length * 997 + points * 31 + stepMin) | 0);
  return Array.from({ length: points }, (_, i) => {
    const drift = i / points;
    const spike = drift > 0.75 ? stress * 1.6 : 0;
    const avg = Math.max(40, base * (0.6 + rnd() * 0.3 + drift * stress * 0.6 + spike * 0.3));
    const e5 = +(Math.max(0, stress * 2 * drift + rnd() * 0.6 + spike * 2)).toFixed(2);
    const e4 = +(rnd() * 0.8).toFixed(2);
    const errorRate = +(e4 + e5).toFixed(2);
    return {
      t: ago((points - i) * stepMin),
      avgLatency: Math.round(avg),
      p95Latency: Math.round(avg * (1.6 + rnd() * 0.5)),
      requests: Math.round((api ? 900 : 7200) * (0.8 + rnd() * 0.4)),
      errorRate4xx: e4,
      errorRate5xx: e5,
      errorRate,
      timeouts: Math.round(spike * rnd() * 8),
      availability: +Math.min(100, 100 - e5 * 0.4).toFixed(2),
    };
  });
}

const featurePool = (score: number): FeatureContribution[] => [
  { feature: "p95 latency increase", value: `+${Math.round(score * 140)}%`, contribution: +(score * 0.32).toFixed(3) },
  { feature: "HTTP 5xx error rate (15m)", value: `${(score * 6).toFixed(1)}%`, contribution: +(score * 0.24).toFixed(3) },
  { feature: "Recent failure frequency", value: `${Math.round(score * 9)} / 24h`, contribution: +(score * 0.15).toFixed(3) },
  { feature: "Request volume change", value: `+${Math.round(score * 40)}%`, contribution: +(score * 0.07 - 0.02).toFixed(3) },
  { feature: "Timeout count (15m)", value: `${Math.round(score * 5)}`, contribution: +(score * 0.05).toFixed(3) },
  { feature: "Availability (1h)", value: `${(100 - score * 1.5).toFixed(2)}%`, contribution: -+(0.12 - score * 0.1).toFixed(3) },
];

export const predictions: Prediction[] = apis
  .filter((a) => a.riskScore != null)
  .flatMap((a, i) =>
    [0, 1, 2].map((k) => {
      const p = Math.max(0.02, Math.min(0.97, (a.riskScore ?? 0) - k * 0.09));
      return {
        id: `pred_${a.id}_${k}`,
        apiId: a.id,
        apiName: a.name,
        currentHealth: a.health,
        probability: +p.toFixed(2),
        risk: riskFromScore(p),
        horizonMin: k === 1 ? 5 : 15,
        predictedAt: ago(3 + i * 2 + k * 45),
        modelVersion: k === 2 ? "xgb-failure v3" : "xgb-failure v4",
        features: featurePool(p),
        simulated: true,
      };
    }),
  );

export const rcas: RootCauseAnalysis[] = apis
  .filter((a) => a.risk === "high" || a.risk === "medium")
  .map((a) => {
    const pred = predictions.find((p) => p.apiId === a.id)!;
    const s = a.riskScore ?? 0.4;
    return {
      id: `rca_${a.id}`,
      apiId: a.id,
      apiName: a.name,
      endpoint: `${a.method} ${a.url}`,
      predictionId: pred.id,
      currentHealth: a.health,
      investigatedAt: ago(4),
      httpErrors: [
        { code: 503, count: Math.round(s * 120) },
        { code: 504, count: Math.round(s * 45) },
        { code: 500, count: Math.round(s * 20) },
        { code: 429, count: Math.round(s * 12) },
      ],
      latencyChangePct: Math.round(s * 140),
      errorRateChangePct: Math.round(s * 210),
      evidence: [
        `p95 latency rose from ${Math.round((a.lastLatencyMs ?? 300) * 0.5)} ms to ${Math.round((a.lastLatencyMs ?? 300) * 1.7)} ms over 45 minutes.`,
        "Most 5xx responses are 503 Service Unavailable, clustered in the last 20 minutes.",
        "Request volume is within the normal range; the slowdown is not explained by traffic alone.",
        "Configuration last changed 2 hours ago (timeout reduced from 10s to 5s).",
      ],
      shap: pred.features,
      lime: pred.features.slice(0, 4).map((f) => ({ ...f, contribution: +(f.contribution * 0.85).toFixed(3) })),
      causes: [
        { title: "Upstream dependency saturation", evidence: "503 responses with rising latency and stable traffic.", likelihood: "likely" },
        { title: "Database connection latency", evidence: "Latency growth precedes error spikes by ~10 minutes.", likelihood: "possible" },
        { title: "Recent configuration change", evidence: "Timeout reduced 2 hours ago; timeouts increased afterwards.", likelihood: "possible" },
      ],
      recommendations: [
        {
          title: "Check upstream dependency health",
          description: "Confirm whether downstream services are returning 503s or throttling.",
          steps: ["Review dependency status pages", "Inspect upstream error logs for the affected window", "Check rate-limit headers in recent responses"],
        },
        {
          title: "Inspect database connection pool",
          description: "Pool exhaustion often appears as rising latency followed by 5xx errors.",
          steps: ["Compare active vs. max connections", "Look for slow queries started in the last hour"],
        },
        {
          title: "Review the recent timeout change",
          description: "Consider reverting the timeout to compare behaviour.",
          steps: ["Diff configuration against previous version", "Roll back in a staging environment first"],
        },
      ],
      simulated: true,
    };
  });

export const alerts: Alert[] = [
  { id: "al_1", title: "Inventory Sync unavailable", severity: "critical", apiId: "api_4", apiName: "Inventory Sync", type: "api_unavailable", description: "Last 5 checks returned 503 Service Unavailable.", trigger: "5 consecutive failed checks", createdAt: ago(6), status: "open" },
  { id: "al_2", title: "High predicted failure risk", severity: "critical", apiId: "api_1", apiName: "Payments Service", type: "high_predicted_risk", description: "Predicted failure probability exceeded the configured threshold.", trigger: "risk 74% ≥ threshold 70%", createdAt: ago(9), status: "open", predictionId: "pred_api_1_0" },
  { id: "al_3", title: "p95 latency above limit", severity: "warning", apiId: "api_7", apiName: "Shipping Rates", type: "high_latency", description: "p95 latency has exceeded the maximum acceptable latency for 15 minutes.", trigger: "p95 2,180 ms > 800 ms", createdAt: ago(22), status: "acknowledged" },
  { id: "al_4", title: "Elevated 5xx error rate", severity: "warning", apiId: "api_1", apiName: "Payments Service", type: "elevated_error_rate", description: "5xx error rate is above the acceptable threshold.", trigger: "error rate 3.4% > 2%", createdAt: ago(41), status: "open" },
  { id: "al_5", title: "Monitoring check timed out", severity: "info", apiId: "api_3", apiName: "Orders API", type: "monitoring_timeout", description: "One scheduled check exceeded the 5s timeout.", trigger: "timeout 5000 ms", createdAt: ago(130), status: "resolved" },
  { id: "al_6", title: "Inventory Sync latency spike", severity: "warning", apiId: "api_4", apiName: "Inventory Sync", type: "high_latency", description: "Average latency climbed sharply before outage.", trigger: "avg 3,900 ms > 800 ms", createdAt: ago(55), status: "resolved" },
];

export const activity: ActivityEvent[] = [
  { id: "ev1", kind: "alert", message: "Critical alert raised for Inventory Sync", at: ago(6) },
  { id: "ev2", kind: "prediction", message: "Prediction generated for Payments Service (74%)", at: ago(9) },
  { id: "ev3", kind: "test", message: "Manual test of User Auth passed (118 ms)", at: ago(17) },
  { id: "ev4", kind: "config", message: "Timeout changed on Inventory Sync (10s → 5s)", at: ago(120) },
  { id: "ev5", kind: "test", message: "Manual test of Shipping Rates passed (1,290 ms)", at: ago(160) },
];

export const experiments: ExperimentRun[] = [
  { id: "exp_1", runId: "a91f3c2e", name: "baseline-logreg", modelType: "Logistic Regression", datasetVersion: "telemetry-v1.2", params: { C: 1.0, penalty: "l2", class_weight: "balanced" }, startedAt: ago(60 * 24 * 12), status: "completed", metrics: { precision: 0.61, recall: 0.58, f1: 0.59, prAuc: 0.63, leadTimeMin: 4, confusion: [[9120, 210], [168, 232]] }, artifacts: ["model.pkl", "metrics.json", "pr_curve.png"] },
  { id: "exp_2", runId: "c44b81d0", name: "rf-depth12", modelType: "Random Forest", datasetVersion: "telemetry-v1.2", params: { n_estimators: 300, max_depth: 12, min_samples_leaf: 4 }, startedAt: ago(60 * 24 * 10), status: "completed", metrics: { precision: 0.72, recall: 0.66, f1: 0.69, prAuc: 0.74, leadTimeMin: 7, confusion: [[9210, 120], [136, 264]] }, artifacts: ["model.pkl", "metrics.json", "feature_importance.png"] },
  { id: "exp_3", runId: "e7d20a19", name: "xgb-v3", modelType: "XGBoost", datasetVersion: "telemetry-v1.3", params: { max_depth: 6, eta: 0.1, n_estimators: 400 }, startedAt: ago(60 * 24 * 6), status: "completed", metrics: { precision: 0.78, recall: 0.71, f1: 0.74, prAuc: 0.8, leadTimeMin: 9, confusion: [[9250, 80], [116, 284]] }, artifacts: ["model.json", "metrics.json", "shap_summary.png"] },
  { id: "exp_4", runId: "f0a63b77", name: "xgb-v4-tuned", modelType: "XGBoost", datasetVersion: "telemetry-v1.4", params: { max_depth: 7, eta: 0.05, n_estimators: 800, scale_pos_weight: 12 }, startedAt: ago(60 * 24 * 2), status: "completed", metrics: { precision: 0.81, recall: 0.76, f1: 0.78, prAuc: 0.84, leadTimeMin: 11, confusion: [[9262, 68], [96, 304]] }, artifacts: ["model.json", "metrics.json", "shap_summary.png"] },
  { id: "exp_5", runId: "b12c9e04", name: "xgb-v5-features", modelType: "XGBoost", datasetVersion: "telemetry-v1.5", params: { max_depth: 7, eta: 0.05, n_estimators: 900 }, startedAt: ago(35), status: "running", metrics: null, artifacts: [] },
  { id: "exp_6", runId: "d88e1f55", name: "rf-oversample", modelType: "Random Forest", datasetVersion: "telemetry-v1.4", params: { n_estimators: 500, smote: "true" }, startedAt: ago(60 * 24), status: "failed", metrics: null, artifacts: ["error.log"] },
];

export const models: RegisteredModel[] = [
  { id: "m1", name: "xgb-failure", version: "v4", modelType: "XGBoost", datasetVersion: "telemetry-v1.4", f1: 0.78, prAuc: 0.84, registeredAt: ago(60 * 24 * 2), status: "production", endpoint: "sagemaker:apishield-xgb-prod", runId: "f0a63b77" },
  { id: "m2", name: "xgb-failure", version: "v3", modelType: "XGBoost", datasetVersion: "telemetry-v1.3", f1: 0.74, prAuc: 0.8, registeredAt: ago(60 * 24 * 6), status: "staging", endpoint: "sagemaker:apishield-xgb-staging", runId: "e7d20a19" },
  { id: "m3", name: "rf-failure", version: "v1", modelType: "Random Forest", datasetVersion: "telemetry-v1.2", f1: 0.69, prAuc: 0.74, registeredAt: ago(60 * 24 * 10), status: "registered", runId: "c44b81d0" },
  { id: "m4", name: "logreg-failure", version: "v1", modelType: "Logistic Regression", datasetVersion: "telemetry-v1.2", f1: 0.59, prAuc: 0.63, registeredAt: ago(60 * 24 * 12), status: "not_deployed", runId: "a91f3c2e" },
];

export function buildHistory(): HistoryEvent[] {
  const rnd = seeded(42);
  const out: HistoryEvent[] = [];
  apis.filter((a) => a.monitoring).forEach((a, i) => {
    for (let k = 0; k < 4; k++) {
      const fail = a.health === "failing" ? k < 3 : rnd() < 0.12;
      out.push({ id: `h_t_${i}_${k}`, category: "test", apiName: a.name, description: fail ? "Test failed: unexpected status" : "Test passed", status: fail ? "failed" : "passed", statusCode: fail ? 503 : a.expectedStatus, latencyMs: Math.round((a.lastLatencyMs ?? 200) * (0.7 + rnd() * 0.6)), at: ago(20 + i * 7 + k * 180) });
      if (fail) out.push({ id: `h_f_${i}_${k}`, category: "failure", apiName: a.name, description: "Endpoint returned 503 Service Unavailable", status: "failure", statusCode: 503, at: ago(21 + i * 7 + k * 180) });
    }
  });
  predictions.forEach((p) => out.push({ id: `h_${p.id}`, category: "prediction", apiName: p.apiName, description: `Demo prediction (${p.horizonMin}m horizon, ${p.modelVersion})`, status: p.risk, riskScore: p.probability, at: p.predictedAt }));
  alerts.forEach((a) => out.push({ id: `h_${a.id}`, category: "alert", apiName: a.apiName, description: a.title, status: a.status, at: a.createdAt }));
  experiments.filter((e) => e.metrics).forEach((e) => out.push({ id: `h_${e.id}`, category: "model", apiName: "—", description: `${e.name} evaluated: F1 ${e.metrics!.f1}`, status: e.status, at: e.startedAt }));
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
