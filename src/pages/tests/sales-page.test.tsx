import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import type { SaleListEntry } from "@/types";

vi.mock("@/lib/api", () => ({
  api: {
    getSku: vi.fn(),
    upsertSaleActivation: vi.fn(),
  },
}));

import { SalesPage } from "../sales-page";

function byNormalizedText(expected: string) {
  const normalize = (value?: string | null) =>
    value?.replace(/\s+/g, " ").trim();

  return (_: string, element?: Element | null) => {
    if (!element) {
      return false;
    }

    const text = normalize(element.textContent);
    if (text !== expected) {
      return false;
    }

    return Array.from(element.children).every(
      (child) => normalize(child.textContent) !== expected,
    );
  };
}

function byNormalizedTextPrefix(expectedPrefix: string) {
  const normalize = (value?: string | null) =>
    value?.replace(/\s+/g, " ").trim();

  return (_: string, element?: Element | null) => {
    if (!element) {
      return false;
    }

    const text = normalize(element.textContent);
    if (!text?.startsWith(expectedPrefix)) {
      return false;
    }

    return Array.from(element.children).every((child) => {
      const childText = normalize(child.textContent);
      return !childText?.startsWith(expectedPrefix);
    });
  };
}

function pricingOption(
  billingCycle: "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time",
  amount: string,
  currency = "USD",
  entity = "user",
  ratePeriod: string = billingCycle,
) {
  return {
    billingCycle,
    amount,
    currency,
    entity,
    ratePeriod,
  } as const;
}

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
      purchaseType: "subscription" as const,
      pricingOption: pricingOption("monthly", "3060", "INR"),
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
      purchaseType: "one_time" as const,
      pricingOption: pricingOption("monthly", "12"),
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
  beforeEach(() => {
    vi.mocked(api.getSku).mockReset();
    vi.mocked(api.upsertSaleActivation).mockReset();
  });

  it("renders recorded sales and filters by search query", async () => {
    render(<SalesPage sales={sales} loading={false} />);

    expect(screen.getByText("Pipedrive")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText(/ayesha@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(byNormalizedText("gatewayOrderId: gw-1001"))).toBeInTheDocument();
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

  it("loads and caches sku details when a row is expanded", async () => {
    vi.mocked(api.getSku).mockResolvedValue({
      _id: "sku-1",
      planId: "plan-1",
      code: "pipedrive-starter-pack-india",
      region: "INDIA",
      seatType: "seat",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption("monthly", "3060", "INR"),
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 25,
      },
      activationTimeline: "7 working days",
      isBillingDisabled: false,
      createdAt: "2026-03-16T00:00:00.000Z",
    });

    render(<SalesPage sales={sales} loading={false} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /show sku details for pipedrive/i,
      }),
    );

    expect(api.getSku).toHaveBeenCalledWith("sku-1");

    expect(await screen.findByText(/activation timeline:/i)).toBeInTheDocument();
    expect(screen.getByText(/7 working days/i)).toBeInTheDocument();
    expect(screen.getByText(/3060/i)).toBeInTheDocument();
    expect(screen.getByText(/^subscription$/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /hide sku details for pipedrive/i,
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText(/7 working days/i)).not.toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /show sku details for pipedrive/i,
      }),
    );

    await screen.findByText(/7 working days/i);
    expect(api.getSku).toHaveBeenCalledTimes(1);
  });

  it("shows a one-time tag when the loaded sku only has one_time pricing", async () => {
    vi.mocked(api.getSku).mockResolvedValue({
      _id: "sku-2",
      planId: "plan-2",
      code: "slack-business-gcc",
      region: "GCC",
      seatType: "seat",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption(
        "one_time",
        "299",
        "USD",
        "license",
        "one time",
      ),
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 20,
      },
      activationTimeline: "Instant",
      isBillingDisabled: false,
      createdAt: "2026-03-16T00:00:00.000Z",
    });

    render(<SalesPage sales={sales} loading={false} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /show sku details for slack/i,
      }),
    );

    expect(await screen.findByText(/^one-time$/i)).toBeInTheDocument();
  });

  it("previews completion details and saves optional license data", async () => {
    vi.mocked(api.upsertSaleActivation).mockResolvedValue({
      _id: "activation-1",
      saleId: "sale-1",
      skuId: "sku-1",
      customerEmail: "ayesha@example.com",
      purchaseType: "subscription",
      billingCyclePurchased: "monthly",
      fulfillmentMode: "email_based",
      accessStartDate: "2026-04-01T00:00:00.000Z",
      accessEndDate: "2026-05-01T00:00:00.000Z",
      nextRenewalDate: "2026-05-01T00:00:00.000Z",
      licenseKeyMasked: "********1234",
      licenseDocument: {
        fileName: "zoom-license.pdf",
        uploadedAt: "2026-04-01T00:00:00.000Z",
      },
      activationStatus: "completed",
      notificationStatus: "not_queued",
      activatedAt: "2026-04-01T00:00:00.000Z",
      activatedBy: "ops@example.com",
      notes: "Customer credentials shared with procurement.",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    render(<SalesPage sales={sales} loading={false} />);

    fireEvent.click(screen.getAllByRole("button", { name: /^update$/i })[0]!);

    expect(screen.queryByText(/^fulfillment mode$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^purchase type$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/^billing cycle purchased$/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/next renewal date/i),
    ).not.toBeInTheDocument();
    const accessEndDateInput = screen.getByLabelText(
      /renewal \/ access end date/i,
    ) as HTMLInputElement;
    expect(accessEndDateInput.value).toBe("");

    fireEvent.change(screen.getByLabelText(/access start date/i), {
      target: { value: "2026-04-01" },
    });

    await waitFor(() => {
      expect(accessEndDateInput.value).toBe("2026-05-01");
    });
    fireEvent.change(accessEndDateInput, {
      target: { value: "2026-05-15" },
    });

    fireEvent.change(screen.getByLabelText(/license key/i), {
      target: { value: "ZOOM-LIC-1234" },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: "Customer credentials shared with procurement." },
    });

    const file = new File(["license-body"], "zoom-license.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode("license-body").buffer,
    });
    fireEvent.change(screen.getByLabelText(/license document/i), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /preview completion/i }));

    expect(await screen.findByText(/completion preview/i)).toBeInTheDocument();
    expect(screen.getByText(/access start date: 2026-04-01/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        byNormalizedText("Renewal / access end date: 2026-05-15"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/license key: \*+1234/i)).toBeInTheDocument();
    expect(
      screen.getByText(/license document: zoom-license\.pdf/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /complete sale/i }));

    await waitFor(() => {
      expect(api.upsertSaleActivation).toHaveBeenCalledWith("sale-1", {
        purchaseType: "subscription",
        billingCyclePurchased: "monthly",
        fulfillmentMode: "email_based",
        accessStartDate: "2026-04-01",
        accessEndDate: "2026-05-15",
        nextRenewalDate: "2026-05-15",
        licenseKey: "ZOOM-LIC-1234",
        licenseDocument: {
          fileName: "zoom-license.pdf",
          contentType: "application/pdf",
          contentBase64: "bGljZW5zZS1ib2R5",
          uploadedAt: undefined,
        },
        activationStatus: "completed",
        notificationStatus: "not_queued",
        notes: "Customer credentials shared with procurement.",
      });
    });
  });

  it("hides the renewal and access end date field for one-time skus", async () => {
    const oneTimeSales: SaleListEntry[] = [
      {
        sale: {
          _id: "sale-one-time",
          skuId: "sku-one-time",
          skuCode: "miro-lifetime-gcc",
          purchaseType: "one_time",
          billingCyclePurchased: "one_time",
          quantity: 1,
          partner: {
            name: "Zoftware Reseller",
            saleReference: "sale-ot-1001",
          },
          customer: {
            name: "Riya Das",
            email: "riya@example.com",
            phone: "+971500000555",
          },
          payment: {
            provider: "stripe",
            transactionId: "txn-ot-1001",
            amount: "99",
            currency: "USD",
            status: "captured",
          },
          createdAt: "2026-03-25T08:00:00.000Z",
        },
        sku: {
          _id: "sku-one-time",
          planId: "plan-one-time",
          code: "miro-lifetime-gcc",
          region: "GCC",
          seatType: "seat",
          purchaseType: "one_time" as const,
          pricingOption: pricingOption(
            "one_time",
            "99",
            "USD",
            "license",
            "one time",
          ),
          purchaseConstraints: {
            minUnits: 1,
            maxUnits: 5,
          },
          createdAt: "2026-03-25T00:00:00.000Z",
        },
        plan: {
          _id: "plan-one-time",
          productId: "product-one-time",
          name: "Lifetime",
          planType: "standard",
          createdAt: "2026-03-25T00:00:00.000Z",
        },
        product: {
          _id: "product-one-time",
          externalId: "miro-lifetime",
          name: "Miro",
          vendor: "Miro",
          description: "Whiteboard",
          logoUrl: "",
          createdAt: "2026-03-25T00:00:00.000Z",
        },
      },
    ];

    render(<SalesPage sales={oneTimeSales} loading={false} />);

    fireEvent.click(screen.getByRole("button", { name: /^update$/i }));

    expect(
      screen.queryByLabelText(/renewal \/ access end date/i),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/access start date/i), {
      target: { value: "2026-04-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: /preview completion/i }));

    expect(await screen.findByText(/completion preview/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/renewal \/ access end date:/i),
    ).not.toBeInTheDocument();
  });

  it("hides the update action in the activated tab and shows completion details", async () => {
    vi.mocked(api.getSku).mockResolvedValue({
      _id: "sku-3",
      planId: "plan-3",
      code: "zoom-business-gcc",
      region: "GCC",
      seatType: "license_key",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption(
        "monthly",
        "18",
        "USD",
        "license",
      ),
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 10,
      },
      activationTimeline: "Instant",
      isBillingDisabled: false,
      createdAt: "2026-03-16T00:00:00.000Z",
    });

    const activatedSales: SaleListEntry[] = [
      ...sales,
      {
        sale: {
          _id: "sale-3",
          skuId: "sku-3",
          skuCode: "zoom-business-gcc",
          billingCyclePurchased: "monthly",
          purchaseType: "subscription",
          quantity: 1,
          partner: {
            name: "Zoftware Reseller",
            saleReference: "sale-3001",
          },
          customer: {
            name: "Nadia Rahman",
            email: "nadia@example.com",
            phone: "+971500000222",
          },
          payment: {
            provider: "stripe",
            transactionId: "txn-3001",
            amount: "18",
            currency: "USD",
            status: "captured",
          },
          createdAt: "2026-03-18T08:00:00.000Z",
        },
        sku: {
          _id: "sku-3",
          planId: "plan-3",
          code: "zoom-business-gcc",
          region: "GCC",
          seatType: "license_key",
          purchaseType: "subscription" as const,
          pricingOption: pricingOption(
            "monthly",
            "18",
            "USD",
            "license",
          ),
          purchaseConstraints: {
            minUnits: 1,
            maxUnits: 10,
          },
          createdAt: "2026-03-18T00:00:00.000Z",
        },
        plan: {
          _id: "plan-3",
          productId: "product-3",
          name: "Business",
          planType: "standard",
          createdAt: "2026-03-18T00:00:00.000Z",
        },
        product: {
          _id: "product-3",
          externalId: "zoom-business",
          name: "Zoom",
          vendor: "Zoom",
          description: "Meetings",
          logoUrl: "",
          createdAt: "2026-03-18T00:00:00.000Z",
        },
        activation: {
          _id: "activation-3",
          saleId: "sale-3",
          skuId: "sku-3",
          customerEmail: "nadia@example.com",
          purchaseType: "subscription",
          billingCyclePurchased: "monthly",
          fulfillmentMode: "license_key",
          accessStartDate: "2026-04-01T00:00:00.000Z",
          accessEndDate: "2026-05-01T00:00:00.000Z",
          nextRenewalDate: "2026-05-01T00:00:00.000Z",
          licenseKeyMasked: "********5678",
          licenseDocument: {
            fileName: "zoom-license.pdf",
            uploadedAt: "2026-04-01T00:00:00.000Z",
          },
          activationStatus: "completed",
          notificationStatus: "queued",
          activatedAt: "2026-04-01T09:30:00.000Z",
          activatedBy: "ops@example.com",
          notificationQueuedAt: "2026-04-01T09:31:00.000Z",
          notes: "Customer credentials shared with procurement.",
          createdAt: "2026-04-01T09:30:00.000Z",
          updatedAt: "2026-04-01T09:31:00.000Z",
        },
      },
    ];

    render(<SalesPage sales={activatedSales} loading={false} />);

    const activatedTab = screen.getByRole("tab", {
      name: /activated sales \(1\)/i,
    });
    fireEvent.mouseDown(activatedTab);
    fireEvent.click(activatedTab);

    await waitFor(() => {
      expect(screen.getByText("Zoom")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /^update$/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /show sku details for zoom/i,
      }),
    );

    expect(
      await screen.findByText(byNormalizedText("Method: License key")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedText("Purchase type: Subscription")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedText("Billing cycle: Monthly")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedText("License key: ********5678")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedText("License document: zoom-license.pdf")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedTextPrefix("Mail status: Queued at")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/customer credentials shared with procurement\./i),
    ).toBeInTheDocument();
  });

  it("shows optional license data for email-based deliveries", async () => {
    vi.mocked(api.getSku).mockResolvedValue({
      _id: "sku-4",
      planId: "plan-4",
      code: "notion-plus-gcc",
      region: "GCC",
      seatType: "license_key",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption(
        "monthly",
        "24",
        "USD",
        "license",
      ),
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 10,
      },
      activationTimeline: "Instant",
      isBillingDisabled: false,
      createdAt: "2026-03-20T00:00:00.000Z",
    });

    const activatedSales: SaleListEntry[] = [
      {
        sale: {
          _id: "sale-4",
          skuId: "sku-4",
          skuCode: "notion-plus-gcc",
          billingCyclePurchased: "monthly",
          purchaseType: "subscription",
          quantity: 1,
          partner: {
            name: "Zoftware Reseller",
            saleReference: "sale-4001",
          },
          customer: {
            name: "Sara Ali",
            email: "sara@example.com",
            phone: "+971500000333",
          },
          payment: {
            provider: "stripe",
            transactionId: "txn-4001",
            amount: "24",
            currency: "USD",
            status: "captured",
          },
          createdAt: "2026-03-20T08:00:00.000Z",
        },
        sku: {
          _id: "sku-4",
          planId: "plan-4",
          code: "notion-plus-gcc",
          region: "GCC",
          seatType: "license_key",
          purchaseType: "subscription" as const,
          pricingOption: pricingOption(
            "monthly",
            "24",
            "USD",
            "license",
          ),
          purchaseConstraints: {
            minUnits: 1,
            maxUnits: 10,
          },
          createdAt: "2026-03-20T00:00:00.000Z",
        },
        plan: {
          _id: "plan-4",
          productId: "product-4",
          name: "Plus",
          planType: "standard",
          createdAt: "2026-03-20T00:00:00.000Z",
        },
        product: {
          _id: "product-4",
          externalId: "notion-plus",
          name: "Notion",
          vendor: "Notion",
          description: "Workspace",
          logoUrl: "",
          createdAt: "2026-03-20T00:00:00.000Z",
        },
        activation: {
          _id: "activation-4",
          saleId: "sale-4",
          skuId: "sku-4",
          customerEmail: "sara@example.com",
          purchaseType: "subscription",
          billingCyclePurchased: "monthly",
          fulfillmentMode: "email_based",
          accessStartDate: "2026-04-01T00:00:00.000Z",
          accessEndDate: "2026-05-01T00:00:00.000Z",
          nextRenewalDate: "2026-05-01T00:00:00.000Z",
          licenseKeyMasked: "********9012",
          licenseDocument: {
            fileName: "notion-license.pdf",
            uploadedAt: "2026-04-01T00:00:00.000Z",
          },
          activationStatus: "completed",
          notificationStatus: "queued",
          activatedAt: "2026-04-01T09:30:00.000Z",
          activatedBy: "ops@example.com",
          notificationQueuedAt: "2026-04-01T09:31:00.000Z",
          notes: "Welcome email queued successfully.",
          createdAt: "2026-04-01T09:30:00.000Z",
          updatedAt: "2026-04-01T09:31:00.000Z",
        },
      },
    ];

    render(<SalesPage sales={activatedSales} loading={false} />);

    const activatedTab = screen.getByRole("tab", {
      name: /activated sales \(1\)/i,
    });
    fireEvent.mouseDown(activatedTab);
    fireEvent.click(activatedTab);

    await waitFor(() => {
      expect(screen.getByText("Notion")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /show sku details for notion/i,
      }),
    );

    expect(
      await screen.findByText(byNormalizedText("Method: Email based")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedText("License key: ********9012")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedText("License document: notion-license.pdf")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedTextPrefix("Mail status: Queued at")),
    ).toBeInTheDocument();
  });

  it("shows failed mail status on a single line", async () => {
    vi.mocked(api.getSku).mockResolvedValue({
      _id: "sku-5",
      planId: "plan-5",
      code: "figma-pro-gcc",
      region: "GCC",
      seatType: "seat",
      purchaseType: "subscription" as const,
      pricingOption: pricingOption("monthly", "15", "USD", "license"),
      purchaseConstraints: {
        minUnits: 1,
        maxUnits: 10,
      },
      activationTimeline: "Instant",
      isBillingDisabled: false,
      createdAt: "2026-03-21T00:00:00.000Z",
    });

    const activatedSales: SaleListEntry[] = [
      {
        sale: {
          _id: "sale-5",
          skuId: "sku-5",
          skuCode: "figma-pro-gcc",
          billingCyclePurchased: "monthly",
          purchaseType: "subscription",
          quantity: 1,
          partner: {
            name: "Zoftware Reseller",
            saleReference: "sale-5001",
          },
          customer: {
            name: "Omar Khan",
            email: "omar@example.com",
            phone: "+971500000444",
          },
          payment: {
            provider: "stripe",
            transactionId: "txn-5001",
            amount: "15",
            currency: "USD",
            status: "captured",
          },
          createdAt: "2026-03-21T08:00:00.000Z",
        },
        sku: {
          _id: "sku-5",
          planId: "plan-5",
          code: "figma-pro-gcc",
          region: "GCC",
          seatType: "seat",
          purchaseType: "subscription" as const,
          pricingOption: pricingOption("monthly", "15", "USD", "license"),
          purchaseConstraints: {
            minUnits: 1,
            maxUnits: 10,
          },
          createdAt: "2026-03-21T00:00:00.000Z",
        },
        plan: {
          _id: "plan-5",
          productId: "product-5",
          name: "Pro",
          planType: "standard",
          createdAt: "2026-03-21T00:00:00.000Z",
        },
        product: {
          _id: "product-5",
          externalId: "figma-pro",
          name: "Figma",
          vendor: "Figma",
          description: "Design",
          logoUrl: "",
          createdAt: "2026-03-21T00:00:00.000Z",
        },
        activation: {
          _id: "activation-5",
          saleId: "sale-5",
          skuId: "sku-5",
          customerEmail: "omar@example.com",
          purchaseType: "subscription",
          billingCyclePurchased: "monthly",
          fulfillmentMode: "email_based",
          accessStartDate: "2026-04-01T00:00:00.000Z",
          accessEndDate: "2026-05-01T00:00:00.000Z",
          nextRenewalDate: "2026-05-01T00:00:00.000Z",
          activationStatus: "completed",
          notificationStatus: "failed",
          notificationError: "notification enqueue unavailable",
          activatedAt: "2026-04-01T09:30:00.000Z",
          activatedBy: "ops@example.com",
          notes: "Mail delivery failed during queueing.",
          createdAt: "2026-04-01T09:30:00.000Z",
          updatedAt: "2026-04-01T09:32:00.000Z",
        },
      },
    ];

    render(<SalesPage sales={activatedSales} loading={false} />);

    const activatedTab = screen.getByRole("tab", {
      name: /activated sales \(1\)/i,
    });
    fireEvent.mouseDown(activatedTab);
    fireEvent.click(activatedTab);

    await waitFor(() => {
      expect(screen.getByText("Figma")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /show sku details for figma/i,
      }),
    );

    expect(
      await screen.findByText(byNormalizedText("Method: Email based")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(byNormalizedTextPrefix("Mail status: Failed at")),
    ).toBeInTheDocument();
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


