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
        maxUnits: 20,
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
      purchaseConstraints: {
        maxUnits: 300,
      },
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
      purchaseConstraints: {
        maxUnits: 100,
      },
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

function renderViewRoute(
  initialEntry = "/view",
  snapshotValue: DashboardSnapshot = snapshot,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/view"
          element={
            <ViewWorkspace
              snapshot={snapshotValue}
              loading={false}
              sales={[]}
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

function getBillingAmountInput(billingCycle: PricePerUnit["billingCycle"]) {
  const label =
    billingCycle === "one_time"
      ? /one time price amount/i
      : new RegExp(`^${billingCycle} price amount$`, "i");

  return screen.getByRole("textbox", { name: label });
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
      fireEvent.change(getBillingAmountInput("monthly"), {
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

  it("rounds discounted pricing to 2 decimal places on the view page", () => {
    const discountedSnapshot: DashboardSnapshot = {
      ...snapshot,
      products: [snapshot.products[0]!],
      plans: [snapshot.plans[0]!],
      skus: [
        {
          ...snapshot.skus[0]!,
          pricingOptions: [
            pricingOption("monthly", "18.456", "USD", "user", "month", {
              discountPercentage: "12.349",
            }),
          ],
        },
      ],
      inventoryPools: [snapshot.inventoryPools[0]!],
    };

    renderViewRoute("/view/billing-options", discountedSnapshot);

    expect(
      screen.getByText(
        /monthly: \$16\.18 \/ user \/ month \(12\.35% off, was \$18\.46\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("edits each billing cycle amount independently from the view dialog", async () => {
    const updateSku = vi.spyOn(api, "updateSku").mockResolvedValue({
      ...snapshot.skus[2]!,
      pricingOptions: [
        pricingOption("monthly", "360"),
        pricingOption("yearly", "330"),
      ],
    });

    renderViewRoute();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /edit billing for mailchimp premium/i,
        }),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /edit billing/i }),
      ).toBeInTheDocument();
    });

    expect(getBillingAmountInput("monthly")).toHaveValue("350");
    expect(getBillingAmountInput("yearly")).toHaveValue("320");

    await act(async () => {
      fireEvent.change(getBillingAmountInput("monthly"), {
        target: { value: "360" },
      });
      fireEvent.change(getBillingAmountInput("yearly"), {
        target: { value: "330" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save billing/i }));
    });

    await waitFor(() => {
      expect(updateSku).toHaveBeenCalledWith("sku-3", {
        code: "mailchimp-premium-gcc",
        region: "GCC",
        seatType: "seat",
        pricingOptions: [
          {
            billingCycle: "monthly",
            amount: "360",
            currency: "USD",
            entity: "user",
            ratePeriod: "monthly",
          },
          {
            billingCycle: "yearly",
            amount: "330",
            currency: "USD",
            entity: "user",
            ratePeriod: "year",
          },
        ],
        purchaseConstraints: {
          maxUnits: 300,
        },
        activationTimeline: "7 Working Days",
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

  it("shows stock disabled hints for unlimited offers across view pages", () => {
    const unlimitedSnapshot: DashboardSnapshot = {
      ...snapshot,
      products: [snapshot.products[0]!],
      plans: [snapshot.plans[0]!],
      skus: [
        {
          ...snapshot.skus[0]!,
          purchaseConstraints: {
            minUnits: 1,
          },
        },
      ],
      inventoryPools: [snapshot.inventoryPools[0]!],
    };

    const billingView = renderViewRoute(
      "/view/billing-options",
      unlimitedSnapshot,
    );

    expect(
      screen.getByText(/minimum units: 1 · maximum units: unlimited/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/activation timeline: 5 days/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/^minimum units$/i)).toBeInTheDocument();
    expect(screen.getByText(/^maximum units$/i)).toBeInTheDocument();
    expect(screen.getByText(/^1$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^unlimited$/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^stock tracking$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^available now$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /edit inventory for jira standard/i,
      }),
    ).not.toBeInTheDocument();

    billingView.unmount();

    renderViewRoute("/view/inventory-pools", unlimitedSnapshot);

    expect(screen.getByText(/^no tracked pools$/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /1 billing option currently uses unlimited inventory, so no tracked pool is needed/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit inventory for jira gcc/i }),
    ).not.toBeInTheDocument();
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
