import type { ProductPricingPlan } from "@/lib/api";
import {
  areEquivalentDecimalValues,
  calculateDiscountPercentage,
  calculateDiscountedAmount,
  normalizeDiscountFields,
  normalizeMoneyAmount,
  normalizePercentageValue,
} from "@/lib/decimal";
import type {
  BillingCycle,
  PricePerUnit,
  PricingDetails,
  PurchaseConstraints,
  Region,
  SkuPurchaseType,
} from "@/types";

const defaultRatePeriodsByCycle: Record<BillingCycle, string> = {
  monthly: "monthly",
  quarterly: "quarterly",
  half_yearly: "half_yearly",
  yearly: "yearly",
  one_time: "one_time",
};

export function defaultRatePeriodForBillingCycle(
  billingCycle: BillingCycle,
) {
  return defaultRatePeriodsByCycle[billingCycle];
}

const preferredRegionOrder: Region[] = ["GCC", "INDIA"];
export const defaultChargedPer = "user";

export const subscriptionBillingCycles: BillingCycle[] = [
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
];

export const purchaseTypeOptions: Array<{
  value: SkuPurchaseType;
  label: string;
  description: string;
}> = [
  {
    value: "subscription",
    label: "Subscription",
    description: "Recurring monthly, quarterly, half-yearly, or yearly pricing.",
  },
  {
    value: "one_time",
    label: "Perpetual license",
    description: "Single non-recurring purchase charged once.",
  },
];

export const billingCycleOptions: Array<{
  value: BillingCycle;
  label: string;
  purchaseType: SkuPurchaseType;
}> = [
  { value: "monthly", label: "Monthly", purchaseType: "subscription" },
  { value: "quarterly", label: "Quarterly", purchaseType: "subscription" },
  {
    value: "half_yearly",
    label: "Half Yearly",
    purchaseType: "subscription",
  },
  { value: "yearly", label: "Yearly", purchaseType: "subscription" },
  {
    value: "one_time",
    label: "Perpetual license",
    purchaseType: "one_time",
  },
];

export const commonRegionOptions = preferredRegionOrder.map((region) => ({
  value: region,
  label: region,
}));

export const commonCurrencyOptions = ["USD", "INR"].map((currency) => ({
  value: currency,
  label: currency,
}));

