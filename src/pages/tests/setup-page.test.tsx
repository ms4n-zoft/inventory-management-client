import { act } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import { api } from "@/lib/api";
import type { DashboardSnapshot, PricePerUnit } from "@/types";

import { SetupPage } from "../setup-page";

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
      minUnits: 1,
    },
    activationTimeline: "5 Days",
    createdAt: "2026-03-12T00:00:00.000Z",
  },
};

function getStockSection(region: string) {
  return screen.getByRole("region", {
    name: new RegExp(`^${region} stock$`, "i"),
  });
}

function getStockQuantityInput(region: string) {
  return within(getStockSection(region)).getByRole("spinbutton");
}

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

async function toggleRegion(optionLabel: string) {
  const optionPattern = new RegExp(`^${optionLabel}$`, "i");

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: optionPattern }));
  });
}

async function toggleBillingCycle(optionLabel: string) {
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`^${optionLabel}$`, "i"),
      }),
    );
  });
}

async function openReviewDialog() {
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: /review and create offers/i }),
    );
  });

  return screen.getByRole("dialog");
}

function getPricingAmountInput(billingCycle: PricePerUnit["billingCycle"]) {
  const label =
    billingCycle === "one_time"
      ? /one time price amount/i
      : new RegExp(`^${billingCycle} price amount$`, "i");

  return screen.getByRole("textbox", { name: label });
}

function getDiscountPercentageInput(
  billingCycle: PricePerUnit["billingCycle"],
) {
  const label =
    billingCycle === "one_time"
      ? /one time discount percentage/i
      : new RegExp(`^${billingCycle} discount percentage$`, "i");

  return screen.getByRole("textbox", { name: label });
}

