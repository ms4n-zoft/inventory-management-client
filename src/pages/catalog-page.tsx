import { useCallback, useMemo, useRef, useState } from "react";
import {
  BoxesIcon,
  LoaderCircleIcon,
  PackageIcon,
  PencilRulerIcon,
  SearchIcon,
} from "lucide-react";

import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import { api } from "@/lib/api";
import {
  buildSkuCatalogLookup,
  formatPriceLine,
  formatSkuLabel,
} from "@/lib/catalog";
import {
  buildSkuCode,
  createEmptyPricePerUnit,
  ensureUniqueSkuCode,
  normalizePricePerUnit,
  pricePerUnitFromPlan,
  sameLabel,
  suggestedBillingPeriod,
} from "@/lib/billing-option";
import type { ActionRunner } from "@/components/operations-app";
import { BillingDetailsFields } from "@/components/billing-details-fields";
import { InventoryStockFields } from "@/components/inventory-stock-fields";
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  DashboardSnapshot,
  PricePerUnit,
  Product,
  Region,
  Sku,
} from "@/types";

function planLabel(plan: { plan: string }): string {
  return plan.plan;
}

function slugifySkuPart(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSearchResult(product: Product): ProductSearchResult {
  return {
    id: product.externalId,
    slug: slugifySkuPart(product.name),
    name: product.name,
    vendor: product.vendor,
    description: product.description,
    logoUrl: product.logoUrl,
  };
}

export function CatalogPage({
  snapshot,
  loading,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
}) {
  const formRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductSearchResult | null>(null);
  const [pricingPlans, setPricingPlans] = useState<ProductPricingPlan[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [planName, setPlanName] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState<PricePerUnit>(
    createEmptyPricePerUnit(),
  );
  const [skuRegion, setSkuRegion] = useState("");
  const [skuBillingPeriod, setSkuBillingPeriod] = useState("monthly");
  const [inventoryQuantity, setInventoryQuantity] = useState(0);
  const [inventoryActor, setInventoryActor] = useState("operations");

  const skuCatalog = useMemo(() => buildSkuCatalogLookup(snapshot), [snapshot]);

  const resetPricingSetup = () => {
    setPricingPlans([]);
    setPlanName("");
    setPricePerUnit(createEmptyPricePerUnit());
    setSkuRegion("");
    setSkuBillingPeriod("monthly");
    setInventoryQuantity(0);
    setInventoryActor("operations");
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedProduct(null);
    resetPricingSetup();
    setSearchDone(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchProducts(query.trim());
        setSearchResults(results);
        setSearchDone(true);
      } catch {
        setSearchResults([]);
        setSearchDone(true);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const handleSelectProduct = async (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setSearchResults([]);
    setSearchDone(false);
    resetPricingSetup();

    setLoadingPricing(true);
    try {
      const plans = await api.getProductPricing(product.slug);
      setPricingPlans(plans);
      if (plans.length > 0) {
        const initialPlan = plans[0]!;
        setPlanName(initialPlan.plan);
        setPricePerUnit(pricePerUnitFromPlan(initialPlan));
        const initialBillingPeriod = suggestedBillingPeriod(initialPlan);
        if (initialBillingPeriod) {
          setSkuBillingPeriod(initialBillingPeriod);
        }
      }
    } finally {
      setLoadingPricing(false);
    }
  };

  const handlePlanNameChange = (nextPlanName: string) => {
    setPlanName(nextPlanName);

    const matchedPlan = pricingPlans.find((plan) =>
      sameLabel(plan.plan, nextPlanName),
    );
    if (matchedPlan) {
      setPricePerUnit(pricePerUnitFromPlan(matchedPlan));
      const nextBillingPeriod = suggestedBillingPeriod(matchedPlan);
      if (nextBillingPeriod) {
        setSkuBillingPeriod(nextBillingPeriod);
      }
      return;
    }

    setPricePerUnit(createEmptyPricePerUnit());
  };

  const handleEditExistingSetup = (skuId: string) => {
    const catalogEntry = skuCatalog.get(skuId);
    if (!catalogEntry?.product || !catalogEntry.plan) return;

    const matchingPool = snapshot.inventoryPools.find(
      (pool) => pool.skuId === skuId,
    );

    setSelectedProduct(toSearchResult(catalogEntry.product));
    setSearchQuery(catalogEntry.product.name);
    setSearchResults([]);
    setSearchDone(false);
    setSearching(false);
    setLoadingPricing(false);
    setPricingPlans([]);
    setPlanName(catalogEntry.plan.name);
    setPricePerUnit(catalogEntry.sku.pricePerUnit ?? createEmptyPricePerUnit());
    setSkuRegion(catalogEntry.sku.region ?? "");
    setSkuBillingPeriod(catalogEntry.sku.billingPeriod);
    setInventoryQuantity(matchingPool?.totalQuantity ?? 0);
    setInventoryActor("operations");

    requestAnimationFrame(() => {
      if (typeof formRef.current?.scrollIntoView === "function") {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const updatePricePerUnit = (field: keyof PricePerUnit, value: string) => {
    setPricePerUnit((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchDone(false);
    setSelectedProduct(null);
    resetPricingSetup();
  };

  const normalizedPlanName = planName.trim();
  const normalizedRegion = skuRegion.trim()
    ? (skuRegion.trim().toUpperCase() as Region)
    : undefined;
  const inventoryRegion = (normalizedRegion ?? "GLOBAL") as Region;

  const selectedPricingPlan = pricingPlans.find((plan) =>
    sameLabel(plan.plan, planName),
  );

  const existingProduct = selectedProduct
    ? snapshot.products.find(
        (product) => product.externalId === selectedProduct.id,
      )
    : undefined;

  const existingPlan = existingProduct
    ? snapshot.plans.find(
        (plan) =>
          plan.productId === existingProduct._id &&
          sameLabel(plan.name, normalizedPlanName),
      )
    : undefined;

  const existingSku = existingPlan
    ? snapshot.skus.find(
        (sku) =>
          sku.planId === existingPlan._id &&
          sku.billingPeriod === skuBillingPeriod &&
          (sku.region ?? undefined) === normalizedRegion,
      )
    : undefined;

  const existingInventoryPool = existingSku
    ? snapshot.inventoryPools.find(
        (pool) =>
          pool.skuId === existingSku._id && pool.region === inventoryRegion,
      )
    : undefined;

  const generatedSkuCode = useMemo(() => {
    const baseCode = buildSkuCode({
      productName: selectedProduct?.name,
      planName: normalizedPlanName,
      billingPeriod: skuBillingPeriod,
      region: normalizedRegion,
    });

    if (!baseCode) return "";
    if (existingSku) return existingSku.code;

    return ensureUniqueSkuCode(
      baseCode,
      new Set(snapshot.skus.map((sku) => sku.code)),
    );
  }, [
    existingSku,
    normalizedPlanName,
    normalizedRegion,
    selectedProduct?.name,
    skuBillingPeriod,
    snapshot.skus,
  ]);

  const recentSetups = useMemo(
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

          return {
            sku,
            plan: catalogEntry?.plan,
            product: catalogEntry?.product,
            pools,
            trackedQuantity,
          };
        })
        .filter((entry) => entry.plan && entry.product)
        .slice(0, 6),
    [skuCatalog, snapshot.inventoryPools, snapshot.skus],
  );

  const hasPricing =
    pricePerUnit.amount.trim().length > 0 &&
    pricePerUnit.currency.trim().length > 0;
  const detailsReady =
    Boolean(selectedProduct) && normalizedPlanName.length >= 2;
  const canCreateBillingOption =
    detailsReady &&
    generatedSkuCode.trim().length >= 3 &&
    hasPricing &&
    !loadingPricing &&
    !existingSku;

  const inventoryWillCreate = inventoryQuantity > 0 && !existingInventoryPool;
  const existingInventoryTotal = existingInventoryPool?.totalQuantity ?? 0;
  const inventoryWillAdjust =
    existingInventoryPool !== undefined &&
    inventoryQuantity !== existingInventoryTotal;
  const inventoryDelta = existingInventoryPool
    ? inventoryQuantity - existingInventoryTotal
    : 0;
  const inventoryActionNeeded = inventoryWillCreate || inventoryWillAdjust;
  const canSubmit =
    !loading && (canCreateBillingOption || inventoryActionNeeded);

  const submitLabel = existingSku
    ? inventoryWillAdjust
      ? "Update stock"
      : inventoryWillCreate
        ? "Start tracking stock"
        : "Save setup"
    : inventoryQuantity > 0
      ? "Save and track stock"
      : "Save setup";

  const saveMessage = !detailsReady
    ? "Pick a product and plan first, then confirm the billing details and starting stock."
    : existingSku
      ? existingInventoryPool
        ? inventoryWillAdjust
          ? `Saving will update tracked stock from ${existingInventoryPool.totalQuantity} to ${inventoryQuantity} in ${inventoryRegion}.`
          : "This billing option already exists. Change the stock total below or adjust the billing details to create another option."
        : inventoryQuantity > 0
          ? `Saving will start tracking ${inventoryQuantity} seats in ${inventoryRegion} for this existing billing option.`
          : "This billing option already exists. Enter a starting stock to begin tracking inventory here."
      : inventoryQuantity > 0
        ? `Saving will create the billing option and start tracking ${inventoryQuantity} seats in ${inventoryRegion}.`
        : existingProduct
          ? "Saving will reuse the product already in your catalog and add this billing option."
          : "Saving will create the billing option now. You can leave stock at 0 and track inventory later.";

  const successMessage = existingSku
    ? inventoryWillAdjust
      ? "Stock level updated."
      : "Inventory tracking started."
    : inventoryQuantity > 0
      ? "Billing option and starting stock created."
      : "Billing option created.";

  return (
    <div ref={formRef} className="grid gap-4 xl:grid-cols-2">
      <Card className="shadow-none xl:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-muted">
              <BoxesIcon />
            </div>
            <div>
              <CardTitle>Create product setup</CardTitle>
              <CardDescription>
                Add the billing option and starting stock together so operators
                only need one creation flow.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!detailsReady || !canSubmit) return;

              const normalizedPrice = normalizePricePerUnit(pricePerUnit);

              void runAction(async () => {
                let nextSku = existingSku;

                if (!existingSku) {
                  if (!selectedProduct) {
                    throw new Error("product selection is required");
                  }

                  if (!existingProduct) {
                    const created = await api.addCatalogEntry({
                      product: {
                        externalId: selectedProduct.id,
                        name: selectedProduct.name,
                        vendor: selectedProduct.vendor,
                        description: selectedProduct.description,
                        logoUrl: selectedProduct.logoUrl,
                      },
                      plan: {
                        name: normalizedPlanName,
                        planType: "standard",
                      },
                      sku: {
                        code: generatedSkuCode,
                        billingPeriod: skuBillingPeriod as Sku["billingPeriod"],
                        region: normalizedRegion,
                        seatType: "seat",
                        pricePerUnit: normalizedPrice,
                      },
                    });

                    nextSku = created.sku;
                  } else {
                    const plan =
                      existingPlan ??
                      (await api.createPlan({
                        productId: existingProduct._id,
                        name: normalizedPlanName,
                        planType: "standard",
                      }));

                    nextSku = await api.createSku({
                      planId: plan._id,
                      code: generatedSkuCode,
                      billingPeriod: skuBillingPeriod as Sku["billingPeriod"],
                      region: normalizedRegion,
                      seatType: "seat",
                      pricePerUnit: normalizedPrice,
                    });
                  }
                }

                if (!nextSku) return;

                if (inventoryWillCreate) {
                  await api.createInventoryPool({
                    skuId: nextSku._id,
                    region: inventoryRegion,
                    totalQuantity: inventoryQuantity,
                  });
                  return;
                }

                if (inventoryWillAdjust) {
                  await api.adjustInventory({
                    skuId: nextSku._id,
                    region: inventoryRegion,
                    change: inventoryDelta,
                    reason:
                      inventoryDelta >= 0 ? "MANUAL_ADD" : "MANUAL_REMOVE",
                    actor: inventoryActor.trim() || "operations",
                  });
                }
              }, successMessage).then((ok) => {
                if (ok) resetForm();
              });
            }}
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <section className="rounded-xl border p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <SearchIcon className="mr-1 inline-block size-3.5" />
                      Pick product and plan
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Search for the product first, then pick a suggested plan
                      or type a new one.
                    </p>
                  </div>
                </div>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Search products</FieldLabel>
                    <div className="relative">
                      <Input
                        value={searchQuery}
                        onChange={(event) => handleSearch(event.target.value)}
                        placeholder="e.g. mailchimp, twilio, zoho"
                      />
                      {searching && (
                        <LoaderCircleIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <FieldDescription>
                      Type at least 2 characters to search.
                    </FieldDescription>
                  </Field>

                  {!selectedProduct &&
                    searchDone &&
                    searchResults.length === 0 && (
                      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                        No products found for &ldquo;{searchQuery}&rdquo;. Try a
                        different name.
                      </p>
                    )}

                  {searchResults.length > 0 && !selectedProduct && (
                    <div className="flex flex-col gap-1.5 rounded-lg border p-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          onClick={() => void handleSelectProduct(result)}
                        >
                          {result.logoUrl ? (
                            <img
                              src={result.logoUrl}
                              alt=""
                              className="size-8 shrink-0 rounded-md object-contain"
                            />
                          ) : (
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                              {result.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {result.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {result.vendor}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedProduct && (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-3">
                      {selectedProduct.logoUrl ? (
                        <img
                          src={selectedProduct.logoUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-md object-contain"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                          {selectedProduct.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {selectedProduct.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {selectedProduct.vendor}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(null);
                          setSearchQuery("");
                          resetPricingSetup();
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  )}

                  <Field>
                    <FieldLabel>Plan</FieldLabel>
                    {loadingPricing ? (
                      <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Loading plans…
                      </div>
                    ) : pricingPlans.length > 0 ? (
                      <div className="space-y-3">
                        <div
                          role="radiogroup"
                          aria-label="Plan options"
                          className="grid gap-3 md:grid-cols-2"
                        >
                          {pricingPlans.map((plan) => {
                            const checked = sameLabel(plan.plan, planName);

                            return (
                              <label
                                key={plan.plan}
                                className={[
                                  "flex cursor-pointer rounded-xl border p-4 transition-colors",
                                  checked
                                    ? "border-foreground bg-muted/40"
                                    : "hover:bg-muted/20",
                                ].join(" ")}
                              >
                                <input
                                  type="radio"
                                  name="plan-option"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={() =>
                                    handlePlanNameChange(plan.plan)
                                  }
                                />
                                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">
                                      {planLabel(plan)}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {formatPriceLine(plan)}
                                    </p>
                                  </div>
                                  <span
                                    aria-hidden="true"
                                    className={[
                                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                      checked
                                        ? "border-foreground bg-foreground"
                                        : "border-muted-foreground/40",
                                    ].join(" ")}
                                  >
                                    <span
                                      className={[
                                        "size-2 rounded-full",
                                        checked
                                          ? "bg-background"
                                          : "bg-transparent",
                                      ].join(" ")}
                                    />
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        <Input
                          value={selectedPricingPlan ? "" : planName}
                          onChange={(event) =>
                            handlePlanNameChange(event.target.value)
                          }
                          placeholder="Or type a different plan name"
                          disabled={!selectedProduct}
                        />
                      </div>
                    ) : (
                      <Input
                        value={planName}
                        onChange={(event) =>
                          handlePlanNameChange(event.target.value)
                        }
                        placeholder="e.g. Standard"
                        disabled={!selectedProduct}
                      />
                    )}
                    <FieldDescription>
                      {selectedPricingPlan
                        ? `Selected quote: ${formatPriceLine(selectedPricingPlan)}. You can still adjust it before saving.`
                        : selectedProduct
                          ? pricingPlans.length > 0
                            ? "Pick one of the plan cards above or type a different plan name below."
                            : "Type a new plan name to unlock the next steps."
                          : "Choose a product first to fetch plan suggestions."}
                    </FieldDescription>
                  </Field>

                  {existingProduct && (
                    <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                      This product already exists in your catalog. We will reuse
                      it automatically instead of creating a duplicate.
                    </p>
                  )}
                </FieldGroup>
              </section>

              <section className="rounded-xl border p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <PackageIcon className="mr-1 inline-block size-3.5" />
                      Review billing details
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We generate the code automatically so operators only need
                      to confirm the commercial details.
                    </p>
                  </div>
                </div>

                {selectedProduct ? (
                  <FieldGroup>
                    <BillingDetailsFields
                      instanceKey={selectedProduct.id}
                      billingPeriod={skuBillingPeriod}
                      onBillingPeriodChange={setSkuBillingPeriod}
                      billingPeriodDescription="This is the main purchase cadence for the billing option."
                      region={skuRegion}
                      onRegionChange={setSkuRegion}
                      regionDescription="Leave this blank when the offer is not region-specific."
                      catalogCode={generatedSkuCode}
                      catalogCodeDescription={
                        existingSku
                          ? "This exact billing option already exists, so the code is locked to the existing record."
                          : generatedSkuCode
                            ? "Generated from the product, plan, billing period, and region when present."
                            : "Choose a plan in step 1 to generate the catalog code."
                      }
                      pricePerUnit={pricePerUnit}
                      onPricePerUnitChange={updatePricePerUnit}
                      disabled={!detailsReady || loadingPricing}
                      amountDescription="Required when you are creating a new billing option."
                      ratePeriodDescription="Only fill this in when the vendor quote uses a different cadence from the billing period above."
                    />
                  </FieldGroup>
                ) : (
                  <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    Choose a product and plan in step 1 to fill in the billing
                    details here.
                  </p>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
              <section className="rounded-xl border p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <BoxesIcon className="mr-1 inline-block size-3.5" />
                      Set starting stock
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You can track inventory immediately here, or leave stock
                      at 0 and come back later.
                    </p>
                  </div>
                </div>

                {detailsReady ? (
                  <FieldGroup>
                    <InventoryStockFields
                      quantityLabel={
                        existingInventoryPool ? "Stock total" : "Starting stock"
                      }
                      quantityDescription={
                        existingInventoryPool
                          ? "Enter the total stock you want on hand. We will add or remove the difference automatically."
                          : "Leave 0 if you want to save the billing option first and track stock later."
                      }
                      quantity={inventoryQuantity}
                      onQuantityChange={setInventoryQuantity}
                      region={inventoryRegion}
                      regionDescription="Stock follows the billing region when one is set, or falls back to GLOBAL."
                      actor={existingInventoryPool ? inventoryActor : undefined}
                      onActorChange={
                        existingInventoryPool ? setInventoryActor : undefined
                      }
                      actorDescription="Used only when the stock total changes."
                      existingInventory={
                        existingInventoryPool
                          ? {
                              totalQuantity:
                                existingInventoryPool.totalQuantity,
                              reservedQuantity:
                                existingInventoryPool.reservedQuantity,
                              allocatedQuantity:
                                existingInventoryPool.allocatedQuantity,
                            }
                          : undefined
                      }
                    />
                  </FieldGroup>
                ) : (
                  <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    Choose the billing option first, then decide whether you
                    want to start tracking stock immediately.
                  </p>
                )}
              </section>

              <aside className="rounded-xl border bg-muted/20 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Review
                </h3>
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border bg-background px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Setup
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedProduct?.name ?? "Choose a product"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {normalizedPlanName || "Plan not selected yet"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {skuBillingPeriod || "billing period"}
                    </Badge>
                    <Badge variant="outline">{inventoryRegion}</Badge>
                    {existingSku && (
                      <Badge variant="secondary">existing setup</Badge>
                    )}
                  </div>

                  <div className="rounded-lg border bg-background px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Code
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {generatedSkuCode || "Generated automatically"}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">{saveMessage}</p>
                </div>
              </aside>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{saveMessage}</p>
              <Button disabled={!canSubmit}>
                {existingSku && inventoryActionNeeded ? (
                  <PencilRulerIcon data-icon="inline-start" />
                ) : (
                  <BoxesIcon data-icon="inline-start" />
                )}
                {submitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-none xl:col-span-2">
        <CardHeader>
          <CardTitle>Continue from an existing setup</CardTitle>
          <CardDescription>
            Load a recent billing option back into the create flow to top up
            stock or branch a new variant without retyping everything.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSetups.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageIcon />
                </EmptyMedia>
                <EmptyTitle>No setups yet</EmptyTitle>
                <EmptyDescription>
                  Your first billing option will appear here once you save it.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {recentSetups.map((entry) => (
                <div key={entry.sku._id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {entry.product?.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {entry.plan?.name}
                      </p>
                    </div>
                    <Badge variant="outline">{entry.sku.billingPeriod}</Badge>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{formatSkuLabel(entry.sku)}</p>
                    <p>
                      {formatPriceLine({
                        ...entry.sku.pricePerUnit,
                        fallbackText: "Pricing unavailable",
                      })}
                    </p>
                    <p>
                      {entry.pools.length > 0
                        ? `${entry.trackedQuantity} tracked across ${entry.pools.length} pool${entry.pools.length === 1 ? "" : "s"}`
                        : "No stock tracked yet"}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      variant={
                        existingSku?._id === entry.sku._id
                          ? "secondary"
                          : "outline"
                      }
                      onClick={() => handleEditExistingSetup(entry.sku._id)}
                    >
                      <PencilRulerIcon data-icon="inline-start" />
                      {existingSku?._id === entry.sku._id
                        ? "Editing"
                        : "Edit setup"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
