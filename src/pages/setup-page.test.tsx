import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import { api } from "@/lib/api";
import type { DashboardSnapshot } from "@/types";

import { SetupPage } from "./setup-page";

const emptySnapshot: DashboardSnapshot = {
  products: [],
  plans: [],
  skus: [],
  inventoryPools: [],
  reservations: [],
  entitlements: [],
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
    code: "jira-standard-monthly",
    billingPeriod: "monthly" as const,
    seatType: "seat" as const,
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

describe("setup page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "searchProducts").mockResolvedValue([searchResult]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets operators choose a fetched plan from radio cards", async () => {
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

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /best value/i })).toBeChecked();
      expect(screen.getByPlaceholderText(/e\.g\. 12/i)).toHaveValue("20");
      expect(
        screen.getByDisplayValue("jira-best-value-monthly"),
      ).toBeInTheDocument();
    });
  });

  it("creates starting stock together with the billing option", async () => {
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
            code: "jira-standard-monthly",
            pricePerUnit: {
              amount: "21",
              currency: "USD",
              entity: "user",
              ratePeriod: "month",
            },
          }),
        }),
      );
      expect(createInventoryPool).toHaveBeenCalledWith({
        skuId: "sku-created-1",
        region: "GLOBAL",
        totalQuantity: 24,
      });
    });
  });

  it("keeps save disabled for manual plans until a price is entered", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    const addCatalogEntry = vi
      .spyOn(api, "addCatalogEntry")
      .mockResolvedValue(catalogResponse);
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

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/e\.g\. standard/i),
      ).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", {
      name: /save setup/i,
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. standard/i), {
        target: { value: "Enterprise" },
      });
    });

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("jira-enterprise-monthly"),
      ).toBeInTheDocument();
    });

    expect(submitButton).toBeDisabled();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12/i), {
        target: { value: "45" },
      });
    });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(addCatalogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: { name: "Enterprise", planType: "standard" },
          sku: expect.objectContaining({
            code: "jira-enterprise-monthly",
            pricePerUnit: {
              amount: "45",
              currency: "USD",
              entity: undefined,
              ratePeriod: undefined,
            },
          }),
        }),
      );
    });
  });

  it("reuses an existing product to create a new plan and starting stock", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    const addCatalogEntry = vi
      .spyOn(api, "addCatalogEntry")
      .mockResolvedValue(catalogResponse);
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
      code: "jira-enterprise-monthly",
      billingPeriod: "monthly",
      seatType: "seat",
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
      expect(addCatalogEntry).not.toHaveBeenCalled();
      expect(createPlan).toHaveBeenCalledWith({
        productId: "product-existing-1",
        name: "Enterprise",
        planType: "standard",
      });
      expect(createSku).toHaveBeenCalledWith({
        planId: "plan-existing-1",
        code: "jira-enterprise-monthly",
        billingPeriod: "monthly",
        region: undefined,
        seatType: "seat",
        pricePerUnit: {
          amount: "45",
          currency: "USD",
          entity: undefined,
          ratePeriod: undefined,
        },
      });
      expect(createInventoryPool).toHaveBeenCalledWith({
        skuId: "sku-existing-1",
        region: "GLOBAL",
        totalQuantity: 8,
      });
    });
  });

  it("loads an existing setup back into the form and updates stock", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    const adjustInventory = vi
      .spyOn(api, "adjustInventory")
      .mockResolvedValue({});
    const addCatalogEntry = vi
      .spyOn(api, "addCatalogEntry")
      .mockResolvedValue(catalogResponse);
    const createSku = vi.spyOn(api, "createSku").mockResolvedValue({
      _id: "sku-unused",
      planId: "plan-unused",
      code: "unused",
      billingPeriod: "monthly",
      seatType: "seat",
      createdAt: "2026-03-12T00:00:00.000Z",
    });
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
              code: "jira-standard-monthly",
              billingPeriod: "monthly",
              seatType: "seat",
              pricePerUnit: {
                amount: "18",
                currency: "USD",
                entity: "user",
                ratePeriod: "month",
              },
              createdAt: "2026-03-12T00:00:00.000Z",
            },
          ],
          inventoryPools: [
            {
              _id: "pool-existing-1",
              skuId: "sku-existing-1",
              region: "GLOBAL",
              totalQuantity: 12,
              reservedQuantity: 2,
              allocatedQuantity: 1,
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
      expect(
        screen.getByDisplayValue("jira-standard-monthly"),
      ).toBeInTheDocument();
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
      expect(addCatalogEntry).not.toHaveBeenCalled();
      expect(createSku).not.toHaveBeenCalled();
      expect(adjustInventory).toHaveBeenCalledWith({
        skuId: "sku-existing-1",
        region: "GLOBAL",
        change: 6,
        reason: "MANUAL_ADD",
        actor: "operations",
      });
    });
  });
});
