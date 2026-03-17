import type {
  AuthUser,
  DashboardSnapshot,
  Plan,
  PricePerUnit,
  PurchaseConstraints,
  Product,
  SaleListEntry,
  Sku,
  SkuCatalogEntry,
} from "../types";
import { dispatchAuthExpired, getAccessToken } from "./auth";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

type RequestOptions = {
  auth?: boolean;
};

function buildHeaders(
  initHeaders?: HeadersInit,
  options?: RequestOptions,
): Record<string, string> {
  const headers = new Headers(initHeaders);

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (options?.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  return Object.fromEntries(headers.entries());
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: buildHeaders(init?.headers, options),
  });

  if (response.status === 401) {
    dispatchAuthExpired();
  }

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => ({ message: "request failed" }))) as { message?: string };
    throw new Error(payload.message ?? "request failed");
  }

  return response.json() as Promise<T>;
}

function normalizePurchaseConstraints(
  purchaseConstraints?: ApiPurchaseConstraints,
): PurchaseConstraints | undefined {
  if (!purchaseConstraints) {
    return undefined;
  }

  const normalized = {
    ...(purchaseConstraints.minUnits !== undefined
      ? { minUnits: purchaseConstraints.minUnits }
      : {}),
    ...(typeof purchaseConstraints.maxUnits === "number"
      ? { maxUnits: purchaseConstraints.maxUnits }
      : {}),
  };

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSku(sku: ApiSku): Sku {
  return {
    ...sku,
    purchaseConstraints: normalizePurchaseConstraints(sku.purchaseConstraints),
  };
}

function normalizeCatalogEntryResponse(
  response: ApiCatalogEntryResponse,
): CatalogEntryResponse {
  return {
    ...response,
    sku: normalizeSku(response.sku),
  };
}

function normalizeSkuCatalogEntry(entry: ApiSkuCatalogEntry): SkuCatalogEntry {
  return {
    ...entry,
    sku: normalizeSku(entry.sku),
  };
}

function normalizeDashboardSnapshot(
  snapshot: ApiDashboardSnapshot,
): DashboardSnapshot {
  return {
    ...snapshot,
    skus: snapshot.skus.map(normalizeSku),
  };
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

export type CatalogEntryResponse = {
  product: Product;
  plan: Plan;
  sku: Sku;
};

type AuthLoginResponse = {
  token: string;
  user: AuthUser;
};

type AuthMeResponse = {
  authType: "user";
  user: AuthUser;
};

type ApiPurchaseConstraints = {
  minUnits?: number;
  maxUnits: number | "unlimited";
};

type ApiSku = Omit<Sku, "purchaseConstraints"> & {
  purchaseConstraints?: ApiPurchaseConstraints;
};

type ApiCatalogEntryResponse = Omit<CatalogEntryResponse, "sku"> & {
  sku: ApiSku;
};

type ApiDashboardSnapshot = Omit<DashboardSnapshot, "skus"> & {
  skus: ApiSku[];
};

type ApiSkuCatalogEntry = Omit<SkuCatalogEntry, "sku"> & {
  sku: ApiSku;
};

const zoftwareBaseUrl = "https://api.zoftwarehub.com";

export const api = {
  login: (payload: { email_id: string; password: string }) =>
    request<AuthLoginResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { auth: false },
    ),
  getCurrentUser: async () => (await request<AuthMeResponse>("/auth/me")).user,
  getDashboard: async () =>
    normalizeDashboardSnapshot(
      await request<ApiDashboardSnapshot>("/api/dashboard"),
    ),
  getSales: async () => request<SaleListEntry[]>("/api/sales"),
  getSkus: async () =>
    (await request<ApiSkuCatalogEntry[]>("/api/skus")).map(
      normalizeSkuCatalogEntry,
    ),
  searchProducts: async (
    query: string,
    limit = 6,
  ): Promise<ProductSearchResult[]> =>
    request<ProductSearchResult[]>(
      `/api/catalog/search-products?query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
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
      region: "GCC" | "INDIA";
      seatType: "seat" | "license_key";
      pricingOptions: PricePerUnit[];
      purchaseConstraints?: PurchaseConstraints;
      activationTimeline?: string;
    };
  }) =>
    request<ApiCatalogEntryResponse>("/api/catalog/entries", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeCatalogEntryResponse),
  createPlan: (payload: {
    productId: string;
    name: string;
    planType: "standard" | "enterprise";
  }) =>
    request<Plan>("/api/plans", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createSku: (payload: {
    planId: string;
    code: string;
    region: "GCC" | "INDIA";
    seatType: "seat" | "license_key";
    pricingOptions: PricePerUnit[];
    purchaseConstraints?: PurchaseConstraints;
    activationTimeline?: string;
  }) =>
    request<ApiSku>("/api/skus", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(normalizeSku),
  updateSku: (
    skuId: string,
    payload: {
      code: string;
      region: "GCC" | "INDIA";
      seatType: "seat" | "license_key";
      pricingOptions: PricePerUnit[];
      purchaseConstraints?: PurchaseConstraints;
      activationTimeline?: string;
    },
  ) =>
    request<ApiSku>(`/api/skus/${skuId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).then(normalizeSku),
  createInventoryPool: (payload: { skuId: string; totalQuantity: number }) =>
    request("/api/inventory-pools", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adjustInventory: (payload: {
    skuId: string;
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
};
