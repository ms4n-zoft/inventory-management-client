import { useEffect, useMemo, useState } from "react";

import type { ActionRunner } from "@/components/operations-app";
import { EditBillingDialog } from "@/components/view-page/edit-billing-dialog";
import { EditInventoryDialog } from "@/components/view-page/edit-inventory-dialog";
import { BillingOptionsCard } from "@/components/view-page/billing-options-card";
import { InventoryPoolsCard } from "@/components/view-page/inventory-pools-card";
import { LowStockWatchCard } from "@/components/view-page/low-stock-watch-card";
import { RecentAuditCard } from "@/components/view-page/recent-audit-card";
import type {
  InventoryRowEntry,
  ViewSetupEntry,
} from "@/components/view-page/types";
import { ViewSummaryMetrics } from "@/components/view-page/view-summary-metrics";
import { ViewToolbarCard } from "@/components/view-page/view-toolbar-card";
import { api } from "@/lib/api";
import {
  buildSkuCode,
  createEmptyPricePerUnit,
  ensureUniqueSkuCode,
  normalizePricePerUnit,
  normalizeRegion,
} from "@/lib/billing-option";
import { buildSkuCatalogLookup } from "@/lib/catalog";
import type {
  DashboardSnapshot,
  InventoryPool,
  Plan,
  PricePerUnit,
  Product,
  Reservation,
  Sku,
} from "@/types";

export function ViewPage({
  snapshot,
  loading,
  activeReservations,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  activeReservations: Reservation[];
  runAction: ActionRunner;
}) {
  const [query, setQuery] = useState("");
  const [billingDialogSkuId, setBillingDialogSkuId] = useState<string | null>(
    null,
  );
  const [billingPeriod, setBillingPeriod] =
    useState<Sku["billingPeriod"]>("monthly");
  const [billingRegion, setBillingRegion] = useState("");
  const [billingPricePerUnit, setBillingPricePerUnit] = useState<PricePerUnit>(
    createEmptyPricePerUnit(),
  );
  const [inventoryDialogTarget, setInventoryDialogTarget] = useState<{
    skuId: string;
    poolId?: string;
  } | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState(0);
  const [inventoryActor, setInventoryActor] = useState("operations");
  const skuCatalog = useMemo(() => buildSkuCatalogLookup(snapshot), [snapshot]);

  const setupEntries = useMemo<ViewSetupEntry[]>(
    () =>
      [...snapshot.skus]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((sku) => {
          const catalogEntry = skuCatalog.get(sku._id);
          const pools = snapshot.inventoryPools.filter(
            (pool) => pool.skuId === sku._id,
          );
          const trackedQuantity = pools.reduce(
            (sum, pool) => sum + pool.totalQuantity,
            0,
          );
          const availableQuantity = pools.reduce(
            (sum, pool) =>
              sum +
              (pool.totalQuantity -
                pool.reservedQuantity -
                pool.allocatedQuantity),
            0,
          );
          const hasReservationActivity = snapshot.reservations.some(
            (reservation) => reservation.skuId === sku._id,
          );
          const hasEntitlementActivity = snapshot.entitlements.some(
            (entitlement) => entitlement.skuId === sku._id,
          );

          return {
            sku,
            plan: catalogEntry?.plan,
            product: catalogEntry?.product,
            pools,
            trackedQuantity,
            availableQuantity,
            hasLockedRegion:
              pools.length > 0 ||
              hasReservationActivity ||
              hasEntitlementActivity,
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            sku: Sku;
            plan: Plan;
            product: Product;
            pools: InventoryPool[];
            trackedQuantity: number;
            availableQuantity: number;
            hasLockedRegion: boolean;
          } => Boolean(entry.plan && entry.product),
        ),
    [
      skuCatalog,
      snapshot.entitlements,
      snapshot.inventoryPools,
      snapshot.reservations,
      snapshot.skus,
    ],
  );

  const inventoryRows = useMemo<InventoryRowEntry[]>(
    () =>
      [...snapshot.inventoryPools]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((pool) => {
          const catalogEntry = skuCatalog.get(pool.skuId);
          const available =
            pool.totalQuantity - pool.reservedQuantity - pool.allocatedQuantity;

          return {
            pool,
            product: catalogEntry?.product,
            plan: catalogEntry?.plan,
            sku:
              catalogEntry?.sku ??
              snapshot.skus.find((sku) => sku._id === pool.skuId),
            available,
          };
        }),
    [skuCatalog, snapshot.inventoryPools, snapshot.skus],
  );

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

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSetups = useMemo(
    () =>
      setupEntries.filter((entry) => {
        if (!normalizedQuery) return true;

        const haystack = [
          entry.product.name,
          entry.product.vendor,
          entry.plan.name,
          entry.sku.code,
          entry.sku.billingPeriod,
          entry.sku.region,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      }),
    [normalizedQuery, setupEntries],
  );

  const filteredInventoryRows = useMemo(
    () =>
      inventoryRows.filter((entry) => {
        if (!normalizedQuery) return true;

        const haystack = [
          entry.product?.name,
          entry.plan?.name,
          entry.sku?.code,
          entry.pool.region,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      }),
    [inventoryRows, normalizedQuery],
  );

  const lowAvailability = inventoryRows
    .filter((entry) => entry.available <= 2)
    .slice(0, 4);
  const latestAudit = snapshot.auditLogs.slice(0, 5);

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
      <ViewSummaryMetrics
        loading={loading}
        productCount={snapshot.products.length}
        billingOptionCount={snapshot.skus.length}
        inventoryPoolCount={snapshot.inventoryPools.length}
        activeReservationCount={activeReservations.length}
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ViewToolbarCard query={query} onQueryChange={setQuery} />
        <LowStockWatchCard entries={lowAvailability} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <BillingOptionsCard
          entries={filteredSetups}
          onEditBilling={setBillingDialogSkuId}
          onEditInventory={setInventoryDialogTarget}
        />
        <InventoryPoolsCard
          rows={filteredInventoryRows}
          onEditInventory={setInventoryDialogTarget}
        />
      </section>

      <RecentAuditCard entries={latestAudit} />

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
