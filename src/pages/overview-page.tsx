import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircleIcon,
  BoxesIcon,
  ClipboardCheckIcon,
  PackagePlusIcon,
  PencilRulerIcon,
  ScrollTextIcon,
  SearchIcon,
} from "lucide-react";

import type { ActionRunner } from "@/components/operations-app";
import { BillingDetailsFields } from "@/components/billing-details-fields";
import { InventoryStockFields } from "@/components/inventory-stock-fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  DashboardSnapshot,
  InventoryPool,
  Plan,
  PricePerUnit,
  Product,
  Reservation,
  Sku,
} from "@/types";
import { api } from "@/lib/api";
import {
  buildSkuCode,
  createEmptyPricePerUnit,
  ensureUniqueSkuCode,
  normalizePricePerUnit,
  normalizeRegion,
} from "@/lib/billing-option";
import {
  buildSkuCatalogLookup,
  formatPriceLine,
  formatSkuLabel,
} from "@/lib/catalog";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
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

  const setupEntries = useMemo<
    Array<{
      sku: Sku;
      plan: Plan;
      product: Product;
      pools: InventoryPool[];
      trackedQuantity: number;
      availableQuantity: number;
      hasLockedRegion: boolean;
    }>
  >(
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

  const inventoryRows = useMemo(
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
          entry.product?.name,
          entry.product?.vendor,
          entry.plan?.name,
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
  const billingChanged =
    !!activeBillingEntry &&
    (activeBillingEntry.sku.billingPeriod !== billingPeriod ||
      (activeBillingEntry.sku.region ?? undefined) !==
        normalizedBillingRegion ||
      activeBillingEntry.sku.code !== generatedBillingCode ||
      normalizePricePerUnit(
        activeBillingEntry.sku.pricePerUnit ?? createEmptyPricePerUnit(),
      ).amount !== normalizedBillingPricePerUnit.amount ||
      normalizePricePerUnit(
        activeBillingEntry.sku.pricePerUnit ?? createEmptyPricePerUnit(),
      ).currency !== normalizedBillingPricePerUnit.currency ||
      (normalizePricePerUnit(
        activeBillingEntry.sku.pricePerUnit ?? createEmptyPricePerUnit(),
      ).entity ?? undefined) !==
        (normalizedBillingPricePerUnit.entity ?? undefined) ||
      (normalizePricePerUnit(
        activeBillingEntry.sku.pricePerUnit ?? createEmptyPricePerUnit(),
      ).ratePeriod ?? undefined) !==
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Products"
          value={snapshot.products.length}
          loading={loading}
        />
        <MetricCard
          label="Billing options"
          value={snapshot.skus.length}
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>View everything created</CardTitle>
            <CardDescription>
              Search the catalog and stock you already set up without jumping
              between separate pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by product, plan, code, vendor, or region"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/">
                  <PackagePlusIcon data-icon="inline-start" />
                  Open create flow
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
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Watch list</CardTitle>
            <CardDescription>
              Quick attention points before you leave the view page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowAvailability.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircleIcon />
                  </EmptyMedia>
                  <EmptyTitle>No low-stock pools</EmptyTitle>
                  <EmptyDescription>
                    Every tracked pool currently has more than two seats left.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              lowAvailability.map((entry) => (
                <div
                  key={entry.pool._id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.product?.name ?? entry.pool.skuId}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[entry.plan?.name, entry.pool.region]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge
                    variant={entry.available === 0 ? "destructive" : "outline"}
                  >
                    {entry.available} left
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Billing options</CardTitle>
            <CardDescription>
              {filteredSetups.length} matching setup
              {filteredSetups.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSetups.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PackagePlusIcon />
                  </EmptyMedia>
                  <EmptyTitle>No matching billing options</EmptyTitle>
                  <EmptyDescription>
                    Adjust the search or create a new setup from the create
                    page.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredSetups.map((entry) => (
                  <div key={entry.sku._id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {entry.product?.name}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[entry.plan?.name, entry.product?.vendor]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <Badge variant="outline">{entry.sku.billingPeriod}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md border bg-muted/40 px-2 py-1">
                        {formatSkuLabel(entry.sku)}
                      </span>
                      <span className="rounded-md border bg-muted/40 px-2 py-1">
                        {formatPriceLine({
                          ...entry.sku.pricePerUnit,
                          fallbackText: "Pricing unavailable",
                        })}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBillingDialogSkuId(entry.sku._id)}
                        aria-label={`Edit billing for ${entry.product.name} ${entry.plan.name}`}
                      >
                        <PencilRulerIcon data-icon="inline-start" />
                        Edit billing
                      </Button>
                      {entry.pools.length <= 1 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setInventoryDialogTarget({
                              skuId: entry.sku._id,
                              poolId: entry.pools[0]?._id,
                            })
                          }
                          aria-label={`${entry.pools.length > 0 ? "Edit" : "Track"} inventory for ${entry.product.name} ${entry.plan.name}`}
                        >
                          <BoxesIcon data-icon="inline-start" />
                          {entry.pools.length > 0
                            ? "Edit inventory"
                            : "Track stock"}
                        </Button>
                      ) : (
                        <p className="self-center text-xs text-muted-foreground">
                          Use the pool table below to edit each regional stock
                          pool.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Inventory pools</CardTitle>
            <CardDescription>
              {filteredInventoryRows.length} matching pool
              {filteredInventoryRows.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInventoryRows.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BoxesIcon />
                  </EmptyMedia>
                  <EmptyTitle>No matching pools</EmptyTitle>
                  <EmptyDescription>
                    Create a setup with stock or broaden the current search.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setup</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Committed</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventoryRows.map((entry) => (
                    <TableRow key={entry.pool._id}>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {entry.product?.name ?? entry.pool.skuId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {[entry.plan?.name, entry.sku?.code]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{entry.pool.region}</TableCell>
                      <TableCell>{entry.pool.totalQuantity}</TableCell>
                      <TableCell>
                        {entry.pool.reservedQuantity +
                          entry.pool.allocatedQuantity}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.available <= 0
                              ? "destructive"
                              : entry.available <= 2
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {entry.available}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setInventoryDialogTarget({
                              skuId: entry.pool.skuId,
                              poolId: entry.pool._id,
                            })
                          }
                          aria-label={`Edit inventory for ${entry.product?.name ?? entry.pool.skuId} ${entry.pool.region}`}
                        >
                          <PencilRulerIcon data-icon="inline-start" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
                  <TableRow key={entry._id}>
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

      <Dialog
        open={Boolean(activeBillingEntry)}
        onOpenChange={(open) => {
          if (!open) closeBillingDialog();
        }}
      >
        {activeBillingEntry && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit billing</DialogTitle>
              <DialogDescription>
                Update the billing option for {activeBillingEntry.product.name}{" "}
                · {activeBillingEntry.plan.name} using the same fields operators
                see in the create flow.
              </DialogDescription>
            </DialogHeader>

            <BillingDetailsFields
              instanceKey={activeBillingEntry.sku._id}
              billingPeriod={billingPeriod}
              onBillingPeriodChange={(value) =>
                setBillingPeriod(value as Sku["billingPeriod"])
              }
              billingPeriodDescription="This is the main purchase cadence for the billing option."
              region={billingRegion}
              onRegionChange={setBillingRegion}
              regionDescription={
                activeBillingEntry.hasLockedRegion
                  ? "Region is locked after stock or reservation activity exists for this billing option."
                  : "Leave this blank when the offer is not region-specific."
              }
              regionDisabled={activeBillingEntry.hasLockedRegion}
              catalogCode={generatedBillingCode}
              catalogCodeDescription="The code updates automatically from the product, plan, billing period, and region."
              pricePerUnit={billingPricePerUnit}
              onPricePerUnitChange={updateBillingPricePerUnit}
              disabled={loading}
              amountDescription="Keep this in sync with the vendor quote operators should use."
              ratePeriodDescription="Only fill this in when the vendor quote uses a different cadence from the billing period above."
            />

            <DialogFooter showCloseButton>
              <Button
                disabled={!billingHasPricing || !billingChanged || loading}
                onClick={() => {
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
              >
                <PencilRulerIcon data-icon="inline-start" />
                Save billing
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={Boolean(activeInventoryEntry)}
        onOpenChange={(open) => {
          if (!open) closeInventoryDialog();
        }}
      >
        {activeInventoryEntry && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {activeInventoryPool ? "Edit inventory" : "Track stock"}
              </DialogTitle>
              <DialogDescription>
                {activeInventoryPool
                  ? `Adjust the tracked stock for ${activeInventoryEntry.product.name} · ${activeInventoryEntry.plan.name}.`
                  : `Start tracking stock for ${activeInventoryEntry.product.name} · ${activeInventoryEntry.plan.name}.`}
              </DialogDescription>
            </DialogHeader>

            <InventoryStockFields
              quantityLabel={
                activeInventoryPool ? "Stock total" : "Starting stock"
              }
              quantityDescription={
                activeInventoryPool
                  ? "Enter the total stock you want on hand. We will add or remove the difference automatically."
                  : "Enter the stock you want to start tracking for this billing option."
              }
              quantity={inventoryQuantity}
              onQuantityChange={setInventoryQuantity}
              region={activeInventoryRegion}
              regionDescription="Stock follows the billing region when one is set, or falls back to GLOBAL."
              actor={activeInventoryPool ? inventoryActor : undefined}
              onActorChange={
                activeInventoryPool ? setInventoryActor : undefined
              }
              actorDescription="Used only when the stock total changes."
              existingInventory={
                activeInventoryPool
                  ? {
                      totalQuantity: activeInventoryPool.totalQuantity,
                      reservedQuantity: activeInventoryPool.reservedQuantity,
                      allocatedQuantity: activeInventoryPool.allocatedQuantity,
                    }
                  : undefined
              }
              disabled={loading}
            />

            <DialogFooter showCloseButton>
              <Button
                disabled={!inventoryChanged || loading}
                onClick={() => {
                  if (!activeInventoryEntry) return;

                  const work = activeInventoryPool
                    ? () =>
                        api.adjustInventory({
                          skuId: activeInventoryEntry.sku._id,
                          region: activeInventoryRegion,
                          change:
                            inventoryQuantity -
                            activeInventoryPool.totalQuantity,
                          reason:
                            inventoryQuantity >=
                            activeInventoryPool.totalQuantity
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
              >
                <BoxesIcon data-icon="inline-start" />
                {activeInventoryPool ? "Save inventory" : "Track stock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
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
