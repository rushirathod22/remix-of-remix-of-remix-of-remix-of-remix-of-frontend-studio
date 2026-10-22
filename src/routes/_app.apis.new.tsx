import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { apisQo, qk } from "@/lib/queries";
import { services } from "@/lib/services";
import type { ApiEndpointInput } from "@/lib/types";
import { ApiForm } from "@/components/api-form";
import { PageError, PagePending } from "@/components/layout";

export const Route = createFileRoute("/_app/apis/new")({
  pendingComponent: PagePending,
  errorComponent: PageError,
  head: () => ({
    meta: [
      { title: "Add API — APIShield" },
      { name: "description", content: "Configure a new endpoint for testing, monitoring and failure prediction." },
      { property: "og:title", content: "Add API — APIShield" },
      { property: "og:description", content: "Configure a new endpoint for testing, monitoring and failure prediction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewApiPage,
});

function NewApiPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: ApiEndpointInput) => services.apis.create(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: qk.apis });
      toast.success(`API "${created.name}" added`);
      navigate({ to: "/apis/$id", params: { id: created.id } });
    },
    onError: () => toast.error("Couldn't add this API"),
  });

  return (
    <>
      <Link to="/apis" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All APIs
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Add API</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configure the request, expected result and monitoring thresholds. Secrets are stored server-side and never displayed again.
        </p>
      </div>
      <ApiForm
        saving={create.isPending}
        submitLabel="Add API"
        onSubmit={(input) => create.mutateAsync(input)}
      />
    </>
  );
}
