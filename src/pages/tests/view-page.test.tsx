import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import { ViewWorkspace } from "@/components/view-page/view-workspace";
import { api } from "@/lib/api";
import type { DashboardSnapshot, PricePerUnit } from "@/types";

import { BillingOptionsPage } from "../billing-options-page";
import { InventoryPoolsPage } from "../inventory-pools-page";
import { ViewPage } from "../view-page";

const pricingOption = (
  billingCycle: PricePerUnit["billingCycle"],
  amount: string,
  currency = "USD",
  entity = "user",
  ratePeriod = billingCycle === "yearly" ? "year" : billingCycle,
): PricePerUnit => ({
  billingCycle,
  amount,
  currency,
  entity,
  ratePeriod,
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
    {
      _id: "product-2",
      externalId: "confluence-product-1",
      name: "Confluence",
      vendor: "Atlassian",
      description: "Knowledge base",
      logoUrl: "",
      createdAt: "2026-03-11T00:00:00.000Z",
    },
    {
      _id: "product-3",
      externalId: "mailchimp-product-1",
      name: "Mailchimp",
      vendor: "Intuit",
      description: "Email marketing",
      logoUrl: "",
      createdAt: "2026-03-10T00:00:00.000Z",
    },
    {
      _id: "product-4",
      externalId: "slack-product-1",
      name: "Slack",
      vendor: "Salesforce",
      description: "Messaging",
      logoUrl: "",
      createdAt: "2026-03-09T00:00:00.000Z",
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
    {
      _id: "plan-2",
      productId: "product-2",
      name: "Premium",
      planType: "standard",
      createdAt: "2026-03-11T00:00:00.000Z",
    },
    {
      _id: "plan-3",
      productId: "product-3",
      name: "Premium",
      planType: "standard",
      createdAt: "2026-03-10T00:00:00.000Z",
    },
    {
      _id: "plan-4",
      productId: "product-4",
      name: "Business",
      planType: "standard",
      createdAt: "2026-03-09T00:00:00.000Z",
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
      purchaseConstraints: {
        minUnits: 1,
      },
      activationTimeline: "5 Days",
      createdAt: "2026-03-12T00:00:00.000Z",
    },
    {
      _id: "sku-2",
      planId: "plan-2",
      code: "confluence-premium-india",
      region: "INDIA",
      seatType: "seat",
      pricingOptions: [pricingOption("yearly", "120")],
      purchaseConstraints: {
        minUnits: 3,
        maxUnits: 15,
      },
      activationTimeline: "7 Working Days",
      createdAt: "2026-03-11T00:00:00.000Z",
    },
    {
      _id: "sku-3",
      planId: "plan-3",
      code: "mailchimp-premium-gcc",
      region: "GCC",
      seatType: "seat",
      pricingOptions: [
        pricingOption("monthly", "350"),
        pricingOption("yearly", "320"),
      ],
      activationTimeline: "7 Working Days",
      createdAt: "2026-03-10T00:00:00.000Z",
    },
    {
      _id: "sku-4",
      planId: "plan-4",
      code: "slack-business-india",
      region: "INDIA",
      seatType: "seat",
      pricingOptions: [pricingOption("monthly", "14")],
      createdAt: "2026-03-09T00:00:00.000Z",
    },
  ],
  inventoryPools: [
    {
      _id: "pool-1",
      skuId: "sku-1",
      totalQuantity: 12,
      updatedAt: "2026-03-12T00:00:00.000Z",
    },
    {
      _id: "pool-2",
      skuId: "sku-2",
      totalQuantity: 42,
      updatedAt: "2026-03-11T00:00:00.000Z",
    },
    {
      _id: "pool-3",
      skuId: "sku-3",
      totalQuantity: 200,
      updatedAt: "2026-03-10T00:00:00.000Z",
    },
    {
      _id: "pool-4",
      skuId: "sku-4",
      totalQuantity: 60,
      updatedAt: "2026-03-09T00:00:00.000Z",
    },
  ],
  auditLogs: [],
};

const runAction: ActionRunner = async (work) => {
  await work();
  return true;
};

function renderViewRoute(initialEntry = "/view") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/view"
          element={
            <ViewWorkspace
              snapshot={snapshot}
              loading={false}
              runAction={runAction}
            />
          }
        >
          <Route index element={<ViewPage />} />
          <Route path="billing-options" element={<BillingOptionsPage />} />
          <Route path="inventory-pools" element={<InventoryPoolsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("view page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows only the latest three offer records and links to full detail pages", () => {
    renderViewRoute();

    expect(
      screen.getByRole("button", { name: /edit billing for jira standard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /edit billing for confluence premium/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /edit billing for mailchimp premium/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /edit billing for slack business/i,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /edit inventory for jira gcc/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /edit inventory for confluence india/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /edit inventory for mailchimp gcc/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /edit inventory for slack india/i,
      }),
    ).not.toBeInTheDocument();

    const viewAllLinks = screen.getAllByRole("link", { name: /view all/i });
    expect(viewAllLinks).toHaveLength(2);
    expect(viewAllLinks[0]).toHaveAttribute("href", "/view/billing-options");
    expect(viewAllLinks[1]).toHaveAttribute("href", "/view/inventory-pools");
  });

  it("edits offer pricing from the view dialog", async () => {
    const updateSku = vi.spyOn(api, "updateSku").mockResolvedValue({
      ...snapshot.skus[0]!,
      pricingOptions: [pricingOption("monthly", "25")],
    });

    renderViewRoute();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /edit billing for jira standard/i,
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /edit billing/i }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12/i), {
        target: { value: "25" },
      });
      fireEvent.change(screen.getByPlaceholderText(/^e\.g\. 1$/i), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 500/i), {
        target: { value: "10" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save billing/i }));
    });

    await waitFor(() => {
      expect(updateSku).toHaveBeenCalledWith("sku-1", {
        code: "jira-standard-gcc",
        region: "GCC",
        seatType: "seat",
        pricingOptions: [
          {
            billingCycle: "monthly",
            amount: "25",
            currency: "USD",
            entity: "user",
            ratePeriod: "monthly",
          },
        ],
        purchaseConstraints: {
          minUnits: 2,
          maxUnits: 10,
        },
        activationTimeline: "5 Days",
      });
    });
  });

  it("edits inventory from the view dialog", async () => {
    const adjustInventory = vi
      .spyOn(api, "adjustInventory")
      .mockResolvedValue({});

    renderViewRoute();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /edit inventory for jira gcc/i,
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /edit inventory/i }),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "18" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save inventory/i }));
    });

    await waitFor(() => {
      expect(adjustInventory).toHaveBeenCalledWith({
        skuId: "sku-1",
        change: 6,
        reason: "MANUAL_ADD",
        actor: "operations",
      });
    });
  });

  it("searches all regional offers on the dedicated billing page", async () => {
    renderViewRoute("/view/billing-options");

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(
          /product, vendor, plan, code, cycle, or region/i,
        ),
        {
          target: { value: "india" },
        },
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /edit billing for confluence premium/i,
        }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/jira/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mailchimp/i)).not.toBeInTheDocument();
  });
});
