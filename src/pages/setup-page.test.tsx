import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import { api } from "@/lib/api";
import type { DashboardSnapshot, PricePerUnit } from "@/types";

import { SetupPage } from "./setup-page";

const emptySnapshot: DashboardSnapshot = {
  products: [],
  plans: [],
  skus: [],
  inventoryPools: [],
  auditLogs: [],
};

const searchResult = {
  id: "jira-product-1",
  slug: "jira",
  name: "Jira",
  vendor: "Atlassian",
  description: "Project tracking",
  logoUrl: "",
};

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

const catalogResponse = {
  product: {
    _id: "product-created-1",
    externalId: "jira-product-1",
    name: "Jira",
    vendor: "Atlassian",
    description: "Project tracking",
    logoUrl: "",
    createdAt: "2026-03-12T00:00:00.000Z",
  },
  plan: {
    _id: "plan-created-1",
    productId: "product-created-1",
    name: "Standard",
    planType: "standard" as const,
    createdAt: "2026-03-12T00:00:00.000Z",
  },
  sku: {
    _id: "sku-created-1",
    planId: "plan-created-1",
    code: "jira-standard-gcc",
    region: "GCC" as const,
    seatType: "seat" as const,
    pricingOptions: [pricingOption("monthly", "18")],
    purchaseConstraints: {
      raw: "1 / as many needed",
      minUnits: 1,
    },
    activationTimeline: "5 Days",
    createdAt: "2026-03-12T00:00:00.000Z",
  },
};

async function searchAndSelectProduct() {
  await act(async () => {
    fireEvent.change(screen.getByPlaceholderText(/mailchimp, twilio, zoho/i), {
      target: { value: "ji" },
    });
  });

  await waitFor(
    () => {
      expect(screen.getByRole("button", { name: /jira/i })).toBeInTheDocument();
    },
    { timeout: 1500 },
  );

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /jira/i }));
  });
}

async function selectComboboxOption(index: number, optionLabel: string) {
  await act(async () => {
    fireEvent.click(screen.getAllByRole("combobox")[index]!);
  });

  const candidates = screen.getAllByText(new RegExp(`^${optionLabel}$`, "i"));
  const optionNode = candidates.find(
    (candidate) => candidate.tagName !== "OPTION",
  );

  await act(async () => {
    fireEvent.click(optionNode ?? candidates[0]!);
  });
}

