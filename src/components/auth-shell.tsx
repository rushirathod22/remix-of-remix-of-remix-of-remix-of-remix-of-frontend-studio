import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { DemoTag } from "@/components/shared";

/** Centered card shell shared by the demo authentication screens. */
export function AuthShell({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">APIShield</span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-4 pb-16">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <DemoTag>Demo</DemoTag>
          </div>
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </main>
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        Demonstration mode — accounts and emails shown here are simulated. No data is sent to a server.
      </footer>
    </div>
  );
}
