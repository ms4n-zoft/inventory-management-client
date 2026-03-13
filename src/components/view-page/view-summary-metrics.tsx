import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

export function ViewSummaryMetrics({
  loading,
  productCount,
  billingOptionCount,
  inventoryPoolCount,
  auditEventCount,
}: {
  loading: boolean;
  productCount: number;
  billingOptionCount: number;
  inventoryPoolCount: number;
  auditEventCount: number;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Products" value={productCount} loading={loading} />
      <MetricCard
        label="Billing options"
        value={billingOptionCount}
        loading={loading}
      />
      <MetricCard
        label="Inventory pools"
        value={inventoryPoolCount}
        loading={loading}
      />
      <MetricCard
        label="Audit events"
        value={auditEventCount}
        loading={loading}
      />
    </section>
  );
}
