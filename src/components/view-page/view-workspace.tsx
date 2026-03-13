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
  buildSkuCode,
  createEmptyPricePerUnit,
  ensureUniqueSkuCode,
  normalizePricePerUnit,
  normalizeRegion,
} from "@/lib/billing-option";
import { buildInventoryRows, buildViewSetupEntries } from "@/lib/view-data";
import { api } from "@/lib/api";
import type { DashboardSnapshot, PricePerUnit, Sku } from "@/types";

type InventoryDialogTarget = {
  skuId: string;
  poolId?: string;
};

type ViewWorkspaceContextValue = {
  snapshot: DashboardSnapshot;
  loading: boolean;
  setupEntries: ViewSetupEntry[];
  inventoryRows: InventoryRowEntry[];
  openBillingDialog: (skuId: string) => void;
  openInventoryDialog: (input: InventoryDialogTarget) => void;
};

export function ViewWorkspace({
  snapshot,
  loading,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
}) {
  const [billingDialogSkuId, setBillingDialogSkuId] = useState<string | null>(
    null,
  );
  const [billingPeriod, setBillingPeriod] =
    useState<Sku["billingPeriod"]>("monthly");
  const [billingRegion, setBillingRegion] = useState("");
  const [billingPricePerUnit, setBillingPricePerUnit] = useState<PricePerUnit>(
    createEmptyPricePerUnit(),
  );
  const [inventoryDialogTarget, setInventoryDialogTarget] =
    useState<InventoryDialogTarget | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState(0);
  const [inventoryActor, setInventoryActor] = useState("operations");

  const setupEntries = useMemo(
    () => buildViewSetupEntries(snapshot),
    [snapshot],
  );
  const inventoryRows = useMemo(() => buildInventoryRows(snapshot), [snapshot]);

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

    setBillingPeriod(activeBillingEntry.sku.billingPeriod);
    setBillingRegion(activeBillingEntry.sku.region ?? "");
    setBillingPricePerUnit(
      activeBillingEntry.sku.pricePerUnit ?? createEmptyPricePerUnit(),
    );
  }, [activeBillingEntry]);

  useEffect(() => {
    if (!inventoryDialogTarget) return;

    setInventoryQuantity(activeInventoryPool?.totalQuantity ?? 0);
    setInventoryActor("operations");
  }, [activeInventoryPool, inventoryDialogTarget]);

  const normalizedBillingRegion = normalizeRegion(billingRegion);
  const generatedBillingCode = useMemo(() => {
    if (!activeBillingEntry) return "";

    return ensureUniqueSkuCode(
      buildSkuCode({
        productName: activeBillingEntry.product.name,
        planName: activeBillingEntry.plan.name,
        billingPeriod,
        region: normalizedBillingRegion,
      }),
      new Set(
        snapshot.skus
          .filter((sku) => sku._id !== activeBillingEntry.sku._id)
          .map((sku) => sku.code),
      ),
    );
  }, [
    activeBillingEntry,
    billingPeriod,
    normalizedBillingRegion,
    snapshot.skus,
  ]);

  const normalizedBillingPricePerUnit = useMemo(
    () => normalizePricePerUnit(billingPricePerUnit),
    [billingPricePerUnit],
  );

  const billingHasPricing =
    normalizedBillingPricePerUnit.amount.length > 0 &&
    normalizedBillingPricePerUnit.currency.length > 0;
  const currentBillingPrice = useMemo(
    () =>
      normalizePricePerUnit(
        activeBillingEntry?.sku.pricePerUnit ?? createEmptyPricePerUnit(),
      ),
    [activeBillingEntry],
  );
  const billingChanged =
    !!activeBillingEntry &&
    (activeBillingEntry.sku.billingPeriod !== billingPeriod ||
      (activeBillingEntry.sku.region ?? undefined) !==
        normalizedBillingRegion ||
      activeBillingEntry.sku.code !== generatedBillingCode ||
      currentBillingPrice.amount !== normalizedBillingPricePerUnit.amount ||
      currentBillingPrice.currency !== normalizedBillingPricePerUnit.currency ||
      (currentBillingPrice.entity ?? undefined) !==
        (normalizedBillingPricePerUnit.entity ?? undefined) ||
      (currentBillingPrice.ratePeriod ?? undefined) !==
        (normalizedBillingPricePerUnit.ratePeriod ?? undefined));

  const activeInventoryRegion =
    activeInventoryPool?.region ?? activeInventoryEntry?.sku.region ?? "GLOBAL";
  const inventoryChanged =
    activeInventoryPool?.totalQuantity !== undefined
      ? inventoryQuantity !== activeInventoryPool.totalQuantity
      : inventoryQuantity > 0;

  const updateBillingPricePerUnit = (
    field: keyof PricePerUnit,
    value: string,
  ) => {
    setBillingPricePerUnit((current) => ({
      ...current,
      [field]: value,
    }));
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
        billingPeriod={billingPeriod}
        onBillingPeriodChange={setBillingPeriod}
        region={billingRegion}
        onRegionChange={setBillingRegion}
        generatedCode={generatedBillingCode}
        pricePerUnit={billingPricePerUnit}
        onPricePerUnitChange={updateBillingPricePerUnit}
        canSave={billingHasPricing && billingChanged}
        loading={loading}
        onSave={() => {
          if (!activeBillingEntry) return;

          void runAction(
            () =>
              api.updateSku(activeBillingEntry.sku._id, {
                code: generatedBillingCode,
                billingPeriod,
                region: normalizedBillingRegion,
                seatType: activeBillingEntry.sku.seatType,
                pricePerUnit: normalizedBillingPricePerUnit,
              }),
            "Billing option updated.",
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
        canSave={inventoryChanged}
        loading={loading}
        onSave={() => {
          if (!activeInventoryEntry) return;

          const work = activeInventoryPool
            ? () =>
                api.adjustInventory({
                  skuId: activeInventoryEntry.sku._id,
                  region: activeInventoryRegion,
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
                  region: activeInventoryRegion,
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
