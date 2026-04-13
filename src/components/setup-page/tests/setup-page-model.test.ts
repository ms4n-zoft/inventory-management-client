import { describe, expect, it } from "vitest";

import { createPricingDetails } from "@/lib/billing-option";
import type { DashboardSnapshot, PricePerUnit, Sku } from "@/types";

import {
  buildSetupPageDerivedState,
  createRegionDraft,
} from "../setup-page-model";

function pricingOption(
  billingCycle: PricePerUnit["billingCycle"],
  amount: string,
): PricePerUnit {
  return {
    billingCycle,
    amount,
    currency: "USD",
    entity: "user",
    ratePeriod: billingCycle,
  };
}

function skuFixture(input: {
  id: string;
  code: string;
  billingCycle: PricePerUnit["billingCycle"];
}): Sku {
  return {
    _id: input.id,
    planId: "plan-1",
    code: input.code,
    region: "GCC",
    seatType: "seat",
    purchaseType: input.billingCycle === "one_time" ? "one_time" : "subscription",
    pricingOption: pricingOption(input.billingCycle, "18"),
    purchaseConstraints: {
      minUnits: 1,
    },
    activationTimeline: "7",
    createdAt: "2026-03-09T08:00:00.000Z",
  };
}

function snapshotFixture(skus: Sku[]): DashboardSnapshot {
  return {
    products: [
      {
        _id: "product-1",
        externalId: "jira",
        name: "Jira",
        vendor: "Atlassian",
        description: "Project tracking",
        logoUrl: "",
        createdAt: "2026-03-08T08:00:00.000Z",
      },
    ],
    plans: [
      {
        _id: "plan-1",
        productId: "product-1",
        name: "Standard",
        planType: "standard",
        createdAt: "2026-03-08T08:00:00.000Z",
      },
    ],
    skus,
    inventoryPools: [],
    auditLogs: [],
  };
}

describe("setup-page-model", () => {
  it("collects previous plan suggestions for the selected product only", () => {
    const derived = buildSetupPageDerivedState({
      snapshot: {
        products: [
          {
            _id: "product-1",
            externalId: "jira",
            name: "Jira",
            vendor: "Atlassian",
            description: "Project tracking",
            logoUrl: "",
            createdAt: "2026-03-08T08:00:00.000Z",
          },
          {
            _id: "product-2",
            externalId: "slack",
            name: "Slack",
            vendor: "Slack",
            description: "Team chat",
            logoUrl: "",
            createdAt: "2026-03-08T08:00:00.000Z",
          },
        ],
        plans: [
          {
            _id: "plan-1",
            productId: "product-1",
            name: "Standard",
            planType: "standard",
            createdAt: "2026-03-08T08:00:00.000Z",
          },
          {
            _id: "plan-2",
            productId: "product-1",
            name: "Legacy",
            planType: "standard",
            createdAt: "2026-03-09T08:00:00.000Z",
          },
          {
            _id: "plan-3",
            productId: "product-2",
            name: "Slack Pro",
            planType: "standard",
            createdAt: "2026-03-10T08:00:00.000Z",
          },
        ],
        skus: [],
        inventoryPools: [],
        auditLogs: [],
      },
      selectedProduct: {
        id: "jira",
        slug: "jira",
        name: "Jira",
        vendor: "Atlassian",
        description: "Project tracking",
        logoUrl: "",
      },
      pricingPlans: [],
      planName: "",
      selectedRegions: [],
      regionDrafts: {},
      loadingPricing: false,
      loading: false,
    });

    expect(derived.previousPlanSuggestions).toEqual(["Standard", "Legacy"]);
  });

  it("matches existing skus by region and billing cycle", () => {
    const snapshot = snapshotFixture([
      skuFixture({
        id: "sku-monthly",
        code: "jira-standard-gcc-monthly",
        billingCycle: "monthly",
      }),
      skuFixture({
        id: "sku-yearly",
        code: "jira-standard-gcc-yearly",
        billingCycle: "yearly",
      }),
    ]);

    const derived = buildSetupPageDerivedState({
      snapshot,
      selectedProduct: {
        id: "jira",
        slug: "jira",
        name: "Jira",
        vendor: "Atlassian",
        description: "Project tracking",
        logoUrl: "",
      },
      pricingPlans: [],
      planName: "Standard",
      selectedRegions: ["GCC"],
      regionDrafts: {
        GCC: {
          ...createRegionDraft(pricingOption("yearly", "180")),
          purchaseType: "subscription",
          billingCycle: "yearly",
          pricingDetails: createPricingDetails(pricingOption("yearly", "180")),
        },
      },
      loadingPricing: false,
      loading: false,
    });

    expect(derived.regionEntries[0]?.existingSku?._id).toBe("sku-yearly");
    expect(derived.regionEntries[0]?.generatedSkuCode).toBe(
      "jira-standard-gcc-yearly",
    );
  });

  it("prepares a new sku when the selected cycle does not already exist", () => {
    const snapshot = snapshotFixture([
      skuFixture({
        id: "sku-monthly",
        code: "jira-standard-gcc-monthly",
        billingCycle: "monthly",
      }),
    ]);

    const derived = buildSetupPageDerivedState({
      snapshot,
      selectedProduct: {
        id: "jira",
        slug: "jira",
        name: "Jira",
        vendor: "Atlassian",
        description: "Project tracking",
        logoUrl: "",
      },
      pricingPlans: [],
      planName: "Standard",
      selectedRegions: ["GCC"],
      regionDrafts: {
        GCC: {
          ...createRegionDraft(pricingOption("quarterly", "48")),
          purchaseType: "subscription",
          billingCycle: "quarterly",
          pricingDetails: createPricingDetails(
            pricingOption("quarterly", "48"),
          ),
        },
      },
      loadingPricing: false,
      loading: false,
    });

    expect(derived.regionEntries[0]?.existingSku).toBeUndefined();
    expect(derived.regionEntries[0]?.generatedSkuCode).toBe(
      "jira-standard-gcc-quarterly",
    );
  });
});
