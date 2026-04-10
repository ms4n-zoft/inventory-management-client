import { afterEach, describe, expect, it, vi } from "vitest";

import { setStoredAuthSession } from "./auth";

afterEach(() => {
  sessionStorage.clear();
});

describe("api auth handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not broadcast auth expiration for unauthenticated login failures", async () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid credentials" }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");

    await expect(
      api.login({ email: "ops@example.com", password: "wrong-password" }),
    ).rejects.toThrow("Invalid credentials");
    expect(dispatchEventSpy).not.toHaveBeenCalled();
  });

  it("broadcasts auth expiration for authenticated 401 responses", async () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Session expired" }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    setStoredAuthSession({
      token: "inventory-token",
      user: {
        _id: "user-1",
        emailId: "ops@example.com",
        firstName: "Inventory",
        lastName: "Operator",
        userAccess: "INVENTORY",
      },
    });

    const { api } = await import("./api");

    await expect(api.getDashboard()).rejects.toThrow("Session expired");
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/dashboard"),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer inventory-token",
        }),
      }),
    );
  });
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
        headers: {},
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
            isBillingDisabled: true,
            pricingOption: {
              billingCycle: "monthly",
              amount: "100.555",
              currency: "INR",
              entity: "user",
              ratePeriod: "month",
              discountPercentage: "15.129",
              discountedAmount: "85.355",
            },
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
          isBillingDisabled: true,
          purchaseType: "subscription",
          pricingOption: {
            billingCycle: "monthly",
            amount: "100.56",
            currency: "INR",
            entity: "user",
            ratePeriod: "month",
            discountPercentage: "15.13",
            discountedAmount: "85.35",
          },
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
            pricingOption: {
              billingCycle: "monthly",
              amount: "100.555",
              currency: "INR",
              entity: "user",
              ratePeriod: "month",
              discountedAmount: "90.443",
            },
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
    expect(results.skus[0]!.isBillingDisabled).toBe(false);
    expect(results.skus[0]!.pricingOption).toEqual({
      billingCycle: "monthly",
      amount: "100.56",
      currency: "INR",
      entity: "user",
      ratePeriod: "month",
      discountPercentage: "10.06",
      discountedAmount: "90.44",
    });
  });

  it("loads a single sku by id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _id: "sku-1",
        planId: "plan-1",
        code: "pipedrive-starter-pack-india",
        region: "INDIA",
        seatType: "seat",
        pricingOption: {
          billingCycle: "monthly",
          amount: "3060.125",
          currency: "inr",
          entity: "user",
          ratePeriod: "month",
        },
        purchaseConstraints: {
          minUnits: 1,
          maxUnits: "unlimited",
        },
        activationTimeline: "5",
        isBillingDisabled: false,
        createdAt: "2026-03-16T00:00:00.000Z",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const result = await api.getSku("sku-1");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/skus/sku-1"),
      {
        headers: {},
      },
    );
    expect(result).toEqual({
      _id: "sku-1",
      planId: "plan-1",
      code: "pipedrive-starter-pack-india",
      region: "INDIA",
      seatType: "seat",
      purchaseType: "subscription",
      pricingOption: {
        billingCycle: "monthly",
        amount: "3060.13",
        currency: "INR",
        entity: "user",
        ratePeriod: "month",
      },
      purchaseConstraints: {
        minUnits: 1,
      },
      activationTimeline: "5",
      isBillingDisabled: false,
      createdAt: "2026-03-16T00:00:00.000Z",
    });
  });

  it("deletes skus through the sku endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _id: "sku-1",
        planId: "plan-1",
        code: "pipedrive-starter-pack-india",
        region: "INDIA",
        seatType: "seat",
        pricingOption: {
          billingCycle: "monthly",
          amount: "3060",
          currency: "INR",
          entity: "user",
          ratePeriod: "month",
        },
        purchaseConstraints: {
          minUnits: 1,
          maxUnits: 25,
        },
        isBillingDisabled: false,
        createdAt: "2026-03-16T00:00:00.000Z",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const result = await api.deleteSku("sku-1");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/skus/sku-1"),
      {
        method: "DELETE",
        headers: {},
      },
    );
    expect(result).toMatchObject({
      _id: "sku-1",
      isBillingDisabled: false,
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
            saleType: "new_sale",
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
              amount: "59.009",
              currency: "usd",
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
            pricingOption: {
              billingCycle: "monthly",
              amount: "3060",
              currency: "INR",
              entity: "user",
              ratePeriod: "month",
            },
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

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sales"),
      {
        headers: {},
      },
    );
    expect(results).toEqual([
      expect.objectContaining({
        sale: expect.objectContaining({
          skuCode: "pipedrive-starter-pack-india",
          saleType: "new_sale",
          quantity: 2,
          payment: expect.objectContaining({
            amount: "59.01",
            currency: "USD",
          }),
        }),
        product: expect.objectContaining({ name: "Pipedrive" }),
      }),
    ]);
  });

  it("saves sale activation details through the activation endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
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
        activationStatus: "completed",
        notificationStatus: "not_queued",
        activatedAt: "2026-04-01T00:00:00.000Z",
        activatedBy: "ops@example.com",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { api } = await import("./api");
    const result = await api.upsertSaleActivation("sale-1", {
      purchaseType: "subscription",
      billingCyclePurchased: "monthly",
      fulfillmentMode: "email_based",
      accessStartDate: "2026-04-01",
      accessEndDate: "2026-05-01",
      nextRenewalDate: "2026-05-01",
      activationStatus: "completed",
      notificationStatus: "not_queued",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sales/sale-1/activation"),
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          purchaseType: "subscription",
          billingCyclePurchased: "monthly",
          fulfillmentMode: "email_based",
          accessStartDate: "2026-04-01",
          accessEndDate: "2026-05-01",
          nextRenewalDate: "2026-05-01",
          activationStatus: "completed",
          notificationStatus: "not_queued",
        }),
      },
    );
    expect(result).toMatchObject({
      saleId: "sale-1",
      purchaseType: "subscription",
      billingCyclePurchased: "monthly",
      activationStatus: "completed",
    });
  });
});
