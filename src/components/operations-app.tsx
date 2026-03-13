import { startTransition, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  ArrowUpRightIcon,
  BoxesIcon,
  PackagePlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { api } from "@/lib/api";
import type { DashboardSnapshot } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SetupPage } from "@/pages/setup-page";
import { BillingOptionsPage } from "@/pages/billing-options-page";
import { InventoryPoolsPage } from "@/pages/inventory-pools-page";
import { ViewPage } from "@/pages/view-page";
import { AuditPage } from "@/pages/audit-page";
import { ViewWorkspace } from "@/components/view-page/view-workspace";

const emptySnapshot: DashboardSnapshot = {
  products: [],
  plans: [],
  skus: [],
  inventoryPools: [],
  auditLogs: [],
};

export type ActionRunner = (
  work: () => Promise<unknown>,
  message: string,
) => Promise<boolean>;

const navigationItems = [
  {
    href: "/",
    label: "Create",
    icon: PackagePlusIcon,
    subtitle: "billing and stock",
  },
  {
    href: "/view",
    label: "View",
    icon: BoxesIcon,
    subtitle: "everything created",
  },
  {
    href: "/audit",
    label: "Audit",
    icon: ShieldCheckIcon,
    subtitle: "change history",
  },
] as const;

type RouteMeta = {
  label: string;
  title: string;
  description: string;
};

const routeMeta: Record<string, RouteMeta> = {
  "/": {
    label: "create",
    title: "Create setup",
    description:
      "Create billing options and starting stock in one guided operator flow.",
  },
  "/create": {
    label: "create",
    title: "Create setup",
    description:
      "Create billing options and starting stock in one guided operator flow.",
  },
  "/catalog": {
    label: "create",
    title: "Create setup",
    description:
      "Create billing options and starting stock in one guided operator flow.",
  },
  "/view": {
    label: "view",
    title: "View created items",
    description:
      "Browse the billing options, inventory pools, and recent activity already in the system.",
  },
  "/view/billing-options": {
    label: "view",
    title: "All billing options",
    description:
      "Search and inspect every billing option that has already been created.",
  },
  "/view/inventory-pools": {
    label: "view",
    title: "All inventory pools",
    description:
      "Search and inspect every tracked inventory pool across regions.",
  },
  "/inventory": {
    label: "view",
    title: "View created items",
    description:
      "Browse the billing options, inventory pools, and recent activity already in the system.",
  },
  "/audit": {
    label: "audit",
    title: "Audit history",
    description: "Review the latest inventory-affecting events and actors.",
  },
};

function getRouteMeta(pathname: string): RouteMeta {
  return (
    routeMeta[pathname] ?? {
      label: "create",
      title: "Create setup",
      description:
        "Create billing options and starting stock in one guided operator flow.",
    }
  );
}

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OperationsApp() {
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    tone: "neutral" | "success" | "error";
    text: string;
  }>({
    tone: "neutral",
    text: "Loading inventory data.",
  });

  const refresh = async (message = "Inventory data is up to date.") => {
    setLoading(true);

    try {
      const nextSnapshot = await api.getDashboard();
      startTransition(() => {
        setSnapshot(nextSnapshot);
        setStatus({ tone: "success", text: message });
      });
    } catch (error) {
      setStatus({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load inventory data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runAction: ActionRunner = async (work, message) => {
    setLoading(true);

    try {
      await work();
      await refresh(message);
      return true;
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Request failed.",
      });
      setLoading(false);
      return false;
    }
  };

  const currentMeta = getRouteMeta(location.pathname);

  return (
    <SidebarProvider>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className="border-r shadow-none"
      >
        <SidebarHeader className="gap-3 border-b px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-background">
              <BoxesIcon />
            </div>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold tracking-tight">
                Inventory
              </p>
              <p className="truncate text-sm text-muted-foreground">
                Operations workspace
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-4 py-5">
            <SidebarGroupLabel className="px-0 text-sm font-medium text-sidebar-foreground/80">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavigationItemActive(
                        location.pathname,
                        item.href,
                      )}
                      tooltip={item.label}
                      size="lg"
                      className="h-auto min-h-14 items-start rounded-xl px-3 py-3"
                    >
                      <NavLink to={item.href}>
                        <item.icon className="mt-0.5 size-4.5" />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-base font-medium leading-none">
                            {item.label}
                          </span>
                          <span className="truncate pt-1 text-sm text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t px-4 py-5">
          <Card size="sm" className="shadow-none">
            <CardHeader className="border-b">
              <CardTitle className="text-sm">Status</CardTitle>
              <CardDescription>
                {loading ? "Syncing data" : status.text}
              </CardDescription>
              <CardAction>
                <Badge
                  variant={status.tone === "error" ? "destructive" : "outline"}
                >
                  {loading
                    ? "Syncing"
                    : status.tone === "error"
                      ? "Issue"
                      : "Live"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tracked pools</span>
                <span>{snapshot.inventoryPools.length}</span>
              </div>
            </CardContent>
          </Card>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="shadow-none" />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {currentMeta.label}
              </span>
              <h1 className="text-lg font-semibold">{currentMeta.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline">
              {snapshot.inventoryPools.length} pools tracked
            </Badge>
            <Button
              variant="outline"
              onClick={() => void refresh("Inventory data refreshed.")}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Refresh data
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{currentMeta.title}</CardTitle>
              <CardDescription>{currentMeta.description}</CardDescription>
            </CardHeader>
          </Card>

          <Routes>
            <Route
              path="/"
              element={
                <SetupPage
                  snapshot={snapshot}
                  loading={loading}
                  runAction={runAction}
                />
              }
            />
            <Route
              path="/view"
              element={
                <ViewWorkspace
                  snapshot={snapshot}
                  loading={loading}
                  runAction={runAction}
                />
              }
            >
              <Route index element={<ViewPage />} />
              <Route path="billing-options" element={<BillingOptionsPage />} />
              <Route path="inventory-pools" element={<InventoryPoolsPage />} />
            </Route>
            <Route path="/create" element={<Navigate to="/" replace />} />
            <Route path="/catalog" element={<Navigate to="/" replace />} />
            <Route
              path="/inventory"
              element={<Navigate to="/view" replace />}
            />
            <Route
              path="/audit"
              element={
                <AuditPage auditLogs={snapshot.auditLogs} loading={loading} />
              }
            />
            <Route path="*" element={<NavigateToOverview />} />
          </Routes>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NavigateToOverview() {
  return (
    <Card className="shadow-none">
      <CardContent className="pt-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ArrowUpRightIcon />
            </EmptyMedia>
            <EmptyTitle>Page not found</EmptyTitle>
            <EmptyDescription>
              Use the sidebar to move back to a valid workspace page.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="outline">
            <Link to="/">Go to create</Link>
          </Button>
        </Empty>
      </CardContent>
    </Card>
  );
}
