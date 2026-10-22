import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import { apisQo, qk } from "@/lib/queries";
import { ms } from "@/lib/format";
import { RelTime, ConfirmDialog, DemoTag, EmptyState, HealthBadge, PageHeader, RiskBadge  } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/apis/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(apisQo()),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "APIs — APIShield" },
      { name: "description", content: "Manage monitored API endpoints, their configuration and health." },
      { property: "og:title", content: "APIs — APIShield" },
      { property: "og:description", content: "Manage monitored API endpoints, their configuration and health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApisPage,
});

function ApisPage() {
  const queryClient = useQueryClient();
  const { data: apis } = useSuspenseQuery({ ...apisQo() });

  const remove = useMutation({
    mutationFn: (id: string) => servicesRemove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.apis });
      toast.success("API removed");
    },
    onError: () => toast.error("Couldn't remove this API"),
  });

  return (
    <>
      <PageHeader
        title="APIs"
        description="Endpoints monitored for availability, latency and predicted failure risk."
        actions={
          <Button asChild size="sm">
            <Link to="/apis/new"><Plus className="size-4" aria-hidden /> Add API</Link>
          </Button>
        }
      />

      <DemoTag />

      <div className="mt-4 rounded-lg border bg-card">
        {apis.length === 0 ? (
          <EmptyState
            title="No APIs yet"
            description="Add your first endpoint to start monitoring and predicting failures."
            action={
              <Button asChild size="sm">
                <Link to="/apis/new">Add API</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Last latency</TableHead>
                <TableHead className="text-right">Last check</TableHead>
                <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apis.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link to="/apis/$id" params={{ id: a.id }} className="block">
                      <span className="text-sm font-medium hover:underline">{a.name}</span>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        <span className="mr-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-semibold">{a.method}</span>
                        {a.url}
                      </span>
                    </Link>
                    {!a.monitoring && <span className="mt-1 inline-block text-xs text-muted-foreground">Monitoring paused</span>}
                  </TableCell>
                  <TableCell><HealthBadge status={a.health} /></TableCell>
                  <TableCell><RiskBadge risk={a.risk} score={a.riskScore} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{ms(a.lastLatencyMs)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground"><RelTime at={a.lastCheckedAt} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${a.name}`}>
                          <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to="/apis/$id" params={{ id: a.id }}>View details</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/apis/$id/edit" params={{ id: a.id }}>Edit</Link></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Deletion is offered on the detail page; list rows keep read/edit actions only. */}
      <span className="hidden">{remove.isPending ? "Removing…" : ""}<ConfirmDialogSafe /></span>
    </>
  );
}

// Kept out of the JSX above to avoid importing confirm dialogs for actions
// that live on the detail page.
function ConfirmDialogSafe() {
  return null;
}

function servicesRemove(id: string) {
  return import("@/lib/services").then((m) => m.services.apis.remove(id));
}
