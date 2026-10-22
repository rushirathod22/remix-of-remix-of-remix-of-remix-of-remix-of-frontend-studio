import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { apisQo, alertsQo, qk } from "@/lib/queries";
import { services } from "@/lib/services";
import type { Alert } from "@/lib/types";
import { RelTime, DemoTag, EmptyState, PageHeader, Panel, Pill, SeverityBadge  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/alerts")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(alertsQo()),
      context.queryClient.ensureQueryData(apisQo()),
    ]),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Alerts — APIShield" },
      { name: "description", content: "Current and historical alerts across monitored APIs, with acknowledgment and resolution." },
      { property: "og:title", content: "Alerts — APIShield" },
      { property: "og:description", content: "Current and historical alerts across monitored APIs, with acknowledgment and resolution." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const queryClient = useQueryClient();
  const { data: alerts } = useSuspenseQuery({ ...alertsQo() });
  const { data: apis } = useSuspenseQuery({ ...apisQo() });

  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [apiFilter, setApiFilter] = useState("all");

  const filtered = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (sevFilter === "all" || a.severity === sevFilter) &&
          (statusFilter === "all" || a.status === statusFilter) &&
          (apiFilter === "all" || a.apiId === apiFilter),
      ),
    [alerts, sevFilter, statusFilter, apiFilter],
  );

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "acknowledged" | "resolved" }) => services.alerts.setStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: qk.alerts });
      toast.success(`Alert "${updated.title}" ${updated.status}`);
    },
    onError: () => toast.error("Couldn't update this alert"),
  });

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Incidents and risk warnings raised by monitoring checks and predictions."
        actions={<DemoTag>Simulated alerts</DemoTag>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={apiFilter} onValueChange={setApiFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by API"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All APIs</SelectItem>
            {apis.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sevFilter} onValueChange={setSevFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by severity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState title="No alerts match these filters" description="Everything may be healthy, or try broadening the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Raised</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <AlertDetails alert={a} />
                    <span className="mt-0.5 block text-xs text-muted-foreground">{a.apiName} · {a.type.replaceAll("_", " ")}</span>
                  </TableCell>
                  <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                  <TableCell><Pill t={a.status === "open" ? "danger" : a.status === "acknowledged" ? "warning" : "success"}>{a.status}</Pill></TableCell>
                  <TableCell className="text-sm text-muted-foreground"><RelTime at={a.createdAt} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {a.status === "open" && (
                        <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: a.id, status: "acknowledged" })}>
                          Acknowledge
                        </Button>
                      )}
                      {a.status !== "resolved" && (
                        <Button variant="outline" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: a.id, status: "resolved" })}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}

function AlertDetails({ alert }: { alert: Alert }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-left text-sm font-medium hover:underline" aria-label={`View details of ${alert.title}`}>{alert.title}</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {alert.title} <SeverityBadge severity={alert.severity} />
          </DialogTitle>
          <DialogDescription>{alert.apiName} · raised <RelTime at={alert.createdAt} /> · status: {alert.status}</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Description</dt>
            <dd className="mt-0.5">{alert.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Trigger</dt>
            <dd className="mt-0.5 font-mono text-xs">{alert.trigger}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Alert type</dt>
            <dd className="mt-0.5">{alert.type.replaceAll("_", " ")}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/apis/$id" params={{ id: alert.apiId }}>View API</Link>
          </Button>
          {alert.predictionId && (
            <Button asChild variant="outline" size="sm">
              <Link to="/predictions/$id" params={{ id: alert.predictionId }}>View prediction</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
