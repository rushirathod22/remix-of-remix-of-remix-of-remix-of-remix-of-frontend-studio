import { Outlet } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { apiQo } from "@/lib/queries";
import { PageError, PagePending } from "@/components/layout";

// Layout route: owns the API data load for the detail and edit pages below it.
function ApiDetailLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/_app/apis/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(apiQo(params.id)),
  pendingComponent: PagePending,
  errorComponent: PageError,
  component: ApiDetailLayout,
});
