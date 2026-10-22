// Shared domain types. Mirror the future FastAPI response contracts.

export type HealthStatus = "healthy" | "degraded" | "failing" | "unknown";
export type RiskLevel = "low" | "medium" | "high" | "unknown";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthType = "none" | "bearer" | "api_key" | "basic";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type AlertType =
  | "api_unavailable"
  | "high_latency"
  | "elevated_error_rate"
  | "high_predicted_risk"
  | "monitoring_timeout";
export type RunStatus = "completed" | "running" | "failed";
export type DeploymentStatus = "registered" | "staging" | "production" | "failed" | "not_deployed";
export type TimeRange = "1h" | "6h" | "24h" | "7d";

export interface KeyValue {
  key: string;
  value: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "developer";
}

export interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  queryParams: KeyValue[];
  headers: KeyValue[];
  authType: AuthType;
  /** Secrets are never returned; only whether one is configured. */
  hasSecret: boolean;
  body?: string | undefined;
  expectedStatus: number;
  validationRule?: string | undefined;
  timeoutMs: number;
  intervalSec: number;
  maxLatencyMs: number;
  errorRateThreshold: number;
  expectedAvailability: number;
  riskThreshold: number;
  monitoring: boolean;
  health: HealthStatus;
  lastStatusCode: number | null;
  lastLatencyMs: number | null;
  lastCheckedAt: string | null;
  risk: RiskLevel;
  riskScore: number | null;
  createdAt: string;
}

export type ApiEndpointInput = Omit<
  ApiEndpoint,
  | "id"
  | "health"
  | "lastStatusCode"
  | "lastLatencyMs"
  | "lastCheckedAt"
  | "risk"
  | "riskScore"
  | "createdAt"
  | "hasSecret"
> & { secret?: string | undefined };

export interface TestRequest {
  url: string;
  method: HttpMethod;
  queryParams: KeyValue[];
  headers: KeyValue[];
  authType: AuthType;
  body?: string | undefined;
  expectedStatus: number;
  validationRule?: string | undefined;
  timeoutMs: number;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface TestResult {
  id: string;
  apiId?: string | undefined;
  passed: boolean;
  outcome: "success" | "failure" | "timeout" | "error";
  statusCode: number | null;
  expectedStatus: number;
  latencyMs: number | null;
  headers: KeyValue[];
  body: string;
  validations: ValidationResult[];
  error?: string;
  testedAt: string;
  simulated: boolean;
}

export interface FeatureContribution {
  feature: string;
  value: string;
  contribution: number;
}

export interface Prediction {
  id: string;
  apiId: string;
  apiName: string;
  currentHealth: HealthStatus;
  probability: number;
  risk: RiskLevel;
  horizonMin: number;
  predictedAt: string;
  modelVersion: string;
  features: FeatureContribution[];
  simulated: boolean;
}

export interface PossibleCause {
  title: string;
  evidence: string;
  likelihood: "possible" | "likely";
}

export interface Recommendation {
  title: string;
  description: string;
  steps: string[];
}

export interface RootCauseAnalysis {
  id: string;
  apiId: string;
  apiName: string;
  endpoint: string;
  predictionId?: string;
  currentHealth: HealthStatus;
  investigatedAt: string;
  httpErrors: { code: number; count: number }[];
  latencyChangePct: number;
  errorRateChangePct: number;
  evidence: string[];
  shap: FeatureContribution[];
  lime?: FeatureContribution[];
  causes: PossibleCause[];
  recommendations: Recommendation[];
  simulated: boolean;
}

export interface MetricPoint {
  t: string;
  avgLatency: number;
  p95Latency: number;
  requests: number;
  errorRate4xx: number;
  errorRate5xx: number;
  errorRate: number;
  timeouts: number;
  availability: number;
}

export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  apiId: string;
  apiName: string;
  type: AlertType;
  description: string;
  trigger: string;
  createdAt: string;
  status: AlertStatus;
  predictionId?: string;
}

export interface ActivityEvent {
  id: string;
  kind: "test" | "config" | "prediction" | "alert";
  message: string;
  at: string;
}

export interface ExperimentRun {
  id: string;
  runId: string;
  name: string;
  modelType: "Logistic Regression" | "Random Forest" | "XGBoost";
  datasetVersion: string;
  params: Record<string, string | number>;
  startedAt: string;
  status: RunStatus;
  metrics: {
    precision: number;
    recall: number;
    f1: number;
    prAuc: number;
    leadTimeMin?: number;
    confusion: [[number, number], [number, number]];
  } | null;
  artifacts: string[];
}

export interface RegisteredModel {
  id: string;
  name: string;
  version: string;
  modelType: string;
  datasetVersion: string;
  f1: number | null;
  prAuc: number | null;
  registeredAt: string;
  status: DeploymentStatus;
  endpoint?: string;
  runId: string;
}

export interface HistoryEvent {
  id: string;
  category: "test" | "failure" | "prediction" | "alert" | "model";
  apiName: string;
  description: string;
  status: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  riskScore?: number | null;
  at: string;
}

export interface Settings {
  profile: { name: string; email: string };
  monitoring: { defaultInterval: number; defaultRange: TimeRange; compactTables: boolean };
  notifications: { email: boolean; highRisk: boolean; failures: boolean; latency: boolean };
  app: { timezone: string };
  ml: { horizonMin: number; riskThreshold: number; modelVersion: string };
}
