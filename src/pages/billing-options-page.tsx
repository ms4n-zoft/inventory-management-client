import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { PackagePlusIcon } from "lucide-react";

import { BillingOptionTile } from "@/components/view-page/billing-option-tile";
import { ViewSearchCard } from "@/components/view-page/view-search-card";
import { useViewWorkspace } from "@/components/view-page/view-workspace";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function BillingOptionsPage() {
  const {
    setupEntries,
    loading,
    openBillingDialog,
    openInventoryDialog,
    setBillingDisabled,
    deleteBilling,
  } = useViewWorkspace();
  const [query, setQuery] = useState("");

  const search = useMemo(
    () =>
      new Fuse(setupEntries, {
        ignoreLocation: true,
        threshold: 0.3,
        keys: [
          { name: "product.name", weight: 0.35 },
          { name: "product.vendor", weight: 0.2 },
          { name: "plan.name", weight: 0.2 },
          { name: "sku.code", weight: 0.15 },
          { name: "sku.pricingOption.billingCycle", weight: 0.05 },
          { name: "sku.region", weight: 0.05 },
        ],
      }),
    [setupEntries],
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return setupEntries;

    return search.search(normalizedQuery).map((result) => result.item);
  }, [query, search, setupEntries]);

  return (
    <>
      <ViewSearchCard
        title="Browse billing options"
        description="Search every regional offer by product, vendor, plan, offer code, billing cycle, or region."
        placeholder="Search by product, vendor, plan, code, cycle, or region"
        query={query}
        onQueryChange={setQuery}
        resultCount={filteredEntries.length}
        totalCount={setupEntries.length}
        noun="regional offer"
      />

      {filteredEntries.length === 0 ? (
        <Empty className="rounded-xl border bg-card px-6 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackagePlusIcon />
            </EmptyMedia>
            <EmptyTitle>No billing options matched</EmptyTitle>
            <EmptyDescription>
              Try a broader search term or return to the view overview.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredEntries.map((entry) => (
            <BillingOptionTile
              key={entry.sku._id}
              entry={entry}
              loading={loading}
              onEditBilling={openBillingDialog}
              onEditInventory={openInventoryDialog}
              onSetBillingDisabled={setBillingDisabled}
              onDeleteBilling={deleteBilling}
            />
          ))}
        </section>
      )}
    </>
  );
}
