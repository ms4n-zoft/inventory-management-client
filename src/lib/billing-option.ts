import type { ProductPricingPlan } from "@/lib/api";
import type {
  BillingCycle,
  PricePerUnit,
  PricingDetails,
  PricingDetailsByCycle,
  PurchaseConstraints,
  Region,
} from "@/types";

const preferredBillingCycleOrder: BillingCycle[] = [
  "monthly",
  "yearly",
  "one_time",
];

const defaultRatePeriodsByCycle: Record<BillingCycle, string> = {
  monthly: "month",
  yearly: "year",
  one_time: "one time",
};

const sharedPricingFields: Array<
  keyof Pick<PricingDetails, "currency" | "entity">
> = ["currency", "entity"];

const preferredRegionOrder: Region[] = ["GCC", "INDIA"];
const defaultChargedPer = "user";

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

export const commonChargedPerOptions = [defaultChargedPer].map((entity) => ({
  value: entity,
  label: entity,
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
    entity: emptyPricePerUnit.entity ?? defaultChargedPer,
    ratePeriod: emptyPricePerUnit.ratePeriod ?? "",
  };
}

function clonePricingDetailsByCycle(
  pricingDetailsByCycle: PricingDetailsByCycle,
): PricingDetailsByCycle {
  return {
    monthly: { ...pricingDetailsByCycle.monthly },
    yearly: { ...pricingDetailsByCycle.yearly },
    one_time: { ...pricingDetailsByCycle.one_time },
  };
}

export function autoPopulateYearlyAmount(monthlyAmount: string): string {
  const normalizedAmount = monthlyAmount.trim();

  if (!/^\d+(?:\.\d+)?$/.test(normalizedAmount)) {
    return "";
  }

  const [wholePart, fractionPart = ""] = normalizedAmount.split(".");
  const scale = BigInt(`1${"0".repeat(fractionPart.length)}`);
  const integerValue = BigInt(`${wholePart}${fractionPart}`);
  const yearlyValue = integerValue * 12n;

  if (fractionPart.length === 0) {
    return yearlyValue.toString();
  }

  const paddedValue = yearlyValue
    .toString()
    .padStart(fractionPart.length + 1, "0");
  const integerDigits = paddedValue.slice(0, -fractionPart.length);
  const fractionalDigits = paddedValue
    .slice(-fractionPart.length)
    .replace(/0+$/, "");

  return fractionalDigits.length > 0
    ? `${integerDigits}.${fractionalDigits}`
    : integerDigits;
}

function amountFromSeedForCycle(
  billingCycle: BillingCycle,
  seed?: PricePerUnit,
): string {
  if (!seed) return "";
  if (seed.billingCycle === billingCycle) return seed.amount;
  if (seed.billingCycle === "monthly" && billingCycle === "yearly") {
    return autoPopulateYearlyAmount(seed.amount);
  }

  return "";
}

function createPricingDetailsForCycle(
  billingCycle: BillingCycle,
  seed?: PricePerUnit,
): PricingDetails {
  return {
    amount: amountFromSeedForCycle(billingCycle, seed),
    currency: seed?.currency ?? "USD",
    entity: seed?.entity?.trim() || defaultChargedPer,
    ratePeriod:
      (seed?.billingCycle === billingCycle ? seed.ratePeriod : undefined) ??
      (seed ? defaultRatePeriodsByCycle[billingCycle] : ""),
  };
}

export function createPricingDetailsByCycle(
  seed?: PricePerUnit,
): PricingDetailsByCycle {
  return {
    monthly: createPricingDetailsForCycle("monthly", seed),
    yearly: createPricingDetailsForCycle("yearly", seed),
    one_time: createPricingDetailsForCycle("one_time", seed),
  };
}

export function sharedPricingDetailsFromCycleDetails(input: {
  billingCycles: BillingCycle[];
  pricingDetailsByCycle: PricingDetailsByCycle;
}): Pick<PricingDetails, "currency" | "entity"> {
  const primaryBillingCycle =
    orderBillingCycles(input.billingCycles)[0] ?? "monthly";
  const primaryPricingDetails =
    input.pricingDetailsByCycle[primaryBillingCycle];

  return {
    currency: primaryPricingDetails.currency,
    entity: primaryPricingDetails.entity,
  };
}

export function syncPricingDetailsByBillingCycles(input: {
  billingCycles: BillingCycle[];
  pricingDetailsByCycle: PricingDetailsByCycle;
}): PricingDetailsByCycle {
  const selectedBillingCycles = orderBillingCycles(input.billingCycles);
  const nextPricingDetailsByCycle = clonePricingDetailsByCycle(
    input.pricingDetailsByCycle,
  );

  if (selectedBillingCycles.length === 0) {
    return nextPricingDetailsByCycle;
  }

  const primaryPricingDetails =
    nextPricingDetailsByCycle[selectedBillingCycles[0]!];

  for (const billingCycle of selectedBillingCycles) {
    nextPricingDetailsByCycle[billingCycle] = {
      ...nextPricingDetailsByCycle[billingCycle],
      currency: primaryPricingDetails.currency,
      entity: primaryPricingDetails.entity,
      ratePeriod:
        nextPricingDetailsByCycle[billingCycle].ratePeriod ||
        defaultRatePeriodsByCycle[billingCycle],
    };
  }

  if (
    selectedBillingCycles.includes("monthly") &&
    selectedBillingCycles.includes("yearly")
  ) {
    const nextYearlyAmount = autoPopulateYearlyAmount(
      nextPricingDetailsByCycle.monthly.amount,
    );

    if (
      nextPricingDetailsByCycle.yearly.amount.trim().length === 0 &&
      nextYearlyAmount
    ) {
      nextPricingDetailsByCycle.yearly.amount = nextYearlyAmount;
    }
  }

  return nextPricingDetailsByCycle;
}

export function applyPricingDetailsChange(input: {
  billingCycles: BillingCycle[];
  pricingDetailsByCycle: PricingDetailsByCycle;
  billingCycle: BillingCycle;
  field: keyof PricingDetails;
  value: string;
}): PricingDetailsByCycle {
  const nextPricingDetailsByCycle = clonePricingDetailsByCycle(
    input.pricingDetailsByCycle,
  );
  const selectedBillingCycles = orderBillingCycles(input.billingCycles);

  if (
    sharedPricingFields.includes(
      input.field as keyof Pick<PricingDetails, "currency" | "entity">,
    )
  ) {
    const targetBillingCycles =
      selectedBillingCycles.length > 0
        ? selectedBillingCycles
        : [input.billingCycle];

    for (const billingCycle of targetBillingCycles) {
      nextPricingDetailsByCycle[billingCycle] = {
        ...nextPricingDetailsByCycle[billingCycle],
        [input.field]: input.value,
      };
    }

    return nextPricingDetailsByCycle;
  }

  nextPricingDetailsByCycle[input.billingCycle] = {
    ...nextPricingDetailsByCycle[input.billingCycle],
    [input.field]: input.value,
  };

  if (
    input.field === "amount" &&
    input.billingCycle === "monthly" &&
    selectedBillingCycles.includes("yearly")
  ) {
    const previousAutoYearlyAmount = autoPopulateYearlyAmount(
      input.pricingDetailsByCycle.monthly.amount,
    );
    const nextAutoYearlyAmount = autoPopulateYearlyAmount(input.value);
    const currentYearlyAmount =
      input.pricingDetailsByCycle.yearly.amount.trim();

    if (
      currentYearlyAmount.length === 0 ||
      (previousAutoYearlyAmount.length > 0 &&
        currentYearlyAmount === previousAutoYearlyAmount)
    ) {
      nextPricingDetailsByCycle.yearly = {
        ...nextPricingDetailsByCycle.yearly,
        amount: nextAutoYearlyAmount,
      };
    }
  }

  return nextPricingDetailsByCycle;
}

export function pricingDetailsFromPricingOptions(
  pricingOptions: PricePerUnit[],
): PricingDetails {
  const primaryPricingOption = pricingOptions[0] ?? createEmptyPricePerUnit();

  return {
    amount: primaryPricingOption.amount,
    currency: primaryPricingOption.currency,
    entity: primaryPricingOption.entity?.trim() || defaultChargedPer,
    ratePeriod: primaryPricingOption.ratePeriod ?? "",
  };
}

export function pricingDetailsByCycleFromPricingOptions(
  pricingOptions: PricePerUnit[],
): PricingDetailsByCycle {
  const primaryPricingOption = pricingOptions[0];
  const pricingDetailsByCycle =
    createPricingDetailsByCycle(primaryPricingOption);

  for (const pricingOption of pricingOptions) {
    pricingDetailsByCycle[pricingOption.billingCycle] =
      createPricingDetailsForCycle(pricingOption.billingCycle, pricingOption);
  }

  return pricingDetailsByCycle;
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

export function buildPricingOptionsFromCycleDetails(input: {
  billingCycles: BillingCycle[];
  pricingDetailsByCycle: PricingDetailsByCycle;
}): PricePerUnit[] {
  return orderBillingCycles(input.billingCycles).map((billingCycle) => {
    const pricingDetails = input.pricingDetailsByCycle[billingCycle];

    return {
      billingCycle,
      amount: pricingDetails.amount,
      currency: pricingDetails.currency,
      entity: pricingDetails.entity,
      ratePeriod: pricingDetails.ratePeriod,
    };
  });
}

export function createEmptyPricePerUnit(
  billingCycle: BillingCycle = "monthly",
): PricePerUnit {
  return {
    billingCycle,
    amount: "",
    currency: "USD",
    entity: defaultChargedPer,
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
    entity: plan.entity?.trim() || defaultChargedPer,
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
  const pricingOptionsByCycle = new Map(
    pricingOptions.map((option) => [option.billingCycle, option]),
  );

  return orderBillingCycles([...pricingOptionsByCycle.keys()]).map(
    (billingCycle) =>
      normalizePricePerUnit(pricingOptionsByCycle.get(billingCycle)!),
  );
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
