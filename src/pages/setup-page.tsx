import { useCallback, useMemo, useRef, useState } from "react";
import { BoxesIcon, PencilRulerIcon } from "lucide-react";

import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import { api } from "@/lib/api";
import { buildSkuCatalogLookup } from "@/lib/catalog";
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
import { BillingStep } from "@/components/setup-page/billing-step";
import { ProductPlanStep } from "@/components/setup-page/product-plan-step";
import { RecentSetupsPanel } from "@/components/setup-page/recent-setups-panel";
import { SetupReviewPanel } from "@/components/setup-page/setup-review-panel";
import { StockStep } from "@/components/setup-page/stock-step";
import type { RecentSetupEntry } from "@/components/setup-page/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardSnapshot,
  PricePerUnit,
  Product,
  Region,
  Sku,
} from "@/types";

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

export function SetupPage({
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

  const recentSetups = useMemo<RecentSetupEntry[]>(
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
        .filter((entry): entry is RecentSetupEntry =>
          Boolean(entry.plan && entry.product),
        )
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
          : "Saving will create the billing option now. You can leave stock at 0 and track stock later.";

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
              <ProductPlanStep
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                searching={searching}
                searchDone={searchDone}
                searchResults={searchResults}
                selectedProduct={selectedProduct}
                onSelectProduct={(product) => {
                  void handleSelectProduct(product);
                }}
                onClearProduct={() => {
                  setSelectedProduct(null);
                  setSearchQuery("");
                  resetPricingSetup();
                }}
                loadingPricing={loadingPricing}
                pricingPlans={pricingPlans}
                planName={planName}
                onPlanNameChange={handlePlanNameChange}
                selectedPricingPlan={selectedPricingPlan}
                existingProduct={existingProduct}
              />

              <BillingStep
                selectedProduct={selectedProduct}
                detailsReady={detailsReady}
                loadingPricing={loadingPricing}
                existingSku={existingSku}
                generatedSkuCode={generatedSkuCode}
                skuBillingPeriod={skuBillingPeriod}
                onSkuBillingPeriodChange={setSkuBillingPeriod}
                skuRegion={skuRegion}
                onSkuRegionChange={setSkuRegion}
                pricePerUnit={pricePerUnit}
                onPricePerUnitChange={updatePricePerUnit}
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
              <StockStep
                detailsReady={detailsReady}
                existingInventoryPool={existingInventoryPool}
                inventoryQuantity={inventoryQuantity}
                onInventoryQuantityChange={setInventoryQuantity}
                inventoryRegion={inventoryRegion}
                inventoryActor={inventoryActor}
                onInventoryActorChange={setInventoryActor}
              />

              <SetupReviewPanel
                selectedProductName={selectedProduct?.name}
                planName={normalizedPlanName}
                billingPeriod={skuBillingPeriod}
                inventoryRegion={inventoryRegion}
                existingSku={existingSku}
                generatedSkuCode={generatedSkuCode}
                saveMessage={saveMessage}
              />
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

      <RecentSetupsPanel
        entries={recentSetups}
        editingSkuId={existingSku?._id}
        onEditSetup={handleEditExistingSetup}
      />
    </div>
  );
}
