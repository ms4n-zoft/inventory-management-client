import { describe, expect, it } from "vitest";

import { createPricingDetailsByCycle } from "@/lib/billing-option";
import { buildSkuCatalogLookup } from "@/lib/catalog";
import type { DashboardSnapshot, PricePerUnit } from "@/types";

import {
  buildSetupPageDerivedState,
  createRegionDraft,
  regionDraftFromExisting,
} from "../setup-page-model";

const pricingOption = (
  billingCycle: PricePerUnit["billingCycle"],
  amount: string,
  currency = "USD",
  entity = "user",
  ratePeriod = billingCycle === "yearly" ? "year" : billingCycle,
  discount?: {
    discountPercentage?: string;
    discountedAmount?: string;
  },
): PricePerUnit => ({
  billingCycle,
  amount,
  currency,
  entity,
  ratePeriod,
  ...(discount?.discountPercentage !== undefined
    ? { discountPercentage: discount.discountPercentage }
    : {}),
  ...(discount?.discountedAmount !== undefined
    ? { discountedAmount: discount.discountedAmount }
    : {}),
});

const snapshot: DashboardSnapshot = {
  products: [
    {
      _id: "product-1",
      externalId: "jira-product-1",
      name: "Jira",
      vendor: "Atlassian",
      description: "Project tracking",
      logoUrl: "",
      createdAt: "2026-03-12T00:00:00.000Z",
    },
  ],
  plans: [
    {
      _id: "plan-1",
      productId: "product-1",
      name: "Standard",
      planType: "standard",
      createdAt: "2026-03-12T00:00:00.000Z",
    },
  ],
  skus: [
    {
      _id: "sku-1",
      planId: "plan-1",
      code: "jira-standard-gcc",
      region: "GCC",
      seatType: "seat",
      pricingOptions: [pricingOption("monthly", "18")],
      purchaseConstraints: { minUnits: 1 },
      activationTimeline: "5 Days",
      createdAt: "2026-03-12T00:00:00.000Z",
    },
  ],
  inventoryPools: [
    {
      _id: "pool-1",
      skuId: "sku-1",
      totalQuantity: 12,
      updatedAt: "2026-03-12T00:00:00.000Z",
    },
  ],
  auditLogs: [],
};

const selectedProduct = {
  id: "jira-product-1",
  slug: "jira",
  name: "Jira",
  vendor: "Atlassian",
  description: "Project tracking",
  logoUrl: "",
};

