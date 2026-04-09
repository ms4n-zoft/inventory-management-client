import type {
  DashboardSnapshot,
  Plan,
  PricePerUnit,
  Product,
  SkuPurchaseType,
  Sku,
} from "@/types";
import {
  areEquivalentDecimalValues,
  calculateDiscountPercentage,
  calculateDiscountedAmount,
  isZeroDecimalValue,
  normalizeMoneyAmount,
  normalizePercentageValue,
} from "@/lib/decimal";

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

export function formatSkuLabel(sku: Pick<Sku, "code" | "region">) {
  return [sku.code, sku.region].filter(Boolean).join(" · ");
}

export function formatBillingCycleLabel(
  billingCycle: PricePerUnit["billingCycle"],
) {
  if (billingCycle === "half_yearly") {
    return "half yearly";
  }

  return billingCycle === "one_time" ? "one time" : billingCycle;
}

export function formatSkuPurchaseTypeLabel(
  purchaseType: SkuPurchaseType,
) {
  return purchaseType === "one_time" ? "Perpetual license" : "Subscription";
}

export function formatBillingCycle(pricingOption?: PricePerUnit) {
  if (!pricingOption) return "No pricing configured";

  return formatBillingCycleLabel(pricingOption.billingCycle);
}

function formatRatePeriodLabel(ratePeriod?: string) {
  const normalizedRatePeriod = ratePeriod?.trim();

  if (!normalizedRatePeriod) {
    return undefined;
  }

  if (
    normalizedRatePeriod === "monthly" ||
    normalizedRatePeriod === "quarterly" ||
    normalizedRatePeriod === "half_yearly" ||
    normalizedRatePeriod === "yearly" ||
    normalizedRatePeriod === "one_time"
  ) {
    return formatBillingCycleLabel(
      normalizedRatePeriod as PricePerUnit["billingCycle"],
    );
  }

  return normalizedRatePeriod;
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
  billingCycle?: PricePerUnit["billingCycle"];
  entity?: string;
  amount?: string;
  currency?: string;
  ratePeriod?: string;
  discountPercentage?: string;
  discountedAmount?: string;
  period?: string;
  isPlanFree?: boolean;
  fallbackText?: string;
}): string {
  const normalizedAmount =
    normalizeMoneyAmount(input.amount) ?? input.amount?.trim();
  const normalizedDiscountPercentage =
    normalizePercentageValue(input.discountPercentage) ??
    input.discountPercentage?.trim();
  const normalizedDiscountedAmount =
    normalizeMoneyAmount(input.discountedAmount) ??
    input.discountedAmount?.trim();
  const currency = formatCurrencyPrefix(input.currency);
  const cadence = [
    input.entity,
    formatRatePeriodLabel(input.ratePeriod) ??
      formatRatePeriodLabel(input.period) ??
      (input.billingCycle
        ? formatBillingCycleLabel(input.billingCycle)
        : undefined),
  ]
    .filter(Boolean)
    .join(" / ");
  const discountPercentage = normalizedDiscountPercentage
    ? normalizedDiscountPercentage
    : normalizedDiscountedAmount && normalizedAmount
      ? calculateDiscountPercentage(
          normalizedAmount,
          normalizedDiscountedAmount,
        )
      : undefined;
  const discountedAmount = discountPercentage
    ? calculateDiscountedAmount(normalizedAmount ?? "", discountPercentage)
    : normalizedDiscountedAmount;

  if (
    discountPercentage &&
    discountedAmount &&
    !isZeroDecimalValue(discountPercentage) &&
    !areEquivalentDecimalValues(discountedAmount, normalizedAmount)
  ) {
    const discountedLine = isFreeAmount(discountedAmount)
      ? "Free"
      : `${currency}${discountedAmount}${cadence ? ` / ${cadence}` : ""}`;

    return `${discountedLine} (${discountPercentage}% off, was ${currency}${normalizedAmount})`;
  }

  if (input.isPlanFree || isFreeAmount(normalizedAmount)) return "Free";
  if (normalizedAmount?.trim()) {
    return `${currency}${normalizedAmount}${cadence ? ` / ${cadence}` : ""}`;
  }

  return input.fallbackText ?? "No pricing returned by source API";
}

export function formatSeatType(seatType: Sku["seatType"]) {
  return seatType === "license_key" ? "license key" : "seat";
}

export function formatPurchaseConstraints(
  sku: Pick<Sku, "purchaseConstraints">,
) {
  const minUnits = sku.purchaseConstraints?.minUnits;
  const maxUnits = sku.purchaseConstraints?.maxUnits;

  return [
    `Minimum units: ${minUnits?.toString() ?? "Not set"}`,
    `Maximum units: ${maxUnits?.toString() ?? "Unlimited"}`,
  ].join(" · ");
}

export function formatActivationTimelineValue(value?: string) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) return undefined;

  return normalizedValue;
}
