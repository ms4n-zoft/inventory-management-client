import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import { api } from "@/lib/api";
import type { DashboardSnapshot } from "@/types";

import { CatalogPage } from "./catalog-page";

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

describe("catalog page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "searchProducts").mockResolvedValue([searchResult]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits edited fetched pricing instead of the untouched source value", async () => {
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
      .mockResolvedValue({});
    const runAction: ActionRunner = async (work) => {
      await work();
      return true;
    };

    render(
      <CatalogPage
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
      fireEvent.change(
        screen.getByPlaceholderText(/jira-standard-monthly-us/i),
        {
          target: { value: "jira-standard-monthly-us" },
        },
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /add to catalog/i }));
    });

    await waitFor(() => {
      expect(addCatalogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: { name: "Standard", planType: "standard" },
          sku: expect.objectContaining({
            code: "jira-standard-monthly-us",
            pricePerUnit: {
              amount: "21",
              currency: "USD",
              entity: "user",
              ratePeriod: "month",
            },
          }),
        }),
      );
    });
  });

  it("keeps add disabled for manual plans until a price is entered", async () => {
    vi.spyOn(api, "getProductPricing").mockResolvedValue([]);
    const addCatalogEntry = vi
      .spyOn(api, "addCatalogEntry")
      .mockResolvedValue({});
    const runAction: ActionRunner = async (work) => {
      await work();
      return true;
    };

    render(
      <CatalogPage
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
      name: /add to catalog/i,
    });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. standard/i), {
        target: { value: "Enterprise" },
      });
      fireEvent.change(
        screen.getByPlaceholderText(/jira-standard-monthly-us/i),
        {
          target: { value: "jira-enterprise-monthly-us" },
        },
      );
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
            code: "jira-enterprise-monthly-us",
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
});