export function orderRegions(regions: Region[]): Region[] {
  const uniqueRegions = new Set(regions);

  return preferredRegionOrder.filter((region) => uniqueRegions.has(region));
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

export function defaultBillingCycleForPurchaseType(
  purchaseType: SkuPurchaseType,
): BillingCycle {
  return purchaseType === "one_time" ? "one_time" : "monthly";
}

export function inferSkuPurchaseTypeFromBillingCycle(
  billingCycle: BillingCycle,
): SkuPurchaseType {
  return billingCycle === "one_time" ? "one_time" : "subscription";
}

export function isValidBillingCycleForPurchaseType(input: {
  purchaseType: SkuPurchaseType;
  billingCycle: BillingCycle;
}) {
  if (input.purchaseType === "one_time") {
    return input.billingCycle === "one_time";
  }

  return input.billingCycle !== "one_time";
}

export function normalizeBillingCycleForPurchaseType(
  purchaseType: SkuPurchaseType,
  billingCycle?: BillingCycle,
): BillingCycle {
  if (!billingCycle) {
    return defaultBillingCycleForPurchaseType(purchaseType);
  }

  return isValidBillingCycleForPurchaseType({ purchaseType, billingCycle })
    ? billingCycle
    : defaultBillingCycleForPurchaseType(purchaseType);
}

export function billingCycleOptionsForPurchaseType(
  purchaseType: SkuPurchaseType,
) {
  return billingCycleOptions.filter(
    (option) => option.purchaseType === purchaseType,
  );
}

function trimOrEmpty(value?: string): string {
  return value?.trim() ?? "";
}

function syncDiscountDetails(
  pricingDetails: PricingDetails,
  source:
    | "amount"
    | "discountPercentage"
    | "discountedAmount" = "discountPercentage",
): PricingDetails {
  const normalizedAmount =
    normalizeMoneyAmount(pricingDetails.amount) ??
    trimOrEmpty(pricingDetails.amount);
  const normalizedDiscountPercentage =
    normalizePercentageValue(pricingDetails.discountPercentage) ??
    trimOrEmpty(pricingDetails.discountPercentage);
  const normalizedDiscountedAmount =
    normalizeMoneyAmount(pricingDetails.discountedAmount) ??
    trimOrEmpty(pricingDetails.discountedAmount);

  if (source === "discountedAmount") {
    const nextDiscountPercentage = normalizedDiscountedAmount
      ? calculateDiscountPercentage(
          normalizedAmount,
          normalizedDiscountedAmount,
        )
      : "";

    return {
      ...pricingDetails,
      amount: normalizedAmount,
      discountPercentage: nextDiscountPercentage,
      discountedAmount: normalizedDiscountedAmount,
    };
  }

  if (
    source === "discountPercentage" &&
    normalizedDiscountPercentage.length === 0
  ) {
    return {
      ...pricingDetails,
      amount: normalizedAmount,
      discountPercentage: "",
      discountedAmount: "",
    };
  }

  if (!normalizedDiscountPercentage && normalizedDiscountedAmount) {
    const nextDiscountPercentage = calculateDiscountPercentage(
      normalizedAmount,
      normalizedDiscountedAmount,
    );

    return {
      ...pricingDetails,
      amount: normalizedAmount,
      discountPercentage: nextDiscountPercentage,
      discountedAmount: normalizedDiscountedAmount,
    };
  }

  return {
    ...pricingDetails,
    amount: normalizedAmount,
    discountPercentage: normalizedDiscountPercentage,
    discountedAmount: normalizedDiscountPercentage
      ? calculateDiscountedAmount(
          normalizedAmount,
          normalizedDiscountPercentage,
        )
      : "",
  };
}

function buildDiscountFields(
  pricePerUnit: Pick<
    PricePerUnit,
    "amount" | "discountPercentage" | "discountedAmount"
  >,
): Pick<PricePerUnit, "discountPercentage" | "discountedAmount"> {
  return normalizeDiscountFields(pricePerUnit);
}

function hasValidDiscountFields(
  pricePerUnit: Pick<
    PricePerUnit,
    "amount" | "discountPercentage" | "discountedAmount"
  >,
): boolean {
  const rawDiscountPercentage = pricePerUnit.discountPercentage?.trim();
  const rawDiscountedAmount = pricePerUnit.discountedAmount?.trim();

  if (!rawDiscountPercentage && !rawDiscountedAmount) {
    return true;
  }

  if (rawDiscountPercentage) {
    const normalizedDiscountPercentage =
      normalizePercentageValue(rawDiscountPercentage) ?? rawDiscountPercentage;
    const expectedDiscountedAmount = calculateDiscountedAmount(
      pricePerUnit.amount,
      normalizedDiscountPercentage,
    );

    if (!expectedDiscountedAmount) {
      return false;
    }

    return (
      !rawDiscountedAmount ||
      areEquivalentDecimalValues(rawDiscountedAmount, expectedDiscountedAmount)
    );
  }

  const normalizedDiscountedAmount =
    normalizeMoneyAmount(rawDiscountedAmount ?? "") ??
    rawDiscountedAmount ??
    "";

  return Boolean(
    calculateDiscountPercentage(
      pricePerUnit.amount,
      normalizedDiscountedAmount,
    ),
  );
}

export function createEmptyPricingDetails(
  billingCycle: BillingCycle = "monthly",
): PricingDetails {
  const emptyPricePerUnit = createEmptyPricePerUnit(billingCycle);

  return {
    amount: emptyPricePerUnit.amount,
    currency: emptyPricePerUnit.currency,
    entity: emptyPricePerUnit.entity ?? defaultChargedPer,
    ratePeriod: emptyPricePerUnit.ratePeriod ?? "",
    discountPercentage: emptyPricePerUnit.discountPercentage ?? "",
    discountedAmount: emptyPricePerUnit.discountedAmount ?? "",
  };
}

function createPricingDetailsForCycle(
  billingCycle: BillingCycle,
  seed?: PricePerUnit,
): PricingDetails {
  return syncDiscountDetails({
    amount: seed?.amount ?? "",
    currency: seed?.currency ?? "USD",
    entity: defaultChargedPer,
    ratePeriod: defaultRatePeriodsByCycle[billingCycle],
    discountPercentage: seed?.discountPercentage?.trim() ?? "",
    discountedAmount: seed?.discountedAmount?.trim() ?? "",
  });
}

export function createPricingDetails(seed?: PricePerUnit): PricingDetails {
  const billingCycle = seed?.billingCycle ?? "monthly";
  return createPricingDetailsForCycle(billingCycle, seed);
}

export function syncPricingDetailsForBillingCycle(input: {
  pricingDetails: PricingDetails;
  nextBillingCycle: BillingCycle;
}): PricingDetails {
  return {
    ...input.pricingDetails,
    entity: defaultChargedPer,
    ratePeriod: defaultRatePeriodsByCycle[input.nextBillingCycle],
  };
}

export function applyPricingDetailsChange(input: {
  pricingDetails: PricingDetails;
  field: keyof PricingDetails;
  value: string;
}): PricingDetails {
  const syncSource =
    input.field === "amount" ||
    input.field === "discountPercentage" ||
    input.field === "discountedAmount"
      ? input.field
      : undefined;

  return syncDiscountDetails(
    {
      ...input.pricingDetails,
      [input.field]: input.value,
    },
    syncSource,
  );
}

export function pricingDetailsFromPricingOption(
  pricingOption?: PricePerUnit,
): PricingDetails {
  return createPricingDetails(pricingOption ?? createEmptyPricePerUnit());
}

export function buildPricingOptionFromDetails(input: {
  billingCycle: BillingCycle;
  pricingDetails: PricingDetails;
}): PricePerUnit {
  return {
    billingCycle: input.billingCycle,
    amount: input.pricingDetails.amount,
    currency: input.pricingDetails.currency,
    entity: defaultChargedPer,
    ratePeriod: defaultRatePeriodsByCycle[input.billingCycle],
    ...buildDiscountFields(input.pricingDetails),
  };
}

export function createEmptyPricePerUnit(
  billingCycle: BillingCycle = "monthly",
): PricePerUnit {
  return {
    billingCycle,
    amount: "",
    currency: "USD",
    entity: defaultChargedPer,
    ratePeriod: defaultRatePeriodsByCycle[billingCycle],
  };
}

export function pricePerUnitFromPlan(plan: ProductPricingPlan): PricePerUnit {
  const billingCycle = suggestedBillingPeriod(plan) ?? "monthly";

  return {
    billingCycle,
    amount:
      plan.isPlanFree || plan.plan.trim().toLowerCase() === "free"
        ? "0"
        : (plan.amount ?? ""),
    currency: plan.currency ?? "USD",
    entity: defaultChargedPer,
    ratePeriod: defaultRatePeriodsByCycle[billingCycle],
  };
}

export function suggestedBillingPeriod(
  plan: ProductPricingPlan,
): BillingCycle | undefined {
  const normalizedPeriod = plan.period?.trim().toLowerCase();

  if (!normalizedPeriod) return undefined;
  if (normalizedPeriod.startsWith("month")) return "monthly";
  if (normalizedPeriod.startsWith("quarter")) return "quarterly";
  if (
    normalizedPeriod.startsWith("half") ||
    normalizedPeriod.startsWith("semi") ||
    normalizedPeriod.includes("6 month")
  ) {
    return "half_yearly";
  }
  if (
    normalizedPeriod.startsWith("year") ||
    normalizedPeriod === "annual" ||
    normalizedPeriod === "annually"
  ) {
    return "yearly";
  }
  if (
    normalizedPeriod.startsWith("one") ||
    normalizedPeriod === "lifetime" ||
    normalizedPeriod === "perpetual"
  ) {
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
    ratePeriod:
      pricePerUnit.ratePeriod?.trim() ||
      defaultRatePeriodsByCycle[pricePerUnit.billingCycle],
    ...buildDiscountFields(pricePerUnit),
  };
}

export function normalizePricingOptionForComparison(
  pricingOption: PricePerUnit,
): PricePerUnit {
  return {
    ...normalizePricePerUnit(pricingOption),
    entity: defaultChargedPer,
    ratePeriod: defaultRatePeriodsByCycle[pricingOption.billingCycle],
  };
}

export function hasValidPricingOption(pricingOption: PricePerUnit): boolean {
  return (
    pricingOption.amount.trim().length > 0 &&
    pricingOption.currency.trim().length > 0 &&
    hasValidDiscountFields(pricingOption)
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
  billingCycle?: BillingCycle;
}): string {
  const productName = slugifySkuPart(input.productName);
  const planName = slugifySkuPart(input.planName);
  const region = slugifySkuPart(input.region);
  const billingCycle = input.billingCycle?.trim();

  if (!productName || !planName || !region || !billingCycle) {
    return "";
  }

  return [productName, planName, region, billingCycle].join("-");
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

export function isStockTrackingEnabled(
  purchaseConstraints?: PurchaseConstraints,
) {
  return purchaseConstraints?.maxUnits !== undefined;
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
