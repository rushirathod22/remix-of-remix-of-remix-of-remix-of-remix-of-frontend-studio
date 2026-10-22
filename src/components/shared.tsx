import type { ReactNode } from "react";
import { AlertCircle, CircleCheck, CircleDashed, CircleX, FlaskConical, Inbox, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AlertSeverity, HealthStatus, RiskLevel } from "@/lib/types";
import { pct, relTime } from "@/lib/format";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tone = {
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
  neutral: "bg-neutral-soft text-muted-foreground border-border",
  info: "bg-info-soft text-primary border-primary/20",
} as const;
export type Tone = keyof typeof tone;

export function Pill({ t, icon, children, className }: { t: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium", tone[t], className)}>
      {icon}
      {children}
    </span>
  );
}

const healthMap: Record<HealthStatus, { t: Tone; label: string; Icon: typeof CircleCheck }> = {
  healthy: { t: "success", label: "Healthy", Icon: CircleCheck },
  degraded: { t: "warning", label: "Degraded", Icon: TriangleAlert },
  failing: { t: "danger", label: "Failing", Icon: CircleX },
  unknown: { t: "neutral", label: "Unknown", Icon: CircleDashed },
};
export function HealthBadge({ status }: { status: HealthStatus }) {
  const { t, label, Icon } = healthMap[status];
  return <Pill t={t} icon={<Icon className="size-3" aria-hidden />}>{label}</Pill>;
}

const riskMap: Record<RiskLevel, { t: Tone; label: string }> = {
  low: { t: "success", label: "Low" },
  medium: { t: "warning", label: "Medium" },
  high: { t: "danger", label: "High" },
  unknown: { t: "neutral", label: "N/A" },
};
export function RiskBadge({ risk, score }: { risk: RiskLevel; score?: number | null }) {
  const { t, label } = riskMap[risk];
  return (
    <Pill t={t}>
      <span className={cn("size-1.5 rounded-full", t === "neutral" ? "bg-muted-foreground" : t === "success" ? "bg-success" : t === "warning" ? "bg-warning" : "bg-danger")} aria-hidden />
      {label}
      {score != null && <span className="font-mono opacity-80">{pct(score)}</span>}
    </Pill>
  );
}

const sevMap: Record<AlertSeverity, Tone> = { critical: "danger", warning: "warning", info: "info" };
export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return <Pill t={sevMap[severity]} icon={<AlertCircle className="size-3" aria-hidden />}><span className="capitalize">{severity}</span></Pill>;
}

export function DemoTag({ children = "Demo data" }: { children?: ReactNode }) {
  return <Pill t="info" icon={<FlaskConical className="size-3" aria-hidden />}>{children}</Pill>;
}

export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function MetricCard({ label, value, hint, icon, t }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; t?: Tone }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {icon && <span className={cn(t === "success" && "text-success", t === "warning" && "text-warning", t === "danger" && "text-danger", t === "info" && "text-primary")}>{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 text-muted-foreground">{icon ?? <Inbox className="size-6" />}</div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<CircleX className="size-6 text-danger" />}
      title="Couldn't load this data"
      description={message ?? "Something went wrong."}
      action={onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
    />
  );
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
    </div>
  );
}

export function ConfirmDialog({ trigger, title, description, confirmLabel = "Confirm", onConfirm, destructive }: { trigger: ReactNode; title: string; description: string; confirmLabel?: string; onConfirm: () => void; destructive?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Relative time that tolerates server/client clock drift during hydration. */
export function RelTime({ at }: { at: string | null | undefined }) {
  return <span suppressHydrationWarning>{relTime(at)}</span>;
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
