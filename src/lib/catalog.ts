import type { DashboardSnapshot, Plan, Product, Sku } from "@/types";

type CatalogSnapshot = Pick<DashboardSnapshot, "products" | "plans" | "skus">;

export type SkuCatalogLookupEntry = {
  sku: Sku;
  plan?: Plan;
  product?: Product;
};

export function buildSkuCatalogLookup(snapshot: CatalogSnapshot) {
  const productById = new Map(
    snapshot.products.map((product) => [product._id, product]),
  );
  const planById = new Map(snapshot.plans.map((plan) => [plan._id, plan]));

  return new Map<string, SkuCatalogLookupEntry>(
    snapshot.skus.map((sku) => {
      const plan = planById.get(sku.planId);
      const product = plan ? productById.get(plan.productId) : undefined;

      return [
        sku._id,
        {
          sku,
          plan,
          product,
        },
      ];
    }),
  );
}

export function formatSkuLabel(
  sku: Pick<Sku, "code" | "region" | "billingPeriod">,
) {
  return [sku.code, sku.region, sku.billingPeriod].filter(Boolean).join(" · ");
}

function isFreeAmount(amount?: string): boolean {
  if (!amount?.trim()) return false;

  const parsedAmount = Number(amount);
  return Number.isFinite(parsedAmount) && parsedAmount === 0;
}

function formatCurrencyPrefix(currency?: string): string {
  const normalizedCurrency = currency?.trim().toUpperCase();

  return normalizedCurrency === "USD"
    ? "$"
    : normalizedCurrency === "EUR"
      ? "EUR "
      : normalizedCurrency === "GBP"
        ? "GBP "
        : normalizedCurrency
          ? `${normalizedCurrency} `
          : "";
}

export function formatPriceLine(input: {
  entity?: string;
  amount?: string;
  currency?: string;
  ratePeriod?: string;
  period?: string;
  isPlanFree?: boolean;
  fallbackText?: string;
}): string {
  if (input.isPlanFree || isFreeAmount(input.amount)) return "Free";
  if (input.amount?.trim()) {
    const currency = formatCurrencyPrefix(input.currency);
    const cadence = [input.entity, input.ratePeriod ?? input.period]
      .filter(Boolean)
      .join(" / ");

    return `${currency}${input.amount}${cadence ? ` / ${cadence}` : ""}`;
  }

  return input.fallbackText ?? "No pricing returned by source API";
}

export function formatSeatType(seatType: Sku["seatType"]) {
  return seatType === "license_key" ? "license key" : "seat";
}
