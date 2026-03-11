import type {
  DashboardSnapshot,
  PricePerUnit,
  SkuCatalogEntry,
} from "../types";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => ({ message: "request failed" }))) as { message?: string };
    throw new Error(payload.message ?? "request failed");
  }

  return response.json() as Promise<T>;
}

export type ProductSearchResult = {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  description: string;
  logoUrl: string;
};

export type ProductPricingPlan = {
  plan: string;
  amount?: string;
  currency?: string;
  entity?: string;
  period?: string;
  description?: string[];
  updated_on?: string;
  isPlanFree?: boolean;
};

type ExternalProductResult = {
  _id: string;
  product_name: string;
  company: string;
  logo_url: string;
  website: string;
  weburl: string;
  category: Array<{ name: string }>;
};

const zoftwareBaseUrl = "https://api.zoftwarehub.com";

export const api = {
  getDashboard: () => request<DashboardSnapshot>("/api/dashboard"),
  getSkus: () => request<SkuCatalogEntry[]>("/api/skus"),
  searchProducts: async (
    query: string,
    limit = 6,
  ): Promise<ProductSearchResult[]> => {
    const response = await fetch(
      `${zoftwareBaseUrl}/api/v1/search/product/${encodeURIComponent(query)}?limit=${limit}`,
    );
    if (!response.ok) throw new Error("product search failed");
    const json = (await response.json()) as { data: ExternalProductResult[] };
    return (json.data ?? []).map((item) => ({
      id: item._id,
      slug:
        item.weburl ??
        item.product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: item.product_name,
      vendor: item.company,
      description: item.category?.map((c) => c.name).join(", ") ?? "",
      logoUrl: item.logo_url ?? "",
    }));
  },
  getProductPricing: async (
    productSlug: string,
  ): Promise<ProductPricingPlan[]> => {
    const response = await fetch(
      `${zoftwareBaseUrl}/api/v1/product/get-product-details?name=${encodeURIComponent(productSlug)}&tab=pricing&region=global`,
    );
    if (!response.ok) return [];
    const json = (await response.json()) as {
      data?: { pricing?: ProductPricingPlan[] };
    };
    const plans = (json.data?.pricing ?? []).filter((p) => p.plan?.trim());
    // deduplicate by plan name
    return plans.filter(
      (p, i) => plans.findIndex((x) => x.plan === p.plan) === i,
    );
  },
  addCatalogEntry: (payload: {
    product: {
      externalId: string;
      name: string;
      vendor: string;
      description: string;
      logoUrl: string;
    };
    plan: { name: string; planType: "standard" | "enterprise" };
    sku: {
      code: string;
      billingPeriod: "monthly" | "yearly";
      region?: "MENA" | "GLOBAL" | "US" | "EU" | "INDIA" | "APAC";
      seatType: "seat" | "license_key";
      pricePerUnit: PricePerUnit;
    };
  }) =>
    request("/api/catalog/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createPlan: (payload: {
    productId: string;
    name: string;
    planType: "standard" | "enterprise";
  }) =>
    request("/api/plans", { method: "POST", body: JSON.stringify(payload) }),
  createSku: (payload: {
    planId: string;
    code: string;
    billingPeriod: "monthly" | "yearly";
    region?: "MENA" | "GLOBAL" | "US" | "EU" | "INDIA" | "APAC";
    seatType: "seat" | "license_key";
    pricePerUnit: PricePerUnit;
  }) => request("/api/skus", { method: "POST", body: JSON.stringify(payload) }),
  createInventoryPool: (payload: {
    skuId: string;
    region: string;
    totalQuantity: number;
  }) =>
    request("/api/inventory-pools", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adjustInventory: (payload: {
    skuId: string;
    region: string;
    change: number;
    reason:
      | "MANUAL_ADD"
      | "MANUAL_REMOVE"
      | "EXTERNAL_VENDOR_SALE"
      | "REFUND"
      | "CORRECTION";
    actor: string;
  }) =>
    request("/api/inventory-adjustments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createReservation: (payload: {
    skuId: string;
    region: string;
    quantity: number;
    actor: string;
  }) =>
    request("/api/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  confirmReservation: (
    reservationId: string,
    payload: { customerId: string; actor: string },
  ) =>
    request(`/api/reservations/${reservationId}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  cancelReservation: (reservationId: string, payload: { actor: string }) =>
    request(`/api/reservations/${reservationId}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  processExpiredReservations: () =>
    request("/api/system/process-expired-reservations", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