function getDiscountedPriceInput(billingCycle: PricePerUnit["billingCycle"]) {
  const label =
    billingCycle === "one_time"
      ? /one time discounted price/i
      : new RegExp(`^${billingCycle} discounted price$`, "i");

  return screen.getByRole("textbox", { name: label });
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

    await toggleRegion("GCC");

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("jira-best-value-gcc"),
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/^e\.g\. 1$/i)).toHaveValue(1);
    expect(screen.getByPlaceholderText(/^e\.g\. 7$/i)).toHaveValue(7);
  });

  it("creates starting stock together with separate monthly and yearly pricing", async () => {
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
    await toggleRegion("GCC");

    expect(
      screen.queryByRole("region", { name: /^gcc stock$/i }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getPricingAmountInput("monthly")).toHaveValue("18");
    });

    expect(
      screen.queryByRole("textbox", { name: /rate period/i }),
    ).not.toBeInTheDocument();

    await toggleBillingCycle("yearly");

    expect(screen.getByRole("button", { name: /^monthly$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^yearly$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(getPricingAmountInput("yearly")).toHaveValue("216");
    expect(
      screen.getByRole("combobox", { name: /^charged per$/i }),
    ).toHaveTextContent("user");

    await act(async () => {
      fireEvent.change(getPricingAmountInput("monthly"), {
        target: { value: "21" },
      });
      fireEvent.change(getDiscountedPriceInput("monthly"), {
        target: { value: "16.801" },
      });
      fireEvent.change(getDiscountedPriceInput("yearly"), {
        target: { value: "188.997" },
      });
      fireEvent.change(screen.getByPlaceholderText(/^e\.g\. 1$/i), {
        target: { value: "3" },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 500/i), {
        target: { value: "20" },
      });
    });

    expect(getDiscountedPriceInput("monthly")).toHaveValue("16.8");
    expect(getDiscountedPriceInput("yearly")).toHaveValue("189");
    expect(getDiscountPercentageInput("monthly")).toHaveValue("20");
    expect(getDiscountPercentageInput("yearly")).toHaveValue("25");

    await waitFor(() => {
      expect(getStockQuantityInput("GCC")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(getStockQuantityInput("GCC"), {
        target: { value: "24" },
      });
    });

    const dialog = await openReviewDialog();

    expect(
      within(dialog).getByRole("tab", { name: /gcc/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/review selected offers/i),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", { name: /create offers/i }),
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
                discountPercentage: "20",
                discountedAmount: "16.8",
              },
              {
                billingCycle: "yearly",
                amount: "252",
                currency: "USD",
                entity: "user",
                ratePeriod: "year",
                discountPercentage: "25",
                discountedAmount: "189",
              },
            ],
            purchaseConstraints: {
              minUnits: 3,
              maxUnits: 20,
            },
          }),
        }),
      );
      expect(createInventoryPool).toHaveBeenCalledWith({
        skuId: "sku-created-1",
        totalQuantity: 24,
      });
    });
  });

  it("creates separate regional offers from multiple selected tabs", async () => {
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
    const createSku = vi.spyOn(api, "createSku").mockResolvedValue({
      _id: "sku-created-2",
      planId: "plan-created-1",
      code: "jira-standard-india",
      region: "INDIA",
      seatType: "seat",
      pricingOptions: [pricingOption("monthly", "1400", "INR")],
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
        snapshot={emptySnapshot}
        loading={false}
        runAction={runAction}
      />,
    );

    await searchAndSelectProduct();
    await toggleRegion("GCC");

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 500/i), {
        target: { value: "20" },
      });
    });

    await waitFor(() => {
      expect(getStockQuantityInput("GCC")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(getStockQuantityInput("GCC"), {
        target: { value: "10" },
      });
    });

    await toggleRegion("INDIA");

    await waitFor(() => {
      expect(screen.getByDisplayValue("jira-standard-gcc")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("tab", { name: /india/i }), {
        button: 0,
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /india/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12/i), {
        target: { value: "1400" },
      });
    });

    await selectComboboxOption(0, "INR");

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 500/i), {
        target: { value: "25" },
      });
    });

    await waitFor(() => {
      expect(getStockQuantityInput("INDIA")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(getStockQuantityInput("INDIA"), {
        target: { value: "5" },
      });
    });

    const dialog = await openReviewDialog();

    expect(
      within(dialog).getByRole("tab", { name: /gcc/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("tab", { name: /india/i }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.mouseDown(within(dialog).getByRole("tab", { name: /india/i }), {
        button: 0,
      });
    });

    expect(
      within(dialog).getByText(/current stock: 0 -> 5|starting stock: 5/i),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", { name: /create offers/i }),
      );
    });

    await waitFor(() => {
      expect(addCatalogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: expect.objectContaining({
            code: "jira-standard-gcc",
            region: "GCC",
            pricingOptions: [
              {
                billingCycle: "monthly",
                amount: "18",
                currency: "USD",
                entity: "user",
                ratePeriod: "month",
              },
            ],
          }),
        }),
      );
      expect(createSku).toHaveBeenCalledWith({
        planId: "plan-created-1",
        code: "jira-standard-india",
        region: "INDIA",
        seatType: "seat",
        pricingOptions: [
          {
            billingCycle: "monthly",
            amount: "1400",
            currency: "INR",
            entity: "user",
            ratePeriod: "month",
          },
        ],
        purchaseConstraints: {
          minUnits: 1,
          maxUnits: 25,
        },
        activationTimeline: "7",
      });
      expect(createInventoryPool).toHaveBeenNthCalledWith(1, {
        skuId: "sku-created-1",
        totalQuantity: 10,
      });
      expect(createInventoryPool).toHaveBeenNthCalledWith(2, {
        skuId: "sku-created-2",
        totalQuantity: 5,
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

    await toggleRegion("INDIA");

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12/i), {
        target: { value: "45" },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 500/i), {
        target: { value: "12" },
      });
    });

    await waitFor(() => {
      expect(getStockQuantityInput("INDIA")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(getStockQuantityInput("INDIA"), {
        target: { value: "8" },
      });
    });

    const dialog = await openReviewDialog();

    expect(
      within(dialog).getByRole("tab", { name: /india/i }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", { name: /create offers/i }),
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
            entity: "user",
            ratePeriod: undefined,
          },
        ],
        purchaseConstraints: {
          minUnits: 1,
          maxUnits: 12,
        },
        activationTimeline: "7",
      });
      expect(createInventoryPool).toHaveBeenCalledWith({
        skuId: "sku-existing-1",
        totalQuantity: 8,
      });
    });
  });

  it("does not render the existing setup continuation panel", () => {
    const runAction: ActionRunner = async () => true;

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
                minUnits: 1,
                maxUnits: 15,
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

    expect(
      screen.queryByText(/continue from an existing setup/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit setup/i }),
    ).not.toBeInTheDocument();
  });

  it("hides starting stock when the selected region is unlimited", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([
      {
        plan: "Standard",
        amount: "18",
        currency: "USD",
        entity: "user",
        period: "month",
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
    await toggleRegion("GCC");

    expect(
      screen.queryByRole("region", { name: /^gcc stock$/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/set starting stock/i)).not.toBeInTheDocument();

    const dialog = await openReviewDialog();

    expect(
      within(dialog).getByText(
        /stock is not tracked because maximum units is unlimited/i,
      ),
    ).toBeInTheDocument();
  });
});
