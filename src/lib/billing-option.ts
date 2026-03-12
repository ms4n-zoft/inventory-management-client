import type { ProductPricingPlan } from "@/lib/api";
import type { PricePerUnit, Region, Sku } from "@/types";

export const billingPeriodOptions = [
  { value: "monthly", label: "monthly" },
  { value: "yearly", label: "yearly" },
];

export const commonRegionOptions = [
  "GLOBAL",
  "MENA",
  "INDIA",
  "US",
  "EU",
  "APAC",
].map((region) => ({ value: region, label: region }));

export function createEmptyPricePerUnit(): PricePerUnit {
  return {
    amount: "",
    currency: "USD",
    entity: "",
    ratePeriod: "",
  };
}

export function pricePerUnitFromPlan(plan: ProductPricingPlan): PricePerUnit {
  return {
    amount:
      plan.isPlanFree || plan.plan.trim().toLowerCase() === "free"
        ? "0"
        : (plan.amount ?? ""),
    currency: plan.currency ?? "USD",
    entity: plan.entity ?? "",
    ratePeriod: plan.period ?? "",
  };
}

export function suggestedBillingPeriod(
  plan: ProductPricingPlan,
): Sku["billingPeriod"] | undefined {
  const normalizedPeriod = plan.period?.trim().toLowerCase();

  if (!normalizedPeriod) return undefined;
  if (normalizedPeriod.startsWith("month")) return "monthly";
  if (
    normalizedPeriod.startsWith("year") ||
    normalizedPeriod === "annual" ||
    normalizedPeriod === "annually"
  ) {
    return "yearly";
  }

  return undefined;
}

export function normalizePricePerUnit(
  pricePerUnit: PricePerUnit,
): PricePerUnit {
  return {
    amount: pricePerUnit.amount.trim(),
    currency: pricePerUnit.currency.trim().toUpperCase(),
    entity: pricePerUnit.entity?.trim() || undefined,
    ratePeriod: pricePerUnit.ratePeriod?.trim() || undefined,
  };
}

export function sameLabel(left?: string, right?: string): boolean {
  const normalizedLeft = left?.trim().toLowerCase();
  const normalizedRight = right?.trim().toLowerCase();

  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

function slugifySkuPart(value?: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSkuCode(input: {
  productName?: string;
  planName?: string;
  billingPeriod?: string;
  region?: string;
}): string {
  const productName = slugifySkuPart(input.productName);
  const planName = slugifySkuPart(input.planName);
  const billingPeriod = slugifySkuPart(input.billingPeriod);
  const region = slugifySkuPart(input.region);

  if (!productName || !planName || !billingPeriod) {
    return "";
  }

  return [productName, planName, billingPeriod, region]
    .filter(Boolean)
    .join("-");
}

export function ensureUniqueSkuCode(
  baseCode: string,
  existingCodes: Set<string>,
): string {
  if (!baseCode) return "";
  if (!existingCodes.has(baseCode)) return baseCode;

  let suffix = 2;
  let candidate = `${baseCode}-${suffix}`;

  while (existingCodes.has(candidate)) {
    suffix += 1;
    candidate = `${baseCode}-${suffix}`;
  }

  return candidate;
}

export function normalizeRegion(value: string): Region | undefined {
  return value.trim() ? (value.trim().toUpperCase() as Region) : undefined;
}
