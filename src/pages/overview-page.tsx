import { Link } from "react-router-dom";
import {
  AlertCircleIcon,
  BoxesIcon,
  ClipboardCheckIcon,
  ScrollTextIcon,
} from "lucide-react";

import type { DashboardSnapshot, Reservation } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function OverviewPage({
  snapshot,
  loading,
  activeReservations,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  activeReservations: Reservation[];
}) {
  const latestAudit = snapshot.auditLogs.slice(0, 6);
  const lowAvailability = snapshot.inventoryPools
    .map((pool) => ({
      ...pool,
      available:
        pool.totalQuantity - pool.reservedQuantity - pool.allocatedQuantity,
    }))
    .filter((pool) => pool.available <= 2)
    .slice(0, 6);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Products"
          value={snapshot.products.length}
          loading={loading}
        />
        <MetricCard
          label="Inventory pools"
          value={snapshot.inventoryPools.length}
          loading={loading}
        />
        <MetricCard
          label="Active reservations"
          value={activeReservations.length}
          loading={loading}
        />
        <MetricCard
          label="Audit events"
          value={snapshot.auditLogs.length}
          loading={loading}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Open the next task directly instead of scrolling through one long
              page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <Button asChild>
              <Link to="/catalog">
                <BoxesIcon data-icon="inline-start" />
                Open catalog setup
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/inventory">
                <AlertCircleIcon data-icon="inline-start" />
                Review inventory levels
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reservations">
                <ClipboardCheckIcon data-icon="inline-start" />
                Manage reservations
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/audit">
                <ScrollTextIcon data-icon="inline-start" />
                Open audit history
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Low availability</CardTitle>
            <CardDescription>
              Skus with two or fewer seats left.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lowAvailability.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircleIcon />
                  </EmptyMedia>
                  <EmptyTitle>No low-availability pools</EmptyTitle>
                  <EmptyDescription>
                    All tracked inventory currently has more than two seats
                    available.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {lowAvailability.map((pool) => (
              <div
                key={pool.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{pool.skuId}</p>
                  <p className="text-xs text-muted-foreground">{pool.region}</p>
                </div>
                <Badge
                  variant={pool.available === 0 ? "destructive" : "outline"}
                >
                  {pool.available} left
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
          <CardDescription>
            Latest inventory-affecting actions and who performed them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestAudit.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollTextIcon />
                </EmptyMedia>
                <EmptyTitle>No audit events yet</EmptyTitle>
                <EmptyDescription>
                  Inventory mutations will appear here once operators start
                  using the system.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestAudit.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.action}
                    </TableCell>
                    <TableCell>{entry.actor}</TableCell>
                    <TableCell>
                      {new Date(entry.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MetricCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">
          {loading ? <Skeleton className="h-8 w-16" /> : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
