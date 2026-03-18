import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import {
  billingCyclesFromPricingOptions,
  buildPricingOptionsFromCycleDetails,
  buildPurchaseConstraints,
  buildSkuCode,
  createPricingDetailsByCycle,
  ensureUniqueSkuCode,
  hasValidPricingOptions as hasValidPricingOptionsForOffer,
  hasValidPurchaseConstraints,
  isStockTrackingEnabled,
  normalizePricingOptions,
  pricePerUnitFromPlan,
  pricingDetailsByCycleFromPricingOptions,
  purchaseConstraintsToFormValues,
  sameLabel,
} from "@/lib/billing-option";
import { buildSkuCatalogLookup } from "@/lib/catalog";
import type {
  BillingCycle,
  DashboardSnapshot,
  InventoryPool,
  Plan,
  PricePerUnit,
  PricingDetailsByCycle,
  Product,
  PurchaseConstraints,
  Region,
  Sku,
} from "@/types";

import type { RecentSetupEntry } from "./types";

export const defaultInventoryActor = "operations";

export type RegionDraft = {
  billingCycles: BillingCycle[];
  pricingDetailsByCycle: PricingDetailsByCycle;
  minimumUnits: string;
  maximumUnits: string;
  activationTimeline: string;
  inventoryQuantity: number;
  inventoryActor: string;
};

export type RegionEntry = {
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
  stockTrackingEnabled: boolean;
  inventoryWillCreate: boolean;
  inventoryWillAdjust: boolean;
  inventoryDelta: number;
  inventoryActionNeeded: boolean;
};

export type SetupPageSummary = {
  blockingRegions: Region[];
  createOfferCount: number;
  updateOfferCount: number;
  startTrackingCount: number;
  adjustStockCount: number;
  hasPendingChanges: boolean;
  canSubmit: boolean;
  submitLabel: string;
  saveMessage: string;
  successMessage: string;
  showEditIcon: boolean;
};

export type SetupPageDerivedState = {
  normalizedPlanName: string;
  selectedPricingPlan?: ProductPricingPlan;
  existingProduct?: Product;
  existingPlan?: Plan;
  productPlanReady: boolean;
  regionEntries: RegionEntry[];
  activeRegionEntry?: RegionEntry;
  activeDraft: RegionDraft;
  reviewPricingOptions: PricePerUnit[];
  recentSetups: RecentSetupEntry[];
  existingRegions: Region[];
  summary: SetupPageSummary;
};

