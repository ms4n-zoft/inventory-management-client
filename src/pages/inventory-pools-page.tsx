import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { BoxesIcon } from "lucide-react";

import { InventoryPoolsCard } from "@/components/view-page/inventory-pools-card";
import { ViewSearchCard } from "@/components/view-page/view-search-card";
import { useViewWorkspace } from "@/components/view-page/view-workspace";
import { isStockTrackingEnabled } from "@/lib/billing-option";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function InventoryPoolsPage() {
  const { inventoryRows, openInventoryDialog, setupEntries } =
    useViewWorkspace();
  const [query, setQuery] = useState("");
  const unlimitedInventoryOfferCount = setupEntries.filter(
    (entry) => !isStockTrackingEnabled(entry.sku.purchaseConstraints),
  ).length;

  const search = useMemo(
    () =>
      new Fuse(inventoryRows, {
        ignoreLocation: true,
        threshold: 0.3,
        keys: [
          { name: "product.name", weight: 0.35 },
          { name: "plan.name", weight: 0.2 },
          { name: "sku.code", weight: 0.2 },
          { name: "sku.region", weight: 0.2 },
          { name: "sku.pricingOption.billingCycle", weight: 0.05 },
        ],
      }),
    [inventoryRows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return inventoryRows;

    return search.search(normalizedQuery).map((result) => result.item);
  }, [inventoryRows, query, search]);

  return (
    <>
      <ViewSearchCard
        title="Browse inventory pools"
        description="Search every tracked stock pool by product, plan, billing code, or region. Offers with unlimited inventory do not create pools."
        placeholder="Search by product, plan, code, or region"
        query={query}
        onQueryChange={setQuery}
        resultCount={filteredRows.length}
        totalCount={inventoryRows.length}
        noun="inventory pool"
      />

      {filteredRows.length === 0 ? (
        <Empty className="rounded-xl border bg-card px-6 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BoxesIcon />
            </EmptyMedia>
            <EmptyTitle>
              {inventoryRows.length === 0 &&
              unlimitedInventoryOfferCount > 0 &&
              !query.trim()
                ? "No tracked pools"
                : "No inventory pools matched"}
            </EmptyTitle>
            <EmptyDescription>
              {inventoryRows.length === 0 &&
              unlimitedInventoryOfferCount > 0 &&
              !query.trim()
                ? unlimitedInventoryOfferCount === 1
                  ? "1 billing option currently uses unlimited inventory, so no tracked pool is needed."
                  : `${unlimitedInventoryOfferCount} billing options currently use unlimited inventory, so no tracked pools are needed.`
                : "Try a broader search term or return to the view overview."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <InventoryPoolsCard
          rows={filteredRows}
          description={`Showing ${filteredRows.length} of ${inventoryRows.length} tracked pool${inventoryRows.length === 1 ? "" : "s"}.`}
          unlimitedOfferCount={unlimitedInventoryOfferCount}
          onEditInventory={openInventoryDialog}
        />
      )}
    </>
  );
}
