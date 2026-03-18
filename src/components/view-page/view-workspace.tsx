import { useEffect, useMemo, useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";

import type { ActionRunner } from "@/components/operations-app";
import { EditBillingDialog } from "@/components/view-page/edit-billing-dialog";
import { EditInventoryDialog } from "@/components/view-page/edit-inventory-dialog";
import type {
  InventoryRowEntry,
  ViewSetupEntry,
} from "@/components/view-page/types";
import {
  applyPricingDetailsChange,
  billingCyclesFromPricingOptions,
  buildPricingOptionsFromCycleDetails,
  buildPurchaseConstraints,
  buildSkuCode,
  createPricingDetailsByCycle,
  ensureUniqueSkuCode,
  hasValidPricingOptions,
  hasValidPurchaseConstraints,
  isStockTrackingEnabled,
  normalizePricingOptions,
  normalizeRegion,
  pricingDetailsByCycleFromPricingOptions,
  purchaseConstraintsToFormValues,
  syncPricingDetailsByBillingCycles,
} from "@/lib/billing-option";
import { buildInventoryRows, buildViewSetupEntries } from "@/lib/view-data";
import { api } from "@/lib/api";
import type {
  BillingCycle,
  DashboardSnapshot,
  PricingDetails,
  PricingDetailsByCycle,
  SaleListEntry,
} from "@/types";

type InventoryDialogTarget = {
  skuId: string;
  poolId?: string;
};

type ViewWorkspaceContextValue = {
  snapshot: DashboardSnapshot;
  loading: boolean;
  setupEntries: ViewSetupEntry[];
  inventoryRows: InventoryRowEntry[];
  todaySalesCount: number;
  openBillingDialog: (skuId: string) => void;
  openInventoryDialog: (input: InventoryDialogTarget) => void;
};

export function ViewWorkspace({
  snapshot,
  loading,
  sales,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  sales: SaleListEntry[];
  runAction: ActionRunner;
}) {
  const [billingDialogSkuId, setBillingDialogSkuId] = useState<string | null>(
    null,
  );
  const [billingRegion, setBillingRegion] = useState("");
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([
    "monthly",
  ]);
  const [billingPricingDetailsByCycle, setBillingPricingDetailsByCycle] =
    useState<PricingDetailsByCycle>(createPricingDetailsByCycle());
  const [billingMinUnits, setBillingMinUnits] = useState("");
  const [billingMaxUnits, setBillingMaxUnits] = useState("");
  const [activationTimeline, setActivationTimeline] = useState("");
  const [inventoryDialogTarget, setInventoryDialogTarget] =
    useState<InventoryDialogTarget | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState(0);
  const [inventoryActor, setInventoryActor] = useState("operations");

  const setupEntries = useMemo(
    () => buildViewSetupEntries(snapshot),
    [snapshot],
  );
  const inventoryRows = useMemo(() => buildInventoryRows(snapshot), [snapshot]);
  const todaySalesCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sales.filter((entry) => entry.sale.createdAt.startsWith(today))
      .length;
  }, [sales]);

  const activeBillingEntry = useMemo(
    () =>
      billingDialogSkuId
        ? (setupEntries.find((entry) => entry.sku._id === billingDialogSkuId) ??
          null)
        : null,
    [billingDialogSkuId, setupEntries],
  );

  const activeInventoryEntry = useMemo(
    () =>
      inventoryDialogTarget
        ? (setupEntries.find(
            (entry) => entry.sku._id === inventoryDialogTarget.skuId,
          ) ?? null)
        : null,
    [inventoryDialogTarget, setupEntries],
  );

  const activeInventoryPool = useMemo(() => {
    if (!inventoryDialogTarget) return null;
    if (inventoryDialogTarget.poolId) {
      return (
        snapshot.inventoryPools.find(
          (pool) => pool._id === inventoryDialogTarget.poolId,
        ) ?? null
      );
    }

    return activeInventoryEntry?.pools[0] ?? null;
  }, [activeInventoryEntry, inventoryDialogTarget, snapshot.inventoryPools]);

  useEffect(() => {
    if (!activeBillingEntry) return;

    setBillingRegion(activeBillingEntry.sku.region);
    setBillingCycles(
      billingCyclesFromPricingOptions(activeBillingEntry.sku.pricingOptions),
    );
    setBillingPricingDetailsByCycle(
      pricingDetailsByCycleFromPricingOptions(
        activeBillingEntry.sku.pricingOptions,
      ),
    );
    const purchaseConstraintValues = purchaseConstraintsToFormValues(
      activeBillingEntry.sku.purchaseConstraints,
    );
    setBillingMinUnits(purchaseConstraintValues.minUnits);
    setBillingMaxUnits(purchaseConstraintValues.maxUnits);
    setActivationTimeline(activeBillingEntry.sku.activationTimeline ?? "");
  }, [activeBillingEntry]);

  useEffect(() => {
    if (!inventoryDialogTarget) return;

    setInventoryQuantity(activeInventoryPool?.totalQuantity ?? 0);
    setInventoryActor("operations");
  }, [activeInventoryPool, inventoryDialogTarget]);

  const billingPricingOptions = useMemo(
    () =>
      buildPricingOptionsFromCycleDetails({
        billingCycles,
        pricingDetailsByCycle: billingPricingDetailsByCycle,
      }),
    [billingCycles, billingPricingDetailsByCycle],
  );

  const normalizedBillingRegion = normalizeRegion(billingRegion);
  const generatedBillingCode = useMemo(() => {
    if (!activeBillingEntry) return "";

    return ensureUniqueSkuCode(
      buildSkuCode({
        productName: activeBillingEntry.product.name,
        planName: activeBillingEntry.plan.name,
        region: normalizedBillingRegion,
      }),
      new Set(
        snapshot.skus
          .filter((sku) => sku._id !== activeBillingEntry.sku._id)
          .map((sku) => sku.code),
      ),
    );
  }, [activeBillingEntry, normalizedBillingRegion, snapshot.skus]);

  const normalizedBillingPricingOptions = useMemo(
    () => normalizePricingOptions(billingPricingOptions),
    [billingPricingOptions],
  );
  const normalizedBillingPurchaseConstraints = useMemo(
    () =>
      buildPurchaseConstraints({
        minUnits: billingMinUnits,
        maxUnits: billingMaxUnits,
      }),
    [billingMaxUnits, billingMinUnits],
  );
  const billingHasValidConstraints = hasValidPurchaseConstraints({
    minUnits: billingMinUnits,
    maxUnits: billingMaxUnits,
  });

  const billingHasPricing =
    Boolean(normalizedBillingRegion) &&
    billingHasValidConstraints &&
    hasValidPricingOptions(normalizedBillingPricingOptions);
  const currentBillingPricingOptions = useMemo(
    () => normalizePricingOptions(activeBillingEntry?.sku.pricingOptions ?? []),
    [activeBillingEntry],
  );
  const billingChanged =
    !!activeBillingEntry &&
    (activeBillingEntry.sku.region !== normalizedBillingRegion ||
      activeBillingEntry.sku.code !== generatedBillingCode ||
      JSON.stringify(currentBillingPricingOptions) !==
        JSON.stringify(normalizedBillingPricingOptions) ||
      JSON.stringify(activeBillingEntry.sku.purchaseConstraints ?? null) !==
        JSON.stringify(normalizedBillingPurchaseConstraints ?? null) ||
      (activeBillingEntry.sku.activationTimeline ?? "") !==
        activationTimeline.trim());

  const activeInventoryRegion = activeInventoryEntry?.sku.region ?? "";
  const inventoryTrackingEnabled = activeInventoryEntry
    ? isStockTrackingEnabled(activeInventoryEntry.sku.purchaseConstraints)
    : true;
  const inventoryChanged =
    inventoryTrackingEnabled &&
    (activeInventoryPool?.totalQuantity !== undefined
      ? inventoryQuantity !== activeInventoryPool.totalQuantity
      : inventoryQuantity > 0);

  const updateBillingPricingOption = (
    billingCycle: BillingCycle,
    field: keyof PricingDetails,
    value: string,
  ) => {
    setBillingPricingDetailsByCycle((current) =>
      applyPricingDetailsChange({
        billingCycles,
        pricingDetailsByCycle: current,
        billingCycle,
        field,
        value,
      }),
    );
  };

  const updateBillingCycles = (value: BillingCycle[]) => {
    setBillingCycles(value);
    setBillingPricingDetailsByCycle((current) =>
      syncPricingDetailsByBillingCycles({
        billingCycles: value,
        pricingDetailsByCycle: current,
      }),
    );
  };

  const closeBillingDialog = () => setBillingDialogSkuId(null);
  const closeInventoryDialog = () => setInventoryDialogTarget(null);

  return (
    <>
      <Outlet
        context={{
          snapshot,
          loading,
          setupEntries,
          inventoryRows,
          todaySalesCount,
          openBillingDialog: setBillingDialogSkuId,
          openInventoryDialog: setInventoryDialogTarget,
        }}
      />

      <EditBillingDialog
        entry={activeBillingEntry}
        open={Boolean(activeBillingEntry)}
        onOpenChange={(open) => {
          if (!open) closeBillingDialog();
        }}
        region={billingRegion}
        onRegionChange={setBillingRegion}
        generatedCode={generatedBillingCode}
        billingCycles={billingCycles}
        onBillingCyclesChange={updateBillingCycles}
        pricingDetailsByCycle={billingPricingDetailsByCycle}
        onPricingDetailsChange={updateBillingPricingOption}
        minimumUnits={billingMinUnits}
        onMinimumUnitsChange={setBillingMinUnits}
        maximumUnits={billingMaxUnits}
        onMaximumUnitsChange={setBillingMaxUnits}
        activationTimeline={activationTimeline}
        onActivationTimelineChange={setActivationTimeline}
        canSave={billingHasPricing && billingChanged}
        loading={loading}
        onSave={() => {
          if (!activeBillingEntry || !normalizedBillingRegion) return;

          void runAction(
            () =>
              api.updateSku(activeBillingEntry.sku._id, {
                code: generatedBillingCode,
                region: normalizedBillingRegion,
                seatType: activeBillingEntry.sku.seatType,
                pricingOptions: normalizedBillingPricingOptions,
                purchaseConstraints: normalizedBillingPurchaseConstraints,
                activationTimeline: activationTimeline.trim() || undefined,
              }),
            "Regional offer updated.",
          ).then((ok) => {
            if (ok) closeBillingDialog();
          });
        }}
      />

      <EditInventoryDialog
        entry={activeInventoryEntry}
        pool={activeInventoryPool}
        open={Boolean(activeInventoryEntry)}
        onOpenChange={(open) => {
          if (!open) closeInventoryDialog();
        }}
        quantity={inventoryQuantity}
        onQuantityChange={setInventoryQuantity}
        region={activeInventoryRegion}
        actor={inventoryActor}
        onActorChange={setInventoryActor}
        stockTrackingEnabled={inventoryTrackingEnabled}
        canSave={inventoryChanged}
        loading={loading}
        onSave={() => {
          if (!activeInventoryEntry || !inventoryTrackingEnabled) return;

          const work = activeInventoryPool
            ? () =>
                api.adjustInventory({
                  skuId: activeInventoryEntry.sku._id,
                  change: inventoryQuantity - activeInventoryPool.totalQuantity,
                  reason:
                    inventoryQuantity >= activeInventoryPool.totalQuantity
                      ? "MANUAL_ADD"
                      : "MANUAL_REMOVE",
                  actor: inventoryActor.trim() || "operations",
                })
            : () =>
                api.createInventoryPool({
                  skuId: activeInventoryEntry.sku._id,
                  totalQuantity: inventoryQuantity,
                });

          void runAction(
            work,
            activeInventoryPool
              ? "Inventory updated."
              : "Inventory tracking started.",
          ).then((ok) => {
            if (ok) closeInventoryDialog();
          });
        }}
      />
    </>
  );
}

export function useViewWorkspace() {
  return useOutletContext<ViewWorkspaceContextValue>();
}
