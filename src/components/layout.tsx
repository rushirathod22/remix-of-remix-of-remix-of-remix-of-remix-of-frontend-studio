import type { ReactNode } from "react";
import { Link, Outlet, useRouterState, type ErrorComponentProps } from "@tanstack/react-router";
import {
  Activity,
  BellRing,
  Boxes,
  BrainCircuit,
  ChevronDown,
  CircleUserRound,
  FileText,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  LogIn,
  Menu,
  Network,
  ScanSearch,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "./shared";

const DEMO_USER = { name: "Demo User", email: "demo@apishield.dev" };

/** User avatar + menu shown in the sidebar footer and the mobile header. */
function UserMenu({ align }: { align?: "end" | "start" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-full justify-start gap-2.5 px-2" aria-label="Open user menu">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs font-medium">DU</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">{DEMO_USER.name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent {...(align && { align })} side="top" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{DEMO_USER.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{DEMO_USER.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer"><CircleUserRound className="size-4" aria-hidden /> Profile & settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/login" className="cursor-pointer"><LogIn className="size-4" aria-hidden /> Sign in screen</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const sections = [
  {
    label: null,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/apis", label: "APIs", icon: Network, exact: false },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { to: "/monitoring", label: "Monitoring", icon: Activity, exact: false },
      { to: "/testing", label: "Testing", icon: Gauge, exact: false },
      { to: "/alerts", label: "Alerts", icon: BellRing, exact: false },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/predictions", label: "Predictions", icon: BrainCircuit, exact: false },
      { to: "/analysis", label: "Root cause", icon: ScanSearch, exact: false },
    ],
  },
  {
    label: "MLOps",
    items: [
      { to: "/experiments", label: "Experiments", icon: FlaskConical, exact: false },
      { to: "/models", label: "Models", icon: Boxes, exact: false },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/reports", label: "Reports", icon: FileText, exact: false },
      { to: "/settings", label: "Settings", icon: Settings, exact: false },
    ],
  },
] as const;

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main navigation">
      {sections.map((section) => (
        <div key={section.label ?? "main"}>
          {section.label && (
            <p className="px-3 pt-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 px-6 py-5">
      <ShieldCheck className="size-5 text-primary" aria-hidden />
      <span className="text-sm font-semibold tracking-tight">APIShield</span>
    </Link>
  );
}

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <Logo />
        <div className="flex-1 overflow-y-auto pb-4">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Logo />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="size-4" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col pt-2">
                <Logo />
                <div className="flex-1 overflow-y-auto pb-4">
                  <NavLinks pathname={pathname} />
                </div>
                <div className="border-t p-3">
                  <UserMenu />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PagePending() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export function PageError({ error, reset }: ErrorComponentProps) {
  console.error(error);
  return <ErrorState {...(error instanceof Error ? { message: error.message } : {})} onRetry={reset} />;
}

export type { ReactNode };