function slugifySkuPart(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toSearchResult(product: Product): ProductSearchResult {
  return {
    id: product.externalId,
    slug: slugifySkuPart(product.name),
    name: product.name,
    vendor: product.vendor,
    description: product.description,
    logoUrl: product.logoUrl,
  };
}

export function pricingSeedFromPlanName(
  pricingPlans: ProductPricingPlan[],
  nextPlanName: string,
) {
  const matchedPlan = pricingPlans.find((plan) =>
    sameLabel(plan.plan, nextPlanName),
  );

  return matchedPlan ? pricePerUnitFromPlan(matchedPlan) : undefined;
}

export function createRegionDraft(pricingOption?: PricePerUnit): RegionDraft {
  return {
    billingCycles: pricingOption
      ? billingCyclesFromPricingOptions([pricingOption])
      : ["monthly"],
    pricingDetailsByCycle: createPricingDetailsByCycle(pricingOption),
    minimumUnits: "",
    maximumUnits: "",
    activationTimeline: "",
    inventoryQuantity: 0,
    inventoryActor: defaultInventoryActor,
  };
}

export function cloneRegionDraft(source: RegionDraft): RegionDraft {
  return {
    billingCycles: [...source.billingCycles],
    pricingDetailsByCycle: {
      monthly: { ...source.pricingDetailsByCycle.monthly },
      yearly: { ...source.pricingDetailsByCycle.yearly },
      one_time: { ...source.pricingDetailsByCycle.one_time },
    },
    minimumUnits: source.minimumUnits,
    maximumUnits: source.maximumUnits,
    activationTimeline: source.activationTimeline,
    inventoryQuantity: 0,
    inventoryActor: defaultInventoryActor,
  };
}

export function regionDraftFromExisting(
  sku: Sku,
  inventoryQuantity: number,
): RegionDraft {
  const purchaseConstraintValues = purchaseConstraintsToFormValues(
    sku.purchaseConstraints,
  );

  return {
    billingCycles: billingCyclesFromPricingOptions(sku.pricingOptions),
    pricingDetailsByCycle: pricingDetailsByCycleFromPricingOptions(
      sku.pricingOptions,
    ),
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

export function buildRegionEntries(input: {
  snapshot: DashboardSnapshot;
  selectedProduct: ProductSearchResult | null;
  normalizedPlanName: string;
  existingPlan?: Plan;
  selectedRegions: Region[];
  regionDrafts: Partial<Record<Region, RegionDraft>>;
  pricingSeed?: PricePerUnit;
  productPlanReady: boolean;
  loadingPricing: boolean;
}): RegionEntry[] {
  const existingSkuCodes = new Set(input.snapshot.skus.map((sku) => sku.code));

  return input.selectedRegions.map((region) => {
    const existingPlanId = input.existingPlan?._id;
    const draft =
      input.regionDrafts[region] ?? createRegionDraft(input.pricingSeed);
    const existingSku = existingPlanId
      ? input.snapshot.skus.find(
          (sku) => sku.planId === existingPlanId && sku.region === region,
        )
      : undefined;
    const existingInventoryPool = existingSku
      ? input.snapshot.inventoryPools.find(
          (pool) => pool.skuId === existingSku._id,
        )
      : undefined;
    const pricingOptions = buildPricingOptionsFromCycleDetails({
      billingCycles: draft.billingCycles,
      pricingDetailsByCycle: draft.pricingDetailsByCycle,
    });
    const normalizedPricingOptions = normalizePricingOptions(pricingOptions);
    const purchaseConstraints = buildPurchaseConstraints({
      minUnits: draft.minimumUnits,
      maxUnits: draft.maximumUnits,
    });
    const stockTrackingEnabled = isStockTrackingEnabled(purchaseConstraints);
    const normalizedActivationTimeline =
      draft.activationTimeline.trim() || undefined;
    const baseCode = buildSkuCode({
      productName: input.selectedProduct?.name,
      planName: input.normalizedPlanName,
      region,
    });
    const generatedSkuCode = !baseCode
      ? ""
      : existingSku
        ? existingSku.code
        : ensureUniqueSkuCode(baseCode, existingSkuCodes);
    const hasPricing = hasValidPricingOptionsForOffer(pricingOptions);
    const hasValidConstraints = hasValidPurchaseConstraints({
      minUnits: draft.minimumUnits,
      maxUnits: draft.maximumUnits,
    });
    const offerReady =
      input.productPlanReady &&
      generatedSkuCode.trim().length >= 3 &&
      hasPricing &&
      hasValidConstraints &&
      !input.loadingPricing;
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
      stockTrackingEnabled &&
      draft.inventoryQuantity > 0 &&
      !existingInventoryPool;
    const inventoryWillAdjust =
      stockTrackingEnabled &&
      existingInventoryPool !== undefined &&
      draft.inventoryQuantity !== existingInventoryTotal;
    const inventoryDelta = existingInventoryPool
      ? stockTrackingEnabled
        ? draft.inventoryQuantity - existingInventoryTotal
        : 0
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
      stockTrackingEnabled,
      inventoryWillCreate,
      inventoryWillAdjust,
      inventoryDelta,
      inventoryActionNeeded: inventoryWillCreate || inventoryWillAdjust,
    };
  });
}

export function buildRecentSetupEntries(
  snapshot: DashboardSnapshot,
  skuCatalog: ReturnType<typeof buildSkuCatalogLookup>,
): RecentSetupEntry[] {
  return [...snapshot.skus]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((sku) => {
      const catalogEntry = skuCatalog.get(sku._id);
      const pools = snapshot.inventoryPools.filter(
        (pool) => pool.skuId === sku._id,
      );
      const trackedPools = isStockTrackingEnabled(sku.purchaseConstraints)
        ? pools
        : [];
      const trackedQuantity = trackedPools.reduce(
        (sum, pool) => sum + pool.totalQuantity,
        0,
      );

      return {
        sku,
        plan: catalogEntry?.plan,
        product: catalogEntry?.product,
        pools: trackedPools,
        trackedQuantity,
      };
    })
    .filter((entry): entry is RecentSetupEntry =>
      Boolean(entry.plan && entry.product),
    )
    .slice(0, 6);
}

export function buildSetupSummary(input: {
  regionEntries: RegionEntry[];
  activeRegionEntry?: RegionEntry;
  productPlanReady: boolean;
  selectedRegions: Region[];
  loading: boolean;
}): SetupPageSummary {
  const blockingRegions = input.regionEntries
    .filter((entry) => entry.offerBlocked)
    .map((entry) => entry.region);
  const createOfferCount = input.regionEntries.filter(
    (entry) => entry.offerActionNeeded && !entry.existingSku,
  ).length;
  const updateOfferCount = input.regionEntries.filter(
    (entry) => entry.offerActionNeeded && entry.existingSku,
  ).length;
  const startTrackingCount = input.regionEntries.filter(
    (entry) => entry.inventoryWillCreate,
  ).length;
  const adjustStockCount = input.regionEntries.filter(
    (entry) => entry.inventoryWillAdjust,
  ).length;
  const hasPendingChanges = input.regionEntries.some(
    (entry) => entry.offerActionNeeded || entry.inventoryActionNeeded,
  );
  const canSubmit =
    !input.loading &&
    input.productPlanReady &&
    input.selectedRegions.length > 0 &&
    blockingRegions.length === 0 &&
    hasPendingChanges;

  const submitLabel =
    input.selectedRegions.length > 1
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

  const saveMessage = !input.productPlanReady
    ? "Pick a product and plan first, then select one or more regions."
    : input.selectedRegions.length === 0
      ? "Select at least one region to open its offer tab."
      : blockingRegions.length > 0
        ? `Complete the ${joinValues(blockingRegions)} ${blockingRegions.length === 1 ? "tab" : "tabs"} before saving.`
        : !hasPendingChanges
          ? input.activeRegionEntry?.existingSku
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

  const showEditIcon =
    createOfferCount === 0 &&
    startTrackingCount === 0 &&
    (updateOfferCount > 0 || adjustStockCount > 0);

  return {
    blockingRegions,
    createOfferCount,
    updateOfferCount,
    startTrackingCount,
    adjustStockCount,
    hasPendingChanges,
    canSubmit,
    submitLabel,
    saveMessage,
    successMessage,
    showEditIcon,
  };
}

export function buildSetupPageDerivedState(input: {
  snapshot: DashboardSnapshot;
  skuCatalog: ReturnType<typeof buildSkuCatalogLookup>;
  selectedProduct: ProductSearchResult | null;
  pricingPlans: ProductPricingPlan[];
  planName: string;
  selectedRegions: Region[];
  activeRegion?: Region;
  regionDrafts: Partial<Record<Region, RegionDraft>>;
  loadingPricing: boolean;
  loading: boolean;
}): SetupPageDerivedState {
  const normalizedPlanName = input.planName.trim();
  const selectedProductId = input.selectedProduct?.id;
  const selectedPricingPlan = input.pricingPlans.find((plan) =>
    sameLabel(plan.plan, input.planName),
  );
  const existingProduct = selectedProductId
    ? input.snapshot.products.find(
        (product) => product.externalId === selectedProductId,
      )
    : undefined;
  const existingPlan = existingProduct
    ? input.snapshot.plans.find(
        (plan) =>
          plan.productId === existingProduct._id &&
          sameLabel(plan.name, normalizedPlanName),
      )
    : undefined;
  const productPlanReady =
    Boolean(input.selectedProduct) && normalizedPlanName.length >= 2;
  const planPricingSeed = pricingSeedFromPlanName(
    input.pricingPlans,
    input.planName,
  );
  const regionEntries = buildRegionEntries({
    snapshot: input.snapshot,
    selectedProduct: input.selectedProduct,
    normalizedPlanName,
    existingPlan,
    selectedRegions: input.selectedRegions,
    regionDrafts: input.regionDrafts,
    pricingSeed: planPricingSeed,
    productPlanReady,
    loadingPricing: input.loadingPricing,
  });
  const activeRegionValue =
    input.activeRegion && input.selectedRegions.includes(input.activeRegion)
      ? input.activeRegion
      : input.selectedRegions[0];
  const activeRegionEntry =
    regionEntries.find((entry) => entry.region === activeRegionValue) ??
    undefined;
  const summary = buildSetupSummary({
    regionEntries,
    activeRegionEntry,
    productPlanReady,
    selectedRegions: input.selectedRegions,
    loading: input.loading,
  });
  const activeDraft =
    activeRegionEntry?.draft ?? createRegionDraft(planPricingSeed);
  const reviewPricingOptions = activeRegionEntry?.pricingOptions ?? [];
  const recentSetups = buildRecentSetupEntries(
    input.snapshot,
    input.skuCatalog,
  );
  const existingRegions = regionEntries
    .filter((entry) => entry.existingSku)
    .map((entry) => entry.region);

  return {
    normalizedPlanName,
    selectedPricingPlan,
    existingProduct,
    existingPlan,
    productPlanReady,
    regionEntries,
    activeRegionEntry,
    activeDraft,
    reviewPricingOptions,
    recentSetups,
    existingRegions,
    summary,
  };
}
