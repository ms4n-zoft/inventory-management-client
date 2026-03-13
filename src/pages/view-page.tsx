import { BillingOptionsCard } from "@/components/view-page/billing-options-card";
import { InventoryPoolsCard } from "@/components/view-page/inventory-pools-card";
import { LowStockWatchCard } from "@/components/view-page/low-stock-watch-card";
import { RecentAuditCard } from "@/components/view-page/recent-audit-card";
import { ViewSummaryMetrics } from "@/components/view-page/view-summary-metrics";
import { useViewWorkspace } from "@/components/view-page/view-workspace";

export function ViewPage() {
  const {
    snapshot,
    loading,
    setupEntries,
    inventoryRows,
    openBillingDialog,
    openInventoryDialog,
  } = useViewWorkspace();

  const recentBillingEntries = setupEntries.slice(0, 3);
  const recentInventoryRows = inventoryRows.slice(0, 3);

  const lowAvailability = inventoryRows
    .filter((entry) => entry.available <= 2)
    .slice(0, 4);
  const latestAudit = snapshot.auditLogs.slice(0, 5);

  return (
    <>
      <ViewSummaryMetrics
        loading={loading}
        productCount={snapshot.products.length}
        billingOptionCount={snapshot.skus.length}
        inventoryPoolCount={snapshot.inventoryPools.length}
        auditEventCount={snapshot.auditLogs.length}
      />

      <LowStockWatchCard entries={lowAvailability} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <BillingOptionsCard
          entries={recentBillingEntries}
          description={`Showing ${recentBillingEntries.length} recent billing option${recentBillingEntries.length === 1 ? "" : "s"} out of ${setupEntries.length}.`}
          viewAllHref="/view/billing-options"
          onEditBilling={openBillingDialog}
          onEditInventory={openInventoryDialog}
        />
        <InventoryPoolsCard
          rows={recentInventoryRows}
          description={`Showing ${recentInventoryRows.length} recent inventory pool${recentInventoryRows.length === 1 ? "" : "s"} out of ${inventoryRows.length}.`}
          viewAllHref="/view/inventory-pools"
          onEditInventory={openInventoryDialog}
        />
      </section>

      <RecentAuditCard entries={latestAudit} />
    </>
  );
}
