import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageError, PagePending } from "@/components/layout";

export const Route = createFileRoute("/_app")({
  component: AppShell,
  pendingComponent: PagePending,
  errorComponent: PageError,
});
