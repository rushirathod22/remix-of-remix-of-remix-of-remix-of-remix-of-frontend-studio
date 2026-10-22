import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { settingsQo, qk } from "@/lib/queries";
import { services } from "@/lib/services";
import type { Settings, TimeRange } from "@/lib/types";
import { DemoTag, PageHeader, Panel } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Settings — APIShield" },
      { name: "description", content: "Profile, monitoring defaults, notifications and model thresholds." },
      { property: "og:title", content: "Settings — APIShield" },
      { property: "og:description", content: "Profile, monitoring defaults, notifications and model thresholds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const timezones = ["UTC", "Europe/London", "America/New_York", "Asia/Kolkata"];

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: saved } = useSuspenseQuery({ ...settingsQo() });
  const [draft, setDraft] = useState<Settings>(saved);

  // Reset the form if the cached settings change (e.g. after save).
  useEffect(() => setDraft(saved), [saved]);

  const save = useMutation({
    mutationFn: (s: Settings) => services.settings.save(s),
    onSuccess: (s) => {
      queryClient.setQueryData(qk.settings, s);
      toast.success("Settings saved");
    },
    onError: () => toast.error("Couldn't save settings"),
  });

  const set = <K extends keyof Settings>(key: K, patch: Partial<Settings[K]>) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Defaults applied to new APIs, notification preferences and model thresholds. Simulated demo — changes are stored in memory only."
        actions={<DemoTag>Stored in memory</DemoTag>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Profile" description="Shown in the sidebar and on exported reports.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={draft.profile.name} onChange={(e) => set("profile", { name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={draft.profile.email} onChange={(e) => set("profile", { email: e.target.value })} />
            </div>
          </div>
        </Panel>

        <Panel title="Monitoring defaults" description="Pre-filled when you add a new API.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="interval">Check interval</Label>
              <Select value={String(draft.monitoring.defaultInterval)} onValueChange={(v) => set("monitoring", { defaultInterval: Number(v) })}>
                <SelectTrigger id="interval"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[30, 60, 300, 900].map((s) => <SelectItem key={s} value={String(s)}>{s < 60 ? `${s}s` : `${s / 60} min`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="range">Default time range</Label>
              <Select value={draft.monitoring.defaultRange} onValueChange={(v) => set("monitoring", { defaultRange: v as TimeRange })}>
                <SelectTrigger id="range"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="6h">6 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Toggle
                checked={draft.monitoring.compactTables}
                onChange={(v) => set("monitoring", { compactTables: v })}
                label="Compact tables"
                hint="Reduce row height in health and history tables."
              />
            </div>
          </div>
        </Panel>

        <Panel title="Notifications" description="Which events trigger a notification.">
          <div className="space-y-4">
            <Toggle checked={draft.notifications.email} onChange={(v) => set("notifications", { email: v })} label="Email notifications" hint="Send a summary email for new alerts." />
            <Toggle checked={draft.notifications.highRisk} onChange={(v) => set("notifications", { highRisk: v })} label="High predicted risk" hint="Notify when risk crosses the threshold." />
            <Toggle checked={draft.notifications.failures} onChange={(v) => set("notifications", { failures: v })} label="Test failures" hint="Notify when a scheduled test fails." />
            <Toggle checked={draft.notifications.latency} onChange={(v) => set("notifications", { latency: v })} label="Latency breaches" hint="Notify when latency exceeds the limit." />
          </div>
        </Panel>

        <Panel title="Prediction model" description="Applies when generating new predictions.">
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="horizon">Prediction horizon</Label>
              <Select value={String(draft.ml.horizonMin)} onValueChange={(v) => set("ml", { horizonMin: Number(v) })}>
                <SelectTrigger id="horizon" className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 15, 30].map((m) => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="threshold">High-risk threshold</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider
                  id="threshold"
                  className="w-44"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={[draft.ml.riskThreshold]}
                  onValueChange={(vals) => set("ml", { riskThreshold: vals[0] ?? draft.ml.riskThreshold })}
                />
                <span className="w-12 text-right font-mono text-sm tabular-nums">{draft.ml.riskThreshold.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Probabilities at or above this level count as high risk.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="model">Model version</Label>
              <Input id="model" value={draft.ml.modelVersion} readOnly className="font-mono text-xs" aria-describedby="model-hint" />
              <p id="model-hint" className="text-xs text-muted-foreground">Selected in MLOps → Models; read-only here.</p>
            </div>
          </div>
        </Panel>

        <Panel title="App" description="Display preferences.">
          <div className="grid gap-1.5">
            <Label htmlFor="tz">Timezone</Label>
            <Select value={draft.app.timezone} onValueChange={(v) => set("app", { timezone: v })}>
              <SelectTrigger id="tz" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Timestamps in the demo are always shown in UTC.</p>
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setDraft(saved)} disabled={!dirty || save.isPending}>
          Discard changes
        </Button>
        <Button onClick={() => save.mutate(draft)} disabled={!dirty || save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </>
  );
}
