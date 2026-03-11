import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import type { DashboardSnapshot } from "@/types";

import { InventoryPage } from "./inventory-page";

const runAction: ActionRunner = async () => true;

const snapshot: DashboardSnapshot = {
  products: [
    {
      _id: "product-1",
      externalId: "mailchimp",
      name: "Mailchimp",
      vendor: "Intuit",
      description: "Email marketing",
      logoUrl: "",
      createdAt: "2026-03-11T10:00:00.000Z",
    },
  ],
  plans: [
    {
      _id: "plan-1",
      productId: "product-1",
      name: "Premium",
      planType: "standard",
      createdAt: "2026-03-11T10:01:00.000Z",
    },
  ],
  skus: [
    {
      _id: "sku-1",
      planId: "plan-1",
      code: "mailchimp-premium",
      billingPeriod: "monthly",
      region: "MENA",
      seatType: "seat",
      createdAt: "2026-03-11T10:02:00.000Z",
    },
  ],
  inventoryPools: [
    {
      _id: "pool-1",
      skuId: "sku-1",
      region: "MENA",
      totalQuantity: 100,
      reservedQuantity: 12,
      allocatedQuantity: 8,
      updatedAt: "2026-03-11T11:30:00.000Z",
    },
  ],
  reservations: [],
  entitlements: [],
  auditLogs: [],
};

describe("inventory page", () => {
  it("renders catalog details instead of the raw sku id in the inventory table", () => {
    render(
      <InventoryPage
        snapshot={snapshot}
        loading={false}
        runAction={runAction}
      />,
    );

    expect(screen.getByText("mailchimp-premium")).toBeInTheDocument();
    expect(screen.getByText("Mailchimp")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("100 tracked")).toBeInTheDocument();
    expect(screen.getByText("20 committed total")).toBeInTheDocument();
    expect(screen.getByText("80 available")).toBeInTheDocument();
    expect(screen.getByText("80% of pool free")).toBeInTheDocument();
    expect(screen.queryByText("sku-1")).not.toBeInTheDocument();
  });
});
