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
  ratePeriod: string = billingCycle,
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
    purchaseType: "subscription" as const,
    pricingOption: pricingOption("monthly", "18"),
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

async function selectComboboxOption(
  comboboxLabel: RegExp,
  optionLabel: RegExp,
) {
  await act(async () => {
    fireEvent.click(screen.getByRole("combobox", { name: comboboxLabel }));
  });

  await act(async () => {
    fireEvent.click(screen.getByRole("option", { name: optionLabel }));
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
        screen.getByDisplayValue("jira-best-value-gcc-monthly"),
      ).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/^e\.g\. 1$/i)).toHaveValue(1);
    expect(screen.getByPlaceholderText(/^e\.g\. 7$/i)).toHaveValue(7);
  });

  it("generates a one_time catalog code for perpetual licenses", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([
      {
        plan: "Standard",
        amount: "18",
        currency: "USD",
        entity: "user",
        period: "month",
      },
    ]);
    const addCatalogEntry = vi.spyOn(api, "addCatalogEntry").mockResolvedValue({
      ...catalogResponse,
      sku: {
        ...catalogResponse.sku,
        code: "jira-standard-gcc-one_time",
        purchaseType: "one_time" as const,
        pricingOption: pricingOption("one_time", "18"),
      },
    });
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

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("jira-standard-gcc-monthly"),
      ).toBeInTheDocument();
    });

    await selectComboboxOption(/purchase type/i, /perpetual license/i);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("jira-standard-gcc-one_time"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("combobox", { name: /billing cycle/i }),
    ).toBeDisabled();
    expect(getPricingAmountInput("one_time")).toHaveValue("18");

    const dialog = await openReviewDialog();

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", { name: /create offers/i }),
      );
    });

    await waitFor(() => {
      expect(addCatalogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: expect.objectContaining({
            code: "jira-standard-gcc-one_time",
            region: "GCC",
            purchaseType: "one_time",
            pricingOption: {
              billingCycle: "one_time",
              amount: "18",
              currency: "USD",
              entity: "user",
              ratePeriod: "one_time",
            },
            purchaseConstraints: {
              minUnits: 1,
            },
          }),
        }),
      );
    });
  });

  it("creates starting stock together with a single selected billing cycle", async () => {
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
      expect(
        screen.getByDisplayValue("jira-standard-gcc-monthly"),
      ).toBeInTheDocument();
      expect(getPricingAmountInput("monthly")).toHaveValue("18");
    });

    expect(
      screen.queryByRole("textbox", { name: /rate period/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /charged per/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.change(getPricingAmountInput("monthly"), {
        target: { value: "21" },
      });
      fireEvent.change(getDiscountedPriceInput("monthly"), {
        target: { value: "16.801" },
      });
      fireEvent.change(screen.getByPlaceholderText(/^e\.g\. 1$/i), {
        target: { value: "3" },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 500/i), {
        target: { value: "20" },
      });
    });

    expect(getDiscountedPriceInput("monthly")).toHaveValue("16.8");
    expect(getDiscountPercentageInput("monthly")).toHaveValue("20");
    expect(
      screen.queryByRole("textbox", { name: /^yearly price amount$/i }),
    ).not.toBeInTheDocument();

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
            code: "jira-standard-gcc-monthly",
            region: "GCC",
            purchaseType: "subscription",
            pricingOption: {
              billingCycle: "monthly",
              amount: "21",
              currency: "USD",
              entity: "user",
              ratePeriod: "monthly",
              discountPercentage: "20",
              discountedAmount: "16.8",
            },
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
      code: "jira-standard-india-monthly",
      region: "INDIA",
      seatType: "seat",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption("monthly", "1400", "INR"),
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
      expect(screen.getByDisplayValue("jira-standard-gcc-monthly")).toBeInTheDocument();
    });

    const indiaTab = screen.getByRole("tab", { name: /^india$/i });

    await act(async () => {
      fireEvent.mouseDown(indiaTab, {
        button: 0,
      });
      fireEvent.click(indiaTab);
    });

    await waitFor(() => {
      expect(indiaTab).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    const indiaPanel = screen.getByRole("tabpanel");

    await waitFor(() => {
      expect(
        within(indiaPanel).getByDisplayValue("jira-standard-india-monthly"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(
        within(indiaPanel).getByRole("textbox", {
          name: /^monthly price amount$/i,
        }),
        {
          target: { value: "1400" },
        },
      );
    });

    await act(async () => {
      fireEvent.click(
        within(indiaPanel).getByRole("combobox", { name: /^currency$/i }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /^INR$/i }));
    });

    await waitFor(() => {
      expect(
        within(indiaPanel).getByRole("combobox", { name: /^currency$/i }),
      ).toHaveTextContent("INR");
    });

    await act(async () => {
      fireEvent.change(
        within(indiaPanel).getByPlaceholderText(/e\.g\. 500/i),
        {
          target: { value: "25" },
        },
      );
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

    const indiaReviewTab = within(dialog).getByRole("tab", {
      name: /^india$/i,
    });

    await act(async () => {
      fireEvent.mouseDown(indiaReviewTab, {
        button: 0,
      });
      fireEvent.click(indiaReviewTab);
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
            code: "jira-standard-gcc-monthly",
            region: "GCC",
            purchaseType: "subscription",
            pricingOption: {
              billingCycle: "monthly",
              amount: "18",
              currency: "USD",
              entity: "user",
              ratePeriod: "monthly",
            },
          }),
        }),
      );
      expect(createSku).toHaveBeenCalledWith({
        planId: "plan-created-1",
        code: "jira-standard-india-monthly",
        region: "INDIA",
        seatType: "seat",
        purchaseType: "subscription",
        pricingOption: {
          billingCycle: "monthly",
          amount: "1400",
          currency: "INR",
          entity: "user",
          ratePeriod: "monthly",
        },
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
      code: "jira-enterprise-india-monthly",
      region: "INDIA",
      seatType: "seat",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption("monthly", "45"),
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
        code: "jira-enterprise-india-monthly",
        region: "INDIA",
        seatType: "seat",
        purchaseType: "subscription",
        pricingOption: {
          billingCycle: "monthly",
          amount: "45",
          currency: "USD",
          entity: "user",
          ratePeriod: "monthly",
        },
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

  it("suggests previous plan names and reuses the matching existing plan", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    const createPlan = vi.spyOn(api, "createPlan").mockResolvedValue({
      _id: "plan-existing-unused",
      productId: "product-existing-1",
      name: "Unused",
      planType: "standard",
      createdAt: "2026-03-12T00:00:00.000Z",
    });
    const createSku = vi.spyOn(api, "createSku").mockResolvedValue({
      _id: "sku-created-legacy-1",
      planId: "plan-existing-legacy-1",
      code: "jira-legacy-gcc-monthly",
      region: "GCC",
      seatType: "seat",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption("monthly", "25"),
      createdAt: "2026-03-12T00:00:00.000Z",
    });
    const runAction: ActionRunner = async (work) => {
      await work();
      return true;
    };

    const { container } = render(
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
              _id: "plan-existing-standard-1",
              productId: "product-existing-1",
              name: "Standard",
              planType: "standard",
              createdAt: "2026-03-11T00:00:00.000Z",
            },
            {
              _id: "plan-existing-legacy-1",
              productId: "product-existing-1",
              name: "Legacy",
              planType: "standard",
              createdAt: "2026-03-12T00:00:00.000Z",
            },
            {
              _id: "plan-other-product-1",
              productId: "product-other-1",
              name: "Do Not Show",
              planType: "standard",
              createdAt: "2026-03-12T00:00:00.000Z",
            },
          ],
        }}
        loading={false}
        runAction={runAction}
      />,
    );

    await searchAndSelectProduct();

    const planInput = await screen.findByPlaceholderText(/e\.g\. standard/i);

    expect(planInput).toHaveAttribute("list", "setup-plan-suggestions");
    expect(
      container.querySelector(
        'datalist#setup-plan-suggestions option[value="Legacy"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        'datalist#setup-plan-suggestions option[value="Do Not Show"]',
      ),
    ).toBeNull();

    await act(async () => {
      fireEvent.change(planInput, {
        target: { value: "Legacy" },
      });
    });

    await toggleRegion("GCC");

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("jira-legacy-gcc-monthly"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(getPricingAmountInput("monthly"), {
        target: { value: "25" },
      });
    });

    const dialog = await openReviewDialog();

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole("button", { name: /create offers/i }),
      );
    });

    await waitFor(() => {
      expect(createPlan).not.toHaveBeenCalled();
      expect(createSku).toHaveBeenCalledWith({
        planId: "plan-existing-legacy-1",
        code: "jira-legacy-gcc-monthly",
        region: "GCC",
        seatType: "seat",
        purchaseType: "subscription",
        pricingOption: {
          billingCycle: "monthly",
          amount: "25",
          currency: "USD",
          entity: "user",
          ratePeriod: "monthly",
        },
        purchaseConstraints: {
          minUnits: 1,
        },
        activationTimeline: "7",
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
              purchaseType: "subscription" as const,
              pricingOption: pricingOption("monthly", "18"),
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
