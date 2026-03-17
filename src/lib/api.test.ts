import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  sessionStorage.clear();
});

describe("api.searchProducts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests product search results from the backend proxy", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "ipix-crm",
          slug: "ipix-crm",
          name: "IPIX CRM",
          vendor: "Example Corp",
          description: "CRM for small teams",
          logoUrl: "https://storage.googleapis.com/logo.png",
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const results = await api.searchProducts("CRM", 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example/api/catalog/search-products?query=CRM&limit=10",
      {
        headers: {
          "content-type": "application/json",
        },
      },
    );
    expect(results).toEqual([
      {
        id: "ipix-crm",
        slug: "ipix-crm",
        name: "IPIX CRM",
        vendor: "Example Corp",
        description: "CRM for small teams",
        logoUrl: "https://storage.googleapis.com/logo.png",
      },
    ]);
  });
});

describe("api sku response normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalizes unlimited max units from sku list responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          product: {
            _id: "product-1",
            externalId: "pipedrive",
            name: "Pipedrive",
            vendor: "Pipedrive",
            description: "CRM",
            logoUrl: "https://example.com/logo.png",
            createdAt: "2026-03-16T00:31:45.432Z",
          },
          plan: {
            _id: "plan-1",
            productId: "product-1",
            name: "Starter Pack",
            planType: "standard",
            createdAt: "2026-03-16T00:31:45.432Z",
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
              maxUnits: "unlimited",
            },
            activationTimeline: "5",
            createdAt: "2026-03-16T00:31:45.459Z",
          },
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const results = await api.getSkus();

    expect(results).toEqual([
      {
        product: {
          _id: "product-1",
          externalId: "pipedrive",
          name: "Pipedrive",
          vendor: "Pipedrive",
          description: "CRM",
          logoUrl: "https://example.com/logo.png",
          createdAt: "2026-03-16T00:31:45.432Z",
        },
        plan: {
          _id: "plan-1",
          productId: "product-1",
          name: "Starter Pack",
          planType: "standard",
          createdAt: "2026-03-16T00:31:45.432Z",
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
          },
          activationTimeline: "5",
          createdAt: "2026-03-16T00:31:45.459Z",
        },
      },
    ]);
  });

  it("normalizes unlimited max units from dashboard responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            _id: "product-1",
            externalId: "pipedrive",
            name: "Pipedrive",
            vendor: "Pipedrive",
            description: "CRM",
            logoUrl: "https://example.com/logo.png",
            createdAt: "2026-03-16T00:31:45.432Z",
          },
        ],
        plans: [
          {
            _id: "plan-1",
            productId: "product-1",
            name: "Starter Pack",
            planType: "standard",
            createdAt: "2026-03-16T00:31:45.432Z",
          },
        ],
        skus: [
          {
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
              maxUnits: "unlimited",
            },
            activationTimeline: "5",
            createdAt: "2026-03-16T00:31:45.459Z",
          },
        ],
        inventoryPools: [],
        auditLogs: [],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const results = await api.getDashboard();

    expect(results.skus[0]!.purchaseConstraints).toEqual({
      minUnits: 1,
    });
  });

  it("loads sales records from the sales endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
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
            createdAt: "2026-03-16T00:00:00.000Z",
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
      ],
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const results = await api.getSales();

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:4000/api/sales", {
      headers: {
        "content-type": "application/json",
      },
    });
    expect(results).toEqual([
      expect.objectContaining({
        sale: expect.objectContaining({
          skuCode: "pipedrive-starter-pack-india",
          quantity: 2,
        }),
        product: expect.objectContaining({ name: "Pipedrive" }),
      }),
    ]);
  });
});
