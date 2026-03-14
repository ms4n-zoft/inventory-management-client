import type { ProductPricingPlan } from "@/lib/api";
import type {
  BillingCycle,
  PricePerUnit,
  PricingDetails,
  PurchaseConstraints,
  Region,
} from "@/types";

const preferredBillingCycleOrder: BillingCycle[] = [
  "monthly",
  "yearly",
  "one_time",
];

const preferredRegionOrder: Region[] = ["GCC", "INDIA"];

export const billingCycleOptions: Array<{
  value: BillingCycle;
  label: string;
}> = [
  { value: "monthly", label: "monthly" },
  { value: "yearly", label: "yearly" },
  { value: "one_time", label: "one time" },
];

export const commonRegionOptions = preferredRegionOrder.map((region) => ({
  value: region,
  label: region,
}));

export const commonCurrencyOptions = ["USD", "INR"].map((currency) => ({
  value: currency,
  label: currency,
}));

export function orderBillingCycles(
  billingCycles: BillingCycle[],
): BillingCycle[] {
  const uniqueBillingCycles = new Set(billingCycles);

  return preferredBillingCycleOrder.filter((billingCycle) =>
    uniqueBillingCycles.has(billingCycle),
  );
}

export function orderRegions(regions: Region[]): Region[] {
  const uniqueRegions = new Set(regions);

  return preferredRegionOrder.filter((region) => uniqueRegions.has(region));
}

export function toggleBillingCycleSelection(
  currentSelection: BillingCycle[],
  nextSelection: BillingCycle,
): BillingCycle[] {
  const orderedSelection = orderBillingCycles(currentSelection);

  if (orderedSelection.includes(nextSelection)) {
    return orderedSelection.filter(
      (billingCycle) => billingCycle !== nextSelection,
    );
  }

  if (nextSelection === "one_time") {
    return ["one_time"];
  }

  return orderBillingCycles([
    ...orderedSelection.filter((billingCycle) => billingCycle !== "one_time"),
    nextSelection,
  ]);
}

export function toggleRegionSelection(
  currentSelection: Region[],
  nextSelection: Region,
): Region[] {
  const orderedSelection = orderRegions(currentSelection);

  if (orderedSelection.includes(nextSelection)) {
    return orderedSelection.filter((region) => region !== nextSelection);
  }

  return orderRegions([...orderedSelection, nextSelection]);
}

export function createEmptyPricingDetails(): PricingDetails {
  const emptyPricePerUnit = createEmptyPricePerUnit();

  return {
    amount: emptyPricePerUnit.amount,
    currency: emptyPricePerUnit.currency,
    entity: emptyPricePerUnit.entity ?? "",
    ratePeriod: emptyPricePerUnit.ratePeriod ?? "",
  };
}

export function pricingDetailsFromPricingOptions(
  pricingOptions: PricePerUnit[],
): PricingDetails {
  const primaryPricingOption = pricingOptions[0] ?? createEmptyPricePerUnit();

  return {
    amount: primaryPricingOption.amount,
    currency: primaryPricingOption.currency,
    entity: primaryPricingOption.entity ?? "",
    ratePeriod: primaryPricingOption.ratePeriod ?? "",
  };
}

export function billingCyclesFromPricingOptions(
  pricingOptions: PricePerUnit[],
) {
  return orderBillingCycles(
    pricingOptions.map((pricingOption) => pricingOption.billingCycle),
  );
}

export function buildPricingOptionsFromDetails(input: {
  billingCycles: BillingCycle[];
  pricingDetails: PricingDetails;
}): PricePerUnit[] {
  return orderBillingCycles(input.billingCycles).map((billingCycle) => ({
    billingCycle,
    amount: input.pricingDetails.amount,
    currency: input.pricingDetails.currency,
    entity: input.pricingDetails.entity,
    ratePeriod: input.pricingDetails.ratePeriod,
  }));
}

export function createEmptyPricePerUnit(
  billingCycle: BillingCycle = "monthly",
): PricePerUnit {
  return {
    billingCycle,
    amount: "",
    currency: "USD",
    entity: "",
    ratePeriod: "",
  };
}

export function pricePerUnitFromPlan(plan: ProductPricingPlan): PricePerUnit {
  return {
    billingCycle: suggestedBillingPeriod(plan) ?? "monthly",
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
): BillingCycle | undefined {
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
  if (normalizedPeriod.startsWith("one") || normalizedPeriod === "lifetime") {
    return "one_time";
  }

  return undefined;
}

export function normalizePricePerUnit(
  pricePerUnit: PricePerUnit,
): PricePerUnit {
  return {
    billingCycle: pricePerUnit.billingCycle,
    amount: pricePerUnit.amount.trim(),
    currency: pricePerUnit.currency.trim().toUpperCase(),
    entity: pricePerUnit.entity?.trim() || undefined,
    ratePeriod: pricePerUnit.ratePeriod?.trim() || undefined,
  };
}

export function normalizePricingOptions(
  pricingOptions: PricePerUnit[],
): PricePerUnit[] {
  return pricingOptions.map((option) => normalizePricePerUnit(option));
}

export function nextPricingCycle(pricingOptions: PricePerUnit[]): BillingCycle {
  return (
    preferredBillingCycleOrder.find(
      (billingCycle) =>
        !pricingOptions.some((option) => option.billingCycle === billingCycle),
    ) ?? "monthly"
  );
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
  region?: string;
}): string {
  const productName = slugifySkuPart(input.productName);
  const planName = slugifySkuPart(input.planName);
  const region = slugifySkuPart(input.region);

  if (!productName || !planName || !region) {
    return "";
  }

  return [productName, planName, region].filter(Boolean).join("-");
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

function parsePositiveInteger(value: string): number | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) return undefined;
  if (!/^\d+$/.test(normalizedValue)) return undefined;

  const parsedValue = Number(normalizedValue);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : undefined;
}

export function hasValidPurchaseConstraints(input: {
  minUnits: string;
  maxUnits: string;
}): boolean {
  const minUnits = parsePositiveInteger(input.minUnits);
  const maxUnits = parsePositiveInteger(input.maxUnits);

  if (input.minUnits.trim() && minUnits === undefined) {
    return false;
  }

  if (input.maxUnits.trim() && maxUnits === undefined) {
    return false;
  }

  if (minUnits !== undefined && maxUnits !== undefined && maxUnits < minUnits) {
    return false;
  }

  return true;
}

export function buildPurchaseConstraints(input: {
  minUnits: string;
  maxUnits: string;
}): PurchaseConstraints | undefined {
  const minUnits = parsePositiveInteger(input.minUnits);
  const maxUnits = parsePositiveInteger(input.maxUnits);

  if (minUnits === undefined && maxUnits === undefined) {
    return undefined;
  }

  return {
    ...(minUnits !== undefined ? { minUnits } : {}),
    ...(maxUnits !== undefined ? { maxUnits } : {}),
  };
}

export function purchaseConstraintsToFormValues(
  purchaseConstraints?: PurchaseConstraints,
) {
  return {
    minUnits:
      purchaseConstraints?.minUnits !== undefined
        ? String(purchaseConstraints.minUnits)
        : "",
    maxUnits:
      purchaseConstraints?.maxUnits !== undefined
        ? String(purchaseConstraints.maxUnits)
        : "",
  };
}
