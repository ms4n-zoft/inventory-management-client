import { BoxesIcon, PencilRulerIcon } from "lucide-react";

import {
  formatActivationTimelineValue,
  formatBillingCycleLabel,
  formatBillingCycles,
  formatPriceLine,
  formatPurchaseConstraints,
  formatSkuLabel,
} from "@/lib/catalog";
import { isStockTrackingEnabled } from "@/lib/billing-option";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ViewSetupEntry } from "./types";

export function BillingOptionTile({
  entry,
  onEditBilling,
  onEditInventory,
}: {
  entry: ViewSetupEntry;
  onEditBilling: (skuId: string) => void;
  onEditInventory: (input: { skuId: string; poolId?: string }) => void;
}) {
  const pricingOptions = entry.sku.pricingOptions ?? [];
  const minimumUnits = entry.sku.purchaseConstraints?.minUnits;
  const maximumUnits = entry.sku.purchaseConstraints?.maxUnits;
  const stockTrackingEnabled = isStockTrackingEnabled(
    entry.sku.purchaseConstraints,
  );
  const showUnitCards = maximumUnits === undefined;
  const activationTimeline = formatActivationTimelineValue(
    entry.sku.activationTimeline,
  );

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{entry.product.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[entry.plan.name, entry.product.vendor]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Badge variant="outline">{entry.sku.region}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border bg-muted/40 px-2 py-1">
          {formatSkuLabel(entry.sku)}
        </span>
        <span className="rounded-md border bg-muted/40 px-2 py-1">
          {formatBillingCycles(pricingOptions)}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {pricingOptions.map((option) => (
          <p key={`${entry.sku._id}-${option.billingCycle}`}>
            {formatBillingCycleLabel(option.billingCycle)}:{" "}
            {formatPriceLine({
              ...option,
              fallbackText: "Pricing unavailable",
            })}
          </p>
        ))}
        <p>{formatPurchaseConstraints(entry.sku)}</p>
        {activationTimeline ? (
          <p>Activation timeline: {activationTimeline}</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {showUnitCards ? (
          <>
            <div className="rounded-lg border px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Minimum units
              </p>
              <p className="mt-1 text-sm font-medium">
                {minimumUnits?.toString() ?? "Not set"}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Maximum units
              </p>
              <p className="mt-1 text-sm font-medium">Unlimited</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Stock tracking
              </p>
              <p className="mt-1 text-sm font-medium">
                {entry.pools.length > 0
                  ? `${entry.trackedQuantity} tracked`
                  : "Not tracked yet"}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Available now
              </p>
              <p className="mt-1 text-sm font-medium">
                {entry.pools.length > 0
                  ? `${entry.availableQuantity} available`
                  : "No pool yet"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditBilling(entry.sku._id)}
          aria-label={`Edit billing for ${entry.product.name} ${entry.plan.name}`}
        >
          <PencilRulerIcon data-icon="inline-start" />
          Edit billing
        </Button>
        {stockTrackingEnabled && entry.pools.length <= 1 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onEditInventory({
                skuId: entry.sku._id,
                poolId: entry.pools[0]?._id,
              })
            }
            aria-label={`${entry.pools.length > 0 ? "Edit" : "Track"} inventory for ${entry.product.name} ${entry.plan.name}`}
          >
            <BoxesIcon data-icon="inline-start" />
            {entry.pools.length > 0 ? "Edit inventory" : "Track stock"}
          </Button>
        ) : stockTrackingEnabled ? (
          <p className="self-center text-xs text-muted-foreground">
            Use the pool table below to edit each regional stock pool.
          </p>
        ) : null}
      </div>
    </div>
  );
}
