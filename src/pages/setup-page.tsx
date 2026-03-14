import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoxesIcon, PencilRulerIcon } from "lucide-react";

import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import { api } from "@/lib/api";
import { buildSkuCatalogLookup } from "@/lib/catalog";
import {
  billingCyclesFromPricingOptions,
  buildPricingOptionsFromDetails,
  buildPurchaseConstraints,
  buildSkuCode,
  createEmptyPricingDetails,
  ensureUniqueSkuCode,
  hasValidPurchaseConstraints,
  normalizePricingOptions,
  orderRegions,
  pricePerUnitFromPlan,
  pricingDetailsFromPricingOptions,
  purchaseConstraintsToFormValues,
  sameLabel,
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
  BillingCycle,
  DashboardSnapshot,
  InventoryPool,
  PricePerUnit,
  PricingDetails,
  Product,
  PurchaseConstraints,
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

function hasValidPricingOptions(pricingOptions: PricePerUnit[]): boolean {
  if (pricingOptions.length === 0) return false;

  const uniqueBillingCycles = new Set(
    pricingOptions.map((pricingOption) => pricingOption.billingCycle),
  );

  return (
    uniqueBillingCycles.size === pricingOptions.length &&
    pricingOptions.every(
      (pricingOption) =>
        pricingOption.amount.trim().length > 0 &&
        pricingOption.currency.trim().length > 0,
    )
  );
}

const defaultInventoryActor = "operations";

type RegionDraft = {
  billingCycles: BillingCycle[];
  pricingDetails: PricingDetails;
  minimumUnits: string;
  maximumUnits: string;
  activationTimeline: string;
  inventoryQuantity: number;
  inventoryActor: string;
};

type RegionEntry = {
  region: Region;
  draft: RegionDraft;
  pricingOptions: PricePerUnit[];
  normalizedPricingOptions: PricePerUnit[];
  purchaseConstraints?: PurchaseConstraints;
  normalizedActivationTimeline?: string;
  existingSku?: Sku;
  existingInventoryPool?: InventoryPool;
  generatedSkuCode: string;
  offerReady: boolean;
  offerChanged: boolean;
  offerActionNeeded: boolean;
  offerBlocked: boolean;
  inventoryWillCreate: boolean;
  inventoryWillAdjust: boolean;
  inventoryDelta: number;
  inventoryActionNeeded: boolean;
};

function createRegionDraft(pricingOption?: PricePerUnit): RegionDraft {
  return {
    billingCycles: pricingOption
      ? billingCyclesFromPricingOptions([pricingOption])
      : ["monthly"],
    pricingDetails: pricingOption
      ? pricingDetailsFromPricingOptions([pricingOption])
      : createEmptyPricingDetails(),
    minimumUnits: "",
    maximumUnits: "",
    activationTimeline: "",
    inventoryQuantity: 0,
    inventoryActor: defaultInventoryActor,
  };
}

function cloneRegionDraft(source: RegionDraft): RegionDraft {
  return {
    billingCycles: [...source.billingCycles],
    pricingDetails: { ...source.pricingDetails },
    minimumUnits: source.minimumUnits,
    maximumUnits: source.maximumUnits,
    activationTimeline: source.activationTimeline,
    inventoryQuantity: 0,
    inventoryActor: defaultInventoryActor,
  };
}

function regionDraftFromExisting(
  sku: Sku,
  inventoryQuantity: number,
): RegionDraft {
  const purchaseConstraintValues = purchaseConstraintsToFormValues(
    sku.purchaseConstraints,
  );

  return {
    billingCycles: billingCyclesFromPricingOptions(sku.pricingOptions),
    pricingDetails: pricingDetailsFromPricingOptions(sku.pricingOptions),
    minimumUnits: purchaseConstraintValues.minUnits,
    maximumUnits: purchaseConstraintValues.maxUnits,
    activationTimeline: sku.activationTimeline ?? "",
    inventoryQuantity,
    inventoryActor: defaultInventoryActor,
  };
}

function samePricingOptions(
  left: PricePerUnit[],
  right: PricePerUnit[],
): boolean {
  return (
    JSON.stringify(normalizePricingOptions(left)) ===
    JSON.stringify(normalizePricingOptions(right))
  );
}

function samePurchaseConstraints(
  left?: PurchaseConstraints,
  right?: PurchaseConstraints,
): boolean {
  return (
    (left?.minUnits ?? null) === (right?.minUnits ?? null) &&
    (left?.maxUnits ?? null) === (right?.maxUnits ?? null)
  );
}

function joinValues(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0]!;
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
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
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [activeRegion, setActiveRegion] = useState<Region | undefined>();
  const [regionDrafts, setRegionDrafts] = useState<
    Partial<Record<Region, RegionDraft>>
  >({});

  const skuCatalog = useMemo(() => buildSkuCatalogLookup(snapshot), [snapshot]);

  const pricingSeedFromPlanName = (nextPlanName: string) => {
    const matchedPlan = pricingPlans.find((plan) =>
      sameLabel(plan.plan, nextPlanName),
    );

    return matchedPlan ? pricePerUnitFromPlan(matchedPlan) : undefined;
  };

  const updateSelectedRegionsPricing = (pricingOption?: PricePerUnit) => {
    const nextBillingCycles: BillingCycle[] = pricingOption
      ? billingCyclesFromPricingOptions([pricingOption])
      : ["monthly"];
    const nextPricingDetails = pricingOption
      ? pricingDetailsFromPricingOptions([pricingOption])
      : createEmptyPricingDetails();

    setRegionDrafts((current) => {
      const next = { ...current };

      for (const region of selectedRegions) {
        const currentDraft = next[region] ?? createRegionDraft(pricingOption);

        next[region] = {
          ...currentDraft,
          billingCycles: [...nextBillingCycles],
          pricingDetails: { ...nextPricingDetails },
        };
      }

      return next;
    });
  };

  const resetPricingSetup = () => {
    setPricingPlans([]);
    setPlanName("");
    setSelectedRegions([]);
    setActiveRegion(undefined);
    setRegionDrafts({});
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
      }
    } finally {
      setLoadingPricing(false);
    }
  };

  const handlePlanNameChange = (nextPlanName: string) => {
    setPlanName(nextPlanName);

    updateSelectedRegionsPricing(pricingSeedFromPlanName(nextPlanName));
  };

  const selectedPricingPlan = useMemo(
    () => pricingPlans.find((plan) => sameLabel(plan.plan, planName)),
    [planName, pricingPlans],
  );

  const handleSelectedRegionsChange = (nextRegions: Region[]) => {
    const orderedNextRegions = orderRegions(nextRegions);
    const addedRegion = orderedNextRegions.find(
      (region) => !selectedRegions.includes(region),
    );
    const activeDraft = activeRegion ? regionDrafts[activeRegion] : undefined;
    const pricingSeed = pricingSeedFromPlanName(planName);

    setRegionDrafts((current) => {
      const next: Partial<Record<Region, RegionDraft>> = {};

      for (const region of orderedNextRegions) {
        next[region] =
          current[region] ??
          (activeDraft
            ? cloneRegionDraft(activeDraft)
            : createRegionDraft(pricingSeed));
      }

      return next;
    });

    setSelectedRegions(orderedNextRegions);

    if (addedRegion) {
      setActiveRegion(addedRegion);
      return;
    }

    if (orderedNextRegions.length === 0) {
      setActiveRegion(undefined);
      return;
    }

    if (!activeRegion || !orderedNextRegions.includes(activeRegion)) {
      setActiveRegion(orderedNextRegions[0]);
    }
  };

  useEffect(() => {
    if (selectedRegions.length === 0) {
      if (activeRegion) setActiveRegion(undefined);
      return;
    }

    if (!activeRegion || !selectedRegions.includes(activeRegion)) {
      setActiveRegion(selectedRegions[0]);
    }
  }, [activeRegion, selectedRegions]);

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
    setSelectedRegions([catalogEntry.sku.region]);
    setActiveRegion(catalogEntry.sku.region);
    setRegionDrafts({
      [catalogEntry.sku.region]: regionDraftFromExisting(
        catalogEntry.sku,
        matchingPool?.totalQuantity ?? 0,
      ),
    });

    requestAnimationFrame(() => {
      if (typeof formRef.current?.scrollIntoView === "function") {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const updatePricingDetails = (field: keyof PricingDetails, value: string) => {
    if (!activeRegion) return;

    const pricingSeed = pricingSeedFromPlanName(planName);

    setRegionDrafts((current) => {
      const activeDraft =
        current[activeRegion] ?? createRegionDraft(pricingSeed);

      return {
        ...current,
        [activeRegion]: {
          ...activeDraft,
          pricingDetails: {
            ...activeDraft.pricingDetails,
            [field]: value,
          },
        },
      };
    });
  };

  const updateActiveRegionDraft = (
    updater: (draft: RegionDraft) => RegionDraft,
  ) => {
    if (!activeRegion) return;

    const pricingSeed = pricingSeedFromPlanName(planName);

    setRegionDrafts((current) => ({
      ...current,
      [activeRegion]: updater(
        current[activeRegion] ?? createRegionDraft(pricingSeed),
      ),
    }));
  };

  const updateBillingCycles = (value: BillingCycle[]) => {
    updateActiveRegionDraft((draft) => ({
      ...draft,
      billingCycles: value,
    }));
  };

  const updateMinimumUnits = (value: string) => {
    updateActiveRegionDraft((draft) => ({
      ...draft,
      minimumUnits: value,
    }));
  };

  const updateMaximumUnits = (value: string) => {
    updateActiveRegionDraft((draft) => ({
      ...draft,
      maximumUnits: value,
    }));
  };

  const updateActivationTimeline = (value: string) => {
    updateActiveRegionDraft((draft) => ({
      ...draft,
      activationTimeline: value,
    }));
  };

  const updateInventoryQuantity = (value: number) => {
    updateActiveRegionDraft((draft) => ({
      ...draft,
      inventoryQuantity: value,
    }));
  };

  const updateInventoryActor = (value: string) => {
    updateActiveRegionDraft((draft) => ({
      ...draft,
      inventoryActor: value,
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

  const existingSkuCodes = useMemo(
    () => new Set(snapshot.skus.map((sku) => sku.code)),
    [snapshot.skus],
  );

  const productPlanReady =
    Boolean(selectedProduct) && normalizedPlanName.length >= 2;

  const regionEntries = useMemo<RegionEntry[]>(() => {
    const pricingSeed = pricingSeedFromPlanName(planName);

    return selectedRegions.map((region) => {
      const draft = regionDrafts[region] ?? createRegionDraft(pricingSeed);
      const existingSku = existingPlan
        ? snapshot.skus.find(
            (sku) => sku.planId === existingPlan._id && sku.region === region,
          )
        : undefined;
      const existingInventoryPool = existingSku
        ? snapshot.inventoryPools.find((pool) => pool.skuId === existingSku._id)
        : undefined;
      const pricingOptions = buildPricingOptionsFromDetails({
        billingCycles: draft.billingCycles,
        pricingDetails: draft.pricingDetails,
      });
      const normalizedPricingOptions = normalizePricingOptions(pricingOptions);
      const purchaseConstraints = buildPurchaseConstraints({
        minUnits: draft.minimumUnits,
        maxUnits: draft.maximumUnits,
      });
      const normalizedActivationTimeline =
        draft.activationTimeline.trim() || undefined;
      const baseCode = buildSkuCode({
        productName: selectedProduct?.name,
        planName: normalizedPlanName,
        region,
      });
      const generatedSkuCode = !baseCode
        ? ""
        : existingSku
          ? existingSku.code
          : ensureUniqueSkuCode(baseCode, existingSkuCodes);
      const hasPricing = hasValidPricingOptions(normalizedPricingOptions);
      const hasValidConstraints = hasValidPurchaseConstraints({
        minUnits: draft.minimumUnits,
        maxUnits: draft.maximumUnits,
      });
      const offerReady =
        productPlanReady &&
        generatedSkuCode.trim().length >= 3 &&
        hasPricing &&
        hasValidConstraints &&
        !loadingPricing;
      const offerChanged = existingSku
        ? generatedSkuCode !== existingSku.code ||
          !samePricingOptions(
            normalizedPricingOptions,
            existingSku.pricingOptions,
          ) ||
          !samePurchaseConstraints(
            purchaseConstraints,
            existingSku.purchaseConstraints,
          ) ||
          normalizedActivationTimeline !== existingSku.activationTimeline
        : false;
      const offerActionNeeded = existingSku
        ? offerReady && offerChanged
        : offerReady;
      const offerBlocked = existingSku
        ? offerChanged && !offerReady
        : !offerReady;
      const existingInventoryTotal = existingInventoryPool?.totalQuantity ?? 0;
      const inventoryWillCreate =
        draft.inventoryQuantity > 0 && !existingInventoryPool;
      const inventoryWillAdjust =
        existingInventoryPool !== undefined &&
        draft.inventoryQuantity !== existingInventoryTotal;
      const inventoryDelta = existingInventoryPool
        ? draft.inventoryQuantity - existingInventoryTotal
        : 0;

      return {
        region,
        draft,
        pricingOptions,
        normalizedPricingOptions,
        purchaseConstraints,
        normalizedActivationTimeline,
        existingSku,
        existingInventoryPool,
        generatedSkuCode,
        offerReady,
        offerChanged,
        offerActionNeeded,
        offerBlocked,
        inventoryWillCreate,
        inventoryWillAdjust,
        inventoryDelta,
        inventoryActionNeeded: inventoryWillCreate || inventoryWillAdjust,
      };
    });
  }, [
    existingPlan,
    existingSkuCodes,
    loadingPricing,
    normalizedPlanName,
    planName,
    productPlanReady,
    regionDrafts,
    selectedProduct?.name,
    selectedRegions,
    snapshot.inventoryPools,
    snapshot.skus,
  ]);

  const activeRegionValue =
    activeRegion && selectedRegions.includes(activeRegion)
      ? activeRegion
      : selectedRegions[0];

  const activeRegionEntry =
    regionEntries.find((entry) => entry.region === activeRegionValue) ??
    undefined;

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

  const blockingRegions = regionEntries
    .filter((entry) => entry.offerBlocked)
    .map((entry) => entry.region);
  const createOfferCount = regionEntries.filter(
    (entry) => entry.offerActionNeeded && !entry.existingSku,
  ).length;
  const updateOfferCount = regionEntries.filter(
    (entry) => entry.offerActionNeeded && entry.existingSku,
  ).length;
  const startTrackingCount = regionEntries.filter(
    (entry) => entry.inventoryWillCreate,
  ).length;
  const adjustStockCount = regionEntries.filter(
    (entry) => entry.inventoryWillAdjust,
  ).length;
  const hasPendingChanges = regionEntries.some(
    (entry) => entry.offerActionNeeded || entry.inventoryActionNeeded,
  );
  const canSubmit =
    !loading &&
    productPlanReady &&
    selectedRegions.length > 0 &&
    blockingRegions.length === 0 &&
    hasPendingChanges;

  const submitLabel =
    selectedRegions.length > 1
      ? "Save selected regions"
      : createOfferCount === 0 &&
          updateOfferCount === 0 &&
          adjustStockCount === 1
        ? "Update stock"
        : createOfferCount === 0 &&
            updateOfferCount === 0 &&
            startTrackingCount === 1
          ? "Start tracking stock"
          : startTrackingCount > 0
            ? "Save and track stock"
            : updateOfferCount > 0
              ? "Update offer"
              : "Save setup";

  const actionPhrases: string[] = [];
  if (createOfferCount > 0) {
    actionPhrases.push(
      `create ${createOfferCount} new regional ${createOfferCount === 1 ? "offer" : "offers"}`,
    );
  }
  if (updateOfferCount > 0) {
    actionPhrases.push(
      `update ${updateOfferCount} existing regional ${updateOfferCount === 1 ? "offer" : "offers"}`,
    );
  }
  if (startTrackingCount > 0) {
    actionPhrases.push(
      `start tracking stock in ${startTrackingCount} ${startTrackingCount === 1 ? "region" : "regions"}`,
    );
  }
  if (adjustStockCount > 0) {
    actionPhrases.push(
      `adjust stock in ${adjustStockCount} ${adjustStockCount === 1 ? "region" : "regions"}`,
    );
  }

  const saveMessage = !productPlanReady
    ? "Pick a product and plan first, then select one or more regions."
    : selectedRegions.length === 0
      ? "Select at least one region to open its offer tab."
      : blockingRegions.length > 0
        ? `Complete the ${joinValues(blockingRegions)} ${blockingRegions.length === 1 ? "tab" : "tabs"} before saving.`
        : !hasPendingChanges
          ? activeRegionEntry?.existingSku
            ? "This regional offer is already saved. Update pricing, constraints, activation, or stock to make changes."
            : "No changes to save yet."
          : `Saving will ${joinValues(actionPhrases)}.`;

  const successMessage =
    createOfferCount + updateOfferCount > 0 &&
    startTrackingCount + adjustStockCount > 0
      ? "Regional offers and stock saved."
      : createOfferCount > 0
        ? createOfferCount > 1
          ? "Regional offers created."
          : "Regional offer created."
        : updateOfferCount > 0
          ? updateOfferCount > 1
            ? "Regional offers updated."
            : "Regional offer updated."
          : adjustStockCount > 0
            ? "Stock level updated."
            : "Inventory tracking started.";

  const fallbackDraft = createRegionDraft(pricingSeedFromPlanName(planName));
  const activeDraft = activeRegionEntry?.draft ?? fallbackDraft;
  const reviewPricingOptions = activeRegionEntry?.pricingOptions ?? [];
  const existingRegions = regionEntries
    .filter((entry) => entry.existingSku)
    .map((entry) => entry.region);
  const showEditIcon =
    createOfferCount === 0 &&
    startTrackingCount === 0 &&
    (updateOfferCount > 0 || adjustStockCount > 0);

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
                Add the regional offer and starting stock together so operators
                only need one creation flow.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedProduct || !canSubmit) return;

              const actionableEntries = regionEntries.filter(
                (entry) =>
                  entry.offerActionNeeded || entry.inventoryActionNeeded,
              );

              if (actionableEntries.length === 0) return;

              void runAction(async () => {
                let nextProduct = existingProduct;
                let nextPlan = existingPlan;

                for (const entry of actionableEntries) {
                  let nextSku = entry.existingSku;

                  if (entry.offerActionNeeded) {
                    if (entry.existingSku) {
                      nextSku = await api.updateSku(entry.existingSku._id, {
                        code: entry.generatedSkuCode,
                        region: entry.region,
                        seatType: entry.existingSku.seatType,
                        pricingOptions: entry.normalizedPricingOptions,
                        purchaseConstraints: entry.purchaseConstraints,
                        activationTimeline: entry.normalizedActivationTimeline,
                      });
                    } else if (!nextProduct) {
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
                          code: entry.generatedSkuCode,
                          region: entry.region,
                          seatType: "seat",
                          pricingOptions: entry.normalizedPricingOptions,
                          purchaseConstraints: entry.purchaseConstraints,
                          activationTimeline:
                            entry.normalizedActivationTimeline,
                        },
                      });

                      nextProduct = created.product;
                      nextPlan = created.plan;
                      nextSku = created.sku;
                    } else {
                      if (!nextPlan) {
                        nextPlan = await api.createPlan({
                          productId: nextProduct._id,
                          name: normalizedPlanName,
                          planType: "standard",
                        });
                      }

                      nextSku = await api.createSku({
                        planId: nextPlan._id,
                        code: entry.generatedSkuCode,
                        region: entry.region,
                        seatType: "seat",
                        pricingOptions: entry.normalizedPricingOptions,
                        purchaseConstraints: entry.purchaseConstraints,
                        activationTimeline: entry.normalizedActivationTimeline,
                      });
                    }
                  }

                  if (!nextSku) continue;

                  if (entry.inventoryWillCreate) {
                    await api.createInventoryPool({
                      skuId: nextSku._id,
                      totalQuantity: entry.draft.inventoryQuantity,
                    });
                    continue;
                  }

                  if (entry.inventoryWillAdjust) {
                    await api.adjustInventory({
                      skuId: nextSku._id,
                      change: entry.inventoryDelta,
                      reason:
                        entry.inventoryDelta >= 0
                          ? "MANUAL_ADD"
                          : "MANUAL_REMOVE",
                      actor:
                        entry.draft.inventoryActor.trim() ||
                        defaultInventoryActor,
                    });
                  }
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
                detailsReady={productPlanReady}
                loadingPricing={loadingPricing}
                selectedRegions={selectedRegions}
                onSelectedRegionsChange={handleSelectedRegionsChange}
                activeRegion={activeRegionEntry?.region}
                onActiveRegionChange={setActiveRegion}
                existingRegions={existingRegions}
                existingSku={activeRegionEntry?.existingSku}
                generatedSkuCode={activeRegionEntry?.generatedSkuCode ?? ""}
                billingCycles={activeDraft.billingCycles}
                onBillingCyclesChange={updateBillingCycles}
                pricingDetails={activeDraft.pricingDetails}
                onPricingDetailsChange={updatePricingDetails}
                minimumUnits={activeDraft.minimumUnits}
                onMinimumUnitsChange={updateMinimumUnits}
                maximumUnits={activeDraft.maximumUnits}
                onMaximumUnitsChange={updateMaximumUnits}
                activationTimeline={activeDraft.activationTimeline}
                onActivationTimelineChange={updateActivationTimeline}
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
              <StockStep
                detailsReady={productPlanReady && Boolean(activeRegionEntry)}
                existingInventoryPool={activeRegionEntry?.existingInventoryPool}
                inventoryQuantity={activeDraft.inventoryQuantity}
                onInventoryQuantityChange={updateInventoryQuantity}
                inventoryRegion={activeRegionEntry?.region ?? "Choose region"}
                inventoryActor={activeDraft.inventoryActor}
                onInventoryActorChange={updateInventoryActor}
              />

              <SetupReviewPanel
                selectedProductName={selectedProduct?.name}
                planName={normalizedPlanName}
                selectedRegions={selectedRegions}
                activeRegion={activeRegionEntry?.region}
                pricingOptions={reviewPricingOptions}
                existingSku={activeRegionEntry?.existingSku}
                generatedSkuCode={activeRegionEntry?.generatedSkuCode ?? ""}
                saveMessage={saveMessage}
              />
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{saveMessage}</p>
              <Button disabled={!canSubmit}>
                {showEditIcon ? (
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
        editingSkuId={activeRegionEntry?.existingSku?._id}
        onEditSetup={handleEditExistingSetup}
      />
    </div>
  );
}
