import type {
  AuthSession,
  AuthUser,
  DashboardSnapshot,
  LicenseDocumentMetadata,
  Plan,
  PricePerUnit,
  PurchasedBillingCycle,
  PurchaseConstraints,
  Product,
  PurchaseType,
  SaleListEntry,
  SaleActivation,
  SaleFulfillmentMode,
  Sku,
  SkuPurchaseType,
  SkuCatalogEntry,
} from "../types";
import { dispatchAuthExpired, getAccessToken } from "./auth";
import {
  normalizeDiscountFields,
  normalizeMoneyAmount,
  normalizePercentageValue,
} from "./decimal";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

type RequestOptions = {
  auth?: boolean;
};

function buildHeaders(
  initHeaders?: HeadersInit,
  authToken?: string | null,
  body?: RequestInit["body"],
): { hasAuthorization: boolean; headers: Record<string, string> } {
  const headers = new Headers(initHeaders);

  if (typeof body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }

  return {
    hasAuthorization: headers.has("authorization"),
    headers: Object.fromEntries(headers.entries()),
  };
}

async function request<T>(
  path: string,
  init?: RequestInit,
  options?: RequestOptions,
): Promise<T> {
  const authToken = options?.auth === false ? null : getAccessToken();
  const { hasAuthorization, headers } = buildHeaders(
    init?.headers,
    authToken,
    init?.body,
  );

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && hasAuthorization) {
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
  purchaseConstraints?: ApiPurchaseConstraints | PurchaseConstraints,
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

function normalizePricingOption(pricingOption: PricePerUnit): PricePerUnit {
  const normalizedAmount =
    normalizeMoneyAmount(pricingOption.amount) ?? pricingOption.amount.trim();

  return {
    ...pricingOption,
    amount: normalizedAmount,
    currency: pricingOption.currency.trim().toUpperCase(),
    entity: pricingOption.entity?.trim() || undefined,
    ratePeriod: pricingOption.ratePeriod?.trim() || undefined,
    ...normalizeDiscountFields({
      amount: normalizedAmount,
      discountPercentage:
        normalizePercentageValue(pricingOption.discountPercentage) ??
        pricingOption.discountPercentage,
      discountedAmount:
        normalizeMoneyAmount(pricingOption.discountedAmount) ??
        pricingOption.discountedAmount,
    }),
  };
}

function resolvePricingOption(pricingOption?: PricePerUnit): PricePerUnit {
  return (
    pricingOption ?? {
      billingCycle: "monthly",
      amount: "",
      currency: "USD",
    }
  );
}

function inferSkuPurchaseTypeFromPricingOption(
  pricingOption?: PricePerUnit,
): SkuPurchaseType {
  const primaryBillingCycle = pricingOption?.billingCycle;

  return primaryBillingCycle === "one_time" ? "one_time" : "subscription";
}

function normalizeSaleListEntry(entry: SaleListEntry): SaleListEntry {
  return {
    ...entry,
    sku: normalizeSku(entry.sku),
    sale: {
      ...entry.sale,
      saleType: entry.sale.saleType ?? "new_sale",
      payment: {
        ...entry.sale.payment,
        amount:
          normalizeMoneyAmount(entry.sale.payment.amount) ??
          entry.sale.payment.amount,
        currency: entry.sale.payment.currency.trim().toUpperCase(),
      },
    },
  };
}

function normalizeSku(sku: ApiSku | Sku): Sku {
  const { pricingOption: rawPricingOption, ...rest } = sku;
  const pricingOption = normalizePricingOption(
    resolvePricingOption(rawPricingOption),
  );

  return {
    ...rest,
    purchaseType:
      sku.purchaseType ??
      inferSkuPurchaseTypeFromPricingOption(pricingOption),
    isBillingDisabled: Boolean(sku.isBillingDisabled),
    pricingOption,
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

type ApiAuthUser = {
  _id: string;
  email_id: string;
  first_name: string;
  last_name: string;
  user_access: string;
  company?: string;
  company_id?: string;
};

type ApiAuthSession = {
  token: string;
  user: ApiAuthUser;
};

type AuthMeResponse = {
  authType: "user";
  user: ApiAuthUser;
};

type ApiPurchaseConstraints = {
  minUnits?: number;
  maxUnits: number | "unlimited";
};

type ApiSku = Omit<Sku, "purchaseConstraints" | "purchaseType" | "pricingOption"> & {
  purchaseConstraints?: ApiPurchaseConstraints;
  purchaseType?: SkuPurchaseType;
  isBillingDisabled?: boolean;
  pricingOption?: PricePerUnit;
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

function normalizeAuthUser(user: ApiAuthUser): AuthUser {
  return {
    _id: user._id,
    emailId: user.email_id,
    firstName: user.first_name,
    lastName: user.last_name,
    userAccess: user.user_access,
    ...(typeof user.company === "string" ? { company: user.company } : {}),
    ...(typeof user.company_id === "string"
      ? { companyId: user.company_id }
      : {}),
  };
}

function normalizeAuthSession(session: ApiAuthSession): AuthSession {
  return {
    token: session.token,
    user: normalizeAuthUser(session.user),
  };
}

const zoftwareBaseUrl = "https://api.zoftwarehub.com";

export const api = {
  login: async (payload: { email: string; password: string }) =>
    normalizeAuthSession(
      await request<ApiAuthSession>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email_id: payload.email,
            password: payload.password,
          }),
        },
        { auth: false },
      ),
    ),
  getCurrentUser: async () =>
    normalizeAuthUser((await request<AuthMeResponse>("/auth/me")).user),
  getDashboard: async () =>
    normalizeDashboardSnapshot(
      await request<ApiDashboardSnapshot>("/api/dashboard"),
    ),
  getSales: async () =>
    (await request<SaleListEntry[]>("/api/v1/sales")).map(
      normalizeSaleListEntry,
    ),
  upsertSaleActivation: async (
    saleId: string,
    payload: {
      purchaseType: PurchaseType;
      billingCyclePurchased: PurchasedBillingCycle;
      fulfillmentMode: SaleFulfillmentMode;
      accessStartDate?: string;
      accessEndDate?: string;
      nextRenewalDate?: string;
      licenseKey?: string;
      licenseDocument?: LicenseDocumentMetadata & {
        contentType?: string;
        contentBase64?: string;
      };
      activationStatus?: "pending" | "processing" | "completed" | "failed";
      notes?: string;
    },
  ) =>
    request<SaleActivation>(`/api/v1/sales/${saleId}/activation`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getSkus: async () =>
    (await request<ApiSkuCatalogEntry[]>("/api/skus")).map(
      normalizeSkuCatalogEntry,
    ),
  getSku: async (skuId: string) =>
    request<ApiSku>(`/api/skus/${skuId}`).then(normalizeSku),
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
    return plans
      .filter((p, i) => plans.findIndex((x) => x.plan === p.plan) === i)
      .map((plan) => ({
        ...plan,
        amount: normalizeMoneyAmount(plan.amount) ?? plan.amount,
      }));
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
      purchaseType: SkuPurchaseType;
      pricingOption: PricePerUnit;
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
    purchaseType: SkuPurchaseType;
    pricingOption: PricePerUnit;
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
      purchaseType: SkuPurchaseType;
      pricingOption: PricePerUnit;
      purchaseConstraints?: PurchaseConstraints;
      activationTimeline?: string;
      isBillingDisabled?: boolean;
    },
  ) =>
    request<ApiSku>(`/api/skus/${skuId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).then(normalizeSku),
  deleteSku: (skuId: string) =>
    request<ApiSku>(`/api/skus/${skuId}`, {
      method: "DELETE",
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