describe("setup page model", () => {
  it("summarizes mixed create, update, and stock actions", () => {
    const existingBaseDraft = regionDraftFromExisting(snapshot.skus[0]!, 12);
    const existingDraft = {
      ...existingBaseDraft,
      pricingDetailsByCycle: {
        ...existingBaseDraft.pricingDetailsByCycle,
        monthly: {
          ...existingBaseDraft.pricingDetailsByCycle.monthly,
          amount: "21",
          currency: "USD",
          entity: "user",
          ratePeriod: "monthly",
        },
      },
      maximumUnits: "20",
      inventoryQuantity: 18,
    };
    const indiaBaseDraft = createRegionDraft(
      pricingOption("monthly", "1400", "INR"),
    );
    const indiaDraft = {
      ...indiaBaseDraft,
      pricingDetailsByCycle: {
        ...indiaBaseDraft.pricingDetailsByCycle,
        monthly: {
          ...indiaBaseDraft.pricingDetailsByCycle.monthly,
          amount: "1400",
          currency: "INR",
          entity: "user",
          ratePeriod: "month",
        },
      },
      maximumUnits: "10",
      inventoryQuantity: 5,
    };

    const derived = buildSetupPageDerivedState({
      snapshot,
      skuCatalog: buildSkuCatalogLookup(snapshot),
      selectedProduct,
      pricingPlans: [],
      planName: "Standard",
      selectedRegions: ["GCC", "INDIA"],
      activeRegion: "GCC",
      regionDrafts: {
        GCC: existingDraft,
        INDIA: indiaDraft,
      },
      loadingPricing: false,
      loading: false,
    });

    expect(derived.existingProduct?._id).toBe("product-1");
    expect(derived.existingPlan?._id).toBe("plan-1");
    expect(derived.existingRegions).toEqual(["GCC"]);
    expect(derived.recentSetups).toHaveLength(1);
    expect(derived.regionEntries).toHaveLength(2);
    expect(derived.activeRegionEntry?.generatedSkuCode).toBe(
      "jira-standard-gcc",
    );
    expect(
      derived.regionEntries.find((entry) => entry.region === "INDIA")
        ?.generatedSkuCode,
    ).toBe("jira-standard-india");

    expect(derived.summary.createOfferCount).toBe(1);
    expect(derived.summary.updateOfferCount).toBe(1);
    expect(derived.summary.startTrackingCount).toBe(1);
    expect(derived.summary.adjustStockCount).toBe(1);
    expect(derived.summary.canSubmit).toBe(true);
    expect(derived.summary.submitLabel).toBe("Save selected regions");
    expect(derived.summary.successMessage).toBe(
      "Regional offers and stock saved.",
    );
    expect(derived.summary.saveMessage).toBe(
      "Saving will create 1 new regional offer, update 1 existing regional offer, start tracking stock in 1 region, and adjust stock in 1 region.",
    );
  });

  it("ignores stock changes when maximum units stays unlimited", () => {
    const indiaBaseDraft = createRegionDraft(
      pricingOption("monthly", "1400", "INR"),
    );

    const derived = buildSetupPageDerivedState({
      snapshot,
      skuCatalog: buildSkuCatalogLookup(snapshot),
      selectedProduct,
      pricingPlans: [],
      planName: "Standard",
      selectedRegions: ["INDIA"],
      activeRegion: "INDIA",
      regionDrafts: {
        INDIA: {
          ...indiaBaseDraft,
          pricingDetailsByCycle: {
            ...indiaBaseDraft.pricingDetailsByCycle,
            monthly: {
              ...indiaBaseDraft.pricingDetailsByCycle.monthly,
              amount: "1400",
              currency: "INR",
              entity: "user",
              ratePeriod: "month",
            },
          },
          inventoryQuantity: 7,
        },
      },
      loadingPricing: false,
      loading: false,
    });

    expect(derived.regionEntries[0]?.stockTrackingEnabled).toBe(false);
    expect(derived.regionEntries[0]?.inventoryActionNeeded).toBe(false);
    expect(derived.summary.startTrackingCount).toBe(0);
    expect(derived.summary.saveMessage).toBe(
      "Saving will create 1 new regional offer.",
    );
  });

  it("blocks saving when an existing regional offer is edited into an invalid state", () => {
    const invalidBaseDraft = regionDraftFromExisting(snapshot.skus[0]!, 12);
    const invalidDraft = {
      ...invalidBaseDraft,
      pricingDetailsByCycle: {
        ...invalidBaseDraft.pricingDetailsByCycle,
        monthly: {
          ...invalidBaseDraft.pricingDetailsByCycle.monthly,
          amount: "",
          currency: "USD",
          entity: "user",
          ratePeriod: "monthly",
        },
      },
    };

    const derived = buildSetupPageDerivedState({
      snapshot,
      skuCatalog: buildSkuCatalogLookup(snapshot),
      selectedProduct,
      pricingPlans: [],
      planName: "Standard",
      selectedRegions: ["GCC"],
      activeRegion: "GCC",
      regionDrafts: {
        GCC: invalidDraft,
      },
      loadingPricing: false,
      loading: false,
    });

    expect(derived.summary.blockingRegions).toEqual(["GCC"]);
    expect(derived.summary.canSubmit).toBe(false);
    expect(derived.summary.saveMessage).toBe(
      "Complete the GCC tab before saving.",
    );
  });

  it("preserves separate pricing details for existing multi-cycle offers", () => {
    const multiCycleSnapshot: DashboardSnapshot = {
      ...snapshot,
      skus: [
        {
          ...snapshot.skus[0]!,
          pricingOptions: [
            pricingOption("monthly", "18", "USD", "user", "monthly", {
              discountPercentage: "10",
              discountedAmount: "16.2",
            }),
            pricingOption("yearly", "180", "USD", "user", "year"),
          ],
        },
      ],
    };
    const draft = regionDraftFromExisting(multiCycleSnapshot.skus[0]!, 12);

    expect(draft.billingCycles).toEqual(["monthly", "yearly"]);
    expect(draft.pricingDetailsByCycle.monthly.amount).toBe("18");
    expect(draft.pricingDetailsByCycle.monthly.discountPercentage).toBe("10");
    expect(draft.pricingDetailsByCycle.monthly.discountedAmount).toBe("16.2");
    expect(draft.pricingDetailsByCycle.yearly.amount).toBe("180");

    const derived = buildSetupPageDerivedState({
      snapshot: multiCycleSnapshot,
      skuCatalog: buildSkuCatalogLookup(multiCycleSnapshot),
      selectedProduct,
      pricingPlans: [],
      planName: "Standard",
      selectedRegions: ["GCC"],
      activeRegion: "GCC",
      regionDrafts: {
        GCC: {
          ...draft,
          pricingDetailsByCycle: {
            ...createPricingDetailsByCycle(pricingOption("monthly", "18")),
            monthly: {
              ...draft.pricingDetailsByCycle.monthly,
            },
            yearly: {
              ...draft.pricingDetailsByCycle.yearly,
            },
          },
        },
      },
      loadingPricing: false,
      loading: false,
    });

    expect(derived.activeRegionEntry?.pricingOptions).toEqual([
      pricingOption("monthly", "18", "USD", "user", "monthly", {
        discountPercentage: "10",
        discountedAmount: "16.2",
      }),
      pricingOption("yearly", "180", "USD", "user", "year"),
    ]);
  });
});
