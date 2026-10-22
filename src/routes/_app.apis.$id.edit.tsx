import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { apiQo, qk } from "@/lib/queries";
import { services } from "@/lib/services";
import type { ApiEndpointInput } from "@/lib/types";
import { ApiForm } from "@/components/api-form";
import { DemoTag } from "@/components/shared";
import { PageError, PagePending } from "@/components/layout";

export const Route = createFileRoute("/_app/apis/$id/edit")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(apiQo(params.id)),
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Edit API — APIShield" },
      { name: "description", content: "Update the configuration, expected result and monitoring thresholds for an endpoint." },
      { property: "og:title", content: "Edit API — APIShield" },
      { property: "og:description", content: "Update the configuration, expected result and monitoring thresholds for an endpoint." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditApiPage,
});

function EditApiPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: api } = useSuspenseQuery({ ...apiQo(id) });

  const update = useMutation({
    mutationFn: (input: ApiEndpointInput) => services.apis.update(api.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.api(api.id) });
      queryClient.invalidateQueries({ queryKey: qk.apis });
      toast.success(`API "${api.name}" updated`);
    },
    onError: () => toast.error("Couldn't save this API"),
  });

  return (
    <>
      <Link to="/apis/$id" params={{ id: api.id }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to {api.name}
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Edit {api.name}</h1>
        <DemoTag>Changes are simulated</DemoTag>
      </div>
      <ApiForm
        api={api}
        saving={update.isPending}
        submitLabel="Save changes"
        onSubmit={(input) => update.mutateAsync(input)}
      />
    </>
  );
}
