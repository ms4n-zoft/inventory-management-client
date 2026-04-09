import { useEffect, useState } from "react";
import { BoxesIcon, PencilRulerIcon, Trash2Icon } from "lucide-react";

import {
  formatActivationTimelineValue,
  formatBillingCycle,
  formatBillingCycleLabel,
  formatPriceLine,
  formatPurchaseConstraints,
  formatSkuPurchaseTypeLabel,
  formatSkuLabel,
} from "@/lib/catalog";
import { isStockTrackingEnabled } from "@/lib/billing-option";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import type { ViewSetupEntry } from "./types";

export function BillingOptionTile({
  entry,
  loading,
  onEditBilling,
  onEditInventory,
  onSetBillingDisabled,
  onDeleteBilling,
}: {
  entry: ViewSetupEntry;
  loading: boolean;
  onEditBilling: (skuId: string) => void;
  onEditInventory: (input: { skuId: string; poolId?: string }) => void;
  onSetBillingDisabled: (
    entry: ViewSetupEntry,
    isBillingDisabled: boolean,
  ) => Promise<boolean>;
  onDeleteBilling: (entry: ViewSetupEntry) => Promise<boolean>;
}) {
  const [billingDisabled, setBillingDisabled] = useState(
    Boolean(entry.sku.isBillingDisabled),
  );
  const minimumUnits = entry.sku.purchaseConstraints?.minUnits;
  const maximumUnits = entry.sku.purchaseConstraints?.maxUnits;
  const stockTrackingEnabled = isStockTrackingEnabled(
    entry.sku.purchaseConstraints,
  );
  const showUnitCards = maximumUnits === undefined;
  const activationTimeline = formatActivationTimelineValue(
    entry.sku.activationTimeline,
  );
  const inventoryActionHelp =
    stockTrackingEnabled && entry.pools.length > 1
      ? "Use the pool table below to edit each regional stock pool."
      : null;

  useEffect(() => {
    setBillingDisabled(Boolean(entry.sku.isBillingDisabled));
  }, [entry.sku.isBillingDisabled]);

  const handleBillingDisabledChange = (nextBillingDisabled: boolean) => {
    setBillingDisabled(nextBillingDisabled);

    void onSetBillingDisabled(entry, nextBillingDisabled).then((ok) => {
      if (!ok) {
        setBillingDisabled(Boolean(entry.sku.isBillingDisabled));
      }
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card/70">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{entry.product.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[entry.plan.name, entry.product.vendor]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Disable billing</span>
              <Switch
                checked={billingDisabled}
                disabled={loading}
                onCheckedChange={handleBillingDisabledChange}
                aria-label={`Disable billing for ${entry.product.name} ${entry.plan.name}`}
              />
            </label>
            <Badge variant="outline">{entry.sku.region}</Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border bg-muted/40 px-2 py-1">
            {formatSkuLabel(entry.sku)}
          </span>
          <span className="rounded-md border bg-muted/40 px-2 py-1">
            {formatBillingCycle(entry.sku.pricingOption)}
          </span>
          <span className="rounded-md border bg-muted/40 px-2 py-1">
            {formatSkuPurchaseTypeLabel(entry.sku.purchaseType)}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p>
            {formatBillingCycleLabel(entry.sku.pricingOption.billingCycle)}:{" "}
            {formatPriceLine({
              ...entry.sku.pricingOption,
              fallbackText: "Pricing unavailable",
            })}
          </p>
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

        {inventoryActionHelp ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {inventoryActionHelp}
          </p>
        ) : null}
      </div>

      <div className="mt-auto border-t px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditBilling(entry.sku._id)}
              aria-label={`Edit billing for ${entry.product.name} ${entry.plan.name}`}
              disabled={loading}
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
                disabled={loading}
              >
                <BoxesIcon data-icon="inline-start" />
                {entry.pools.length > 0 ? "Edit inventory" : "Track stock"}
              </Button>
            ) : null}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                aria-label={`Delete billing for ${entry.product.name} ${entry.plan.name}`}
                disabled={loading}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete billing
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete billing option</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove {entry.product.name} {entry.plan.name} for{" "}
                  {entry.sku.region}. This also deletes its tracked inventory
                  pool. Billing options with recorded sales cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={loading}
                  onClick={() => {
                    void onDeleteBilling(entry);
                  }}
                >
                  Delete billing
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
