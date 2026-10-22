import { queryOptions } from "@tanstack/react-query";
import { services } from "./services";
import type { TimeRange } from "./types";

// Central query keys — mutations invalidate through these.
export const qk = {
  apis: ["apis"] as const,
  api: (id: string) => ["apis", id] as const,
  apiHistory: (id: string) => ["apis", id, "history"] as const,
  metrics: (apiId: string, range: TimeRange) => ["metrics", apiId, range] as const,
  predictions: ["predictions"] as const,
  rcas: ["rcas"] as const,
  alerts: ["alerts"] as const,
  activity: ["activity"] as const,
  experiments: ["experiments"] as const,
  models: ["models"] as const,
  history: ["history"] as const,
  settings: ["settings"] as const,
};

export const apisQo = () => queryOptions({ queryKey: qk.apis, queryFn: () => services.apis.list() });
export const apiQo = (id: string) => queryOptions({ queryKey: qk.api(id), queryFn: () => services.apis.get(id) });
export const apiHistoryQo = (id: string) => queryOptions({ queryKey: qk.apiHistory(id), queryFn: () => services.apis.history(id) });
export const metricsQo = (apiId: string, range: TimeRange) =>
  queryOptions({ queryKey: qk.metrics(apiId, range), queryFn: () => services.monitoring.metrics(apiId, range) });
export const predictionsQo = () => queryOptions({ queryKey: qk.predictions, queryFn: () => services.predictions.list() });
export const predictionQo = (id: string) => queryOptions({ queryKey: [...qk.predictions, id], queryFn: () => services.predictions.get(id) });
export const rcasQo = () => queryOptions({ queryKey: qk.rcas, queryFn: () => services.rca.list() });
export const rcaQo = (id: string) => queryOptions({ queryKey: [...qk.rcas, id], queryFn: () => services.rca.get(id) });
export const alertsQo = () => queryOptions({ queryKey: qk.alerts, queryFn: () => services.alerts.list() });
export const activityQo = () => queryOptions({ queryKey: qk.activity, queryFn: () => services.activity.list() });
export const experimentsQo = () => queryOptions({ queryKey: qk.experiments, queryFn: () => services.experiments.list() });
export const modelsQo = () => queryOptions({ queryKey: qk.models, queryFn: () => services.models.list() });
export const historyQo = () => queryOptions({ queryKey: qk.history, queryFn: () => services.reports.history() });
export const settingsQo = () => queryOptions({ queryKey: qk.settings, queryFn: () => services.settings.get() });