describe("setup page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(api, "searchProducts").mockResolvedValue([searchResult]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets operators choose a fetched plan and region to generate a regional code", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([
      {
        plan: "Premium",
        amount: "350",
        currency: "USD",
        entity: "User",
        period: "Month",
      },
      {
        plan: "Best Value",
        amount: "20",
        currency: "USD",
        entity: "User",
        period: "Month",
      },
    ]);
    const runAction: ActionRunner = async () => true;

    render(
      <SetupPage
        snapshot={emptySnapshot}
        loading={false}
        runAction={runAction}
      />,
    );

    await searchAndSelectProduct();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /premium/i })).toBeChecked();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: /best value/i }));
    });

    await selectComboboxOption(0, "GCC");

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("jira-best-value-gcc"),
      ).toBeInTheDocument();
    });
  });

  it("creates starting stock together with the regional offer", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([
      {
        plan: "Standard",
        amount: "18",
        currency: "USD",
        entity: "user",
        period: "month",
      },
    ]);
    const addCatalogEntry = vi
      .spyOn(api, "addCatalogEntry")
      .mockResolvedValue(catalogResponse);
    const createInventoryPool = vi
      .spyOn(api, "createInventoryPool")
      .mockResolvedValue({});
    const runAction: ActionRunner = async (work) => {
      await work();
      return true;
    };

    render(
      <SetupPage
        snapshot={emptySnapshot}
        loading={false}
        runAction={runAction}
      />,
    );

    await searchAndSelectProduct();
    await selectComboboxOption(0, "GCC");

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. 12/i)).toHaveValue("18");
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12/i), {
        target: { value: "21" },
      });
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "24" },
      });
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /save and track stock/i }),
      );
    });

    await waitFor(() => {
      expect(addCatalogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: { name: "Standard", planType: "standard" },
          sku: expect.objectContaining({
            code: "jira-standard-gcc",
            region: "GCC",
            pricingOptions: [
              {
                billingCycle: "monthly",
                amount: "21",
                currency: "USD",
                entity: "user",
                ratePeriod: "month",
              },
            ],
          }),
        }),
      );
      expect(createInventoryPool).toHaveBeenCalledWith({
        skuId: "sku-created-1",
        totalQuantity: 24,
      });
    });
  });

  it("reuses an existing product to create a new plan and starting stock", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    vi.spyOn(api, "addCatalogEntry").mockResolvedValue(catalogResponse);
    const createPlan = vi.spyOn(api, "createPlan").mockResolvedValue({
      _id: "plan-existing-1",
      productId: "product-existing-1",
      name: "Enterprise",
      planType: "standard",
      createdAt: "2026-03-12T00:00:00.000Z",
    });
    const createSku = vi.spyOn(api, "createSku").mockResolvedValue({
      _id: "sku-existing-1",
      planId: "plan-existing-1",
      code: "jira-enterprise-india",
      region: "INDIA",
      seatType: "seat",
      pricingOptions: [pricingOption("monthly", "45")],
      createdAt: "2026-03-12T00:00:00.000Z",
    });
    const createInventoryPool = vi
      .spyOn(api, "createInventoryPool")
      .mockResolvedValue({});
    const runAction: ActionRunner = async (work) => {
      await work();
      return true;
    };

    render(
      <SetupPage
        snapshot={{
          ...emptySnapshot,
          products: [
            {
              _id: "product-existing-1",
              externalId: "jira-product-1",
              name: "Jira",
              vendor: "Atlassian",
              description: "Project tracking",
              logoUrl: "",
              createdAt: "2026-03-12T00:00:00.000Z",
            },
          ],
        }}
        loading={false}
        runAction={runAction}
      />,
    );

    await searchAndSelectProduct();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/e\.g\. standard/i),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. standard/i), {
        target: { value: "Enterprise" },
      });
    });

    await selectComboboxOption(0, "INDIA");

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12/i), {
        target: { value: "45" },
      });
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "8" },
      });
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /save and track stock/i }),
      );
    });

    await waitFor(() => {
      expect(createPlan).toHaveBeenCalledWith({
        productId: "product-existing-1",
        name: "Enterprise",
        planType: "standard",
      });
      expect(createSku).toHaveBeenCalledWith({
        planId: "plan-existing-1",
        code: "jira-enterprise-india",
        region: "INDIA",
        seatType: "seat",
        pricingOptions: [
          {
            billingCycle: "monthly",
            amount: "45",
            currency: "USD",
            entity: undefined,
            ratePeriod: undefined,
          },
        ],
        purchaseConstraints: undefined,
        activationTimeline: undefined,
      });
      expect(createInventoryPool).toHaveBeenCalledWith({
        skuId: "sku-existing-1",
        totalQuantity: 8,
      });
    });
  });

  it("loads an existing setup back into the form and updates stock", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    const adjustInventory = vi
      .spyOn(api, "adjustInventory")
      .mockResolvedValue({});
    const runAction: ActionRunner = async (work) => {
      await work();
      return true;
    };

    render(
      <SetupPage
        snapshot={{
          ...emptySnapshot,
          products: [
            {
              _id: "product-existing-1",
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
              _id: "plan-existing-1",
              productId: "product-existing-1",
              name: "Standard",
              planType: "standard",
              createdAt: "2026-03-12T00:00:00.000Z",
            },
          ],
          skus: [
            {
              _id: "sku-existing-1",
              planId: "plan-existing-1",
              code: "jira-standard-gcc",
              region: "GCC",
              seatType: "seat",
              pricingOptions: [pricingOption("monthly", "18")],
              purchaseConstraints: {
                raw: "1 / as many needed",
                minUnits: 1,
              },
              activationTimeline: "5 Days",
              createdAt: "2026-03-12T00:00:00.000Z",
            },
          ],
          inventoryPools: [
            {
              _id: "pool-existing-1",
              skuId: "sku-existing-1",
              totalQuantity: 12,
              updatedAt: "2026-03-12T00:00:00.000Z",
            },
          ],
        }}
        loading={false}
        runAction={runAction}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /edit setup/i }));
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("jira-standard-gcc")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toHaveValue(12);
    });

    await act(async () => {
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "18" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /update stock/i }));
    });

    await waitFor(() => {
      expect(adjustInventory).toHaveBeenCalledWith({
        skuId: "sku-existing-1",
        change: 6,
        reason: "MANUAL_ADD",
        actor: "operations",
      });
    });
  });
});
