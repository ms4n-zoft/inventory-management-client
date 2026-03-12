import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionRunner } from "@/components/operations-app";
import { api } from "@/lib/api";
import type { DashboardSnapshot } from "@/types";

import { OverviewPage } from "./overview-page";

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
      _id: "pool-1",
      skuId: "sku-1",
      region: "GLOBAL",
      totalQuantity: 12,
      reservedQuantity: 2,
      allocatedQuantity: 1,
      updatedAt: "2026-03-12T00:00:00.000Z",
    },
  ],
  reservations: [],
  entitlements: [],
  auditLogs: [],
};

const runAction: ActionRunner = async (work) => {
  await work();
  return true;
};

describe("overview page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("edits billing from the view dialog", async () => {
    const updateSku = vi.spyOn(api, "updateSku").mockResolvedValue({
      ...snapshot.skus[0]!,
      pricePerUnit: {
        amount: "25",
        currency: "USD",
        entity: "user",
        ratePeriod: "month",
      },
    });

    render(
      <MemoryRouter>
        <OverviewPage
          snapshot={snapshot}
          loading={false}
          activeReservations={[]}
          runAction={runAction}
        />
      </MemoryRouter>,
    );

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
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save billing/i }));
    });

    await waitFor(() => {
      expect(updateSku).toHaveBeenCalledWith("sku-1", {
        code: "jira-standard-monthly",
        billingPeriod: "monthly",
        region: undefined,
        seatType: "seat",
        pricePerUnit: {
          amount: "25",
          currency: "USD",
          entity: "user",
          ratePeriod: "month",
        },
      });
    });
  });

  it("edits inventory from the view dialog", async () => {
    const adjustInventory = vi
      .spyOn(api, "adjustInventory")
      .mockResolvedValue({});

    render(
      <MemoryRouter>
        <OverviewPage
          snapshot={snapshot}
          loading={false}
          activeReservations={[]}
          runAction={runAction}
        />
      </MemoryRouter>,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /edit inventory for jira global/i,
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
        region: "GLOBAL",
        change: 6,
        reason: "MANUAL_ADD",
        actor: "operations",
      });
    });
  });
});
