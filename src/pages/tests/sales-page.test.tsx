import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SaleListEntry } from "@/types";

import { SalesPage } from "../sales-page";

const sales: SaleListEntry[] = [
  {
    sale: {
      _id: "sale-1",
      skuId: "sku-1",
      skuCode: "pipedrive-starter-pack-india",
      quantity: 2,
      partner: {
        name: "Zoftware Reseller",
        saleReference: "sale-1001",
      },
      customer: {
        name: "Ayesha Khan",
        email: "ayesha@example.com",
        phone: "+971500000000",
        additionalInfo: {
          company: "Example Trading LLC",
          country: "UAE",
        },
      },
      payment: {
        provider: "stripe",
        transactionId: "txn-1001",
        amount: "59.00",
        currency: "USD",
        status: "captured",
        metadata: {
          gatewayOrderId: "gw-1001",
        },
      },
      createdAt: "2026-03-16T08:00:00.000Z",
    },
    sku: {
      _id: "sku-1",
      planId: "plan-1",
      code: "pipedrive-starter-pack-india",
      region: "INDIA",
      seatType: "seat",
      pricingOptions: [
        {
          billingCycle: "monthly",
          amount: "3060",
          currency: "INR",
          entity: "user",
          ratePeriod: "month",
        },
      ],
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 25,
      },
      createdAt: "2026-03-16T00:00:00.000Z",
    },
    plan: {
      _id: "plan-1",
      productId: "product-1",
      name: "Starter Pack",
      planType: "standard",
      createdAt: "2026-03-16T00:00:00.000Z",
    },
    product: {
      _id: "product-1",
      externalId: "pipedrive",
      name: "Pipedrive",
      vendor: "Pipedrive",
      description: "CRM",
      logoUrl: "",
      createdAt: "2026-03-16T00:00:00.000Z",
    },
  },
  {
    sale: {
      _id: "sale-2",
      skuId: "sku-2",
      skuCode: "slack-business-gcc",
      quantity: 3,
      partner: {
        name: "Channel Partner One",
        saleReference: "sale-2001",
      },
      customer: {
        name: "Fatima Noor",
        email: "fatima@example.ae",
        phone: "+971500000111",
      },
      payment: {
        provider: "checkout",
        transactionId: "txn-2001",
        amount: "36.126",
        currency: "USD",
        status: "captured",
      },
      createdAt: "2026-03-15T08:00:00.000Z",
    },
    sku: {
      _id: "sku-2",
      planId: "plan-2",
      code: "slack-business-gcc",
      region: "GCC",
      seatType: "seat",
      pricingOptions: [
        {
          billingCycle: "monthly",
          amount: "12",
          currency: "USD",
          entity: "user",
          ratePeriod: "month",
        },
      ],
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 20,
      },
      createdAt: "2026-03-16T00:00:00.000Z",
    },
    plan: {
      _id: "plan-2",
      productId: "product-2",
      name: "Business",
      planType: "standard",
      createdAt: "2026-03-16T00:00:00.000Z",
    },
    product: {
      _id: "product-2",
      externalId: "slack",
      name: "Slack",
      vendor: "Salesforce",
      description: "Chat",
      logoUrl: "",
      createdAt: "2026-03-16T00:00:00.000Z",
    },
  },
];

describe("sales page", () => {
  it("renders recorded sales and filters by search query", async () => {
    render(<SalesPage sales={sales} loading={false} />);

    expect(screen.getByText("Pipedrive")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText(/ayesha@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/gatewayOrderId: gw-1001/i)).toBeInTheDocument();
    expect(screen.getByText(/36\.13 usd/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(
          /search by product, sku code, partner, customer, or transaction/i,
        ),
        {
          target: { value: "channel partner one" },
        },
      );
    });

    expect(screen.queryByText("Pipedrive")).not.toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });

  it("shows an empty state when no sales exist", () => {
    render(<SalesPage sales={[]} loading={false} />);

    expect(screen.getByText(/no sales recorded/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /seed or record a partner sale and it will appear here/i,
      ),
    ).toBeInTheDocument();
  });
});
