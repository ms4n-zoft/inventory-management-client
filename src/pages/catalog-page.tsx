import { useCallback, useRef, useState } from "react";
import {
  BoxesIcon,
  Layers3Icon,
  LoaderCircleIcon,
  PackageIcon,
  SearchIcon,
} from "lucide-react";
import type { DashboardSnapshot, Region, Sku } from "@/types";
import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectOrInput } from "@/components/ui/select-or-input";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "@/lib/api";
import type { ActionRunner } from "@/components/operations-app";

const regions = ["MENA", "INDIA"];

const billingPeriods = [
  { value: "monthly", label: "monthly" },
  { value: "yearly", label: "yearly" },
];

function planLabel(p: {
  plan: string;
  amount?: string;
  currency?: string;
  period?: string;
  isPlanFree?: boolean;
}): string {
  return p.plan;
}

function planPricingLine(p: {
  plan: string;
  entity?: string;
  amount?: string;
  currency?: string;
  period?: string;
  isPlanFree?: boolean;
}): string {
  if (p.isPlanFree || p.plan.trim().toLowerCase() === "free") return "Free";
  if (p.amount) {
    const currency =
      p.currency === "USD"
        ? "$"
        : p.currency === "EUR"
          ? "EUR "
          : p.currency === "GBP"
            ? "GBP "
            : p.currency
              ? `${p.currency} `
              : "";
    const cadence = [p.entity, p.period].filter(Boolean).join(" / ");

    return `${currency}${p.amount}${cadence ? ` / ${cadence}` : ""}`;
  }
  return "No pricing returned by source API";
}

function formatSkuLabel(sku: Pick<Sku, "code" | "region" | "billingPeriod">) {
  return [sku.code, sku.region, sku.billingPeriod].filter(Boolean).join(" · ");
}

export function CatalogPage({
  snapshot,
  loading,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductSearchResult | null>(null);

  const [pricingPlans, setPricingPlans] = useState<ProductPricingPlan[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [planName, setPlanName] = useState("");

  const [skuCode, setSkuCode] = useState("");
  const [skuRegion, setSkuRegion] = useState("");
  const [skuBillingPeriod, setSkuBillingPeriod] = useState("monthly");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedProduct(null);
    setPricingPlans([]);
    setPlanName("");
    setSearchDone(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchProducts(query.trim());
        setSearchResults(results);
        setSearchDone(true);
      } catch {
        setSearchResults([]);
        setSearchDone(true);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const handleSelectProduct = async (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setSearchResults([]);
    setSearchDone(false);
    setPlanName("");
    setPricingPlans([]);

    setLoadingPricing(true);
    try {
      const plans = await api.getProductPricing(product.slug);
      setPricingPlans(plans);
      if (plans.length > 0) setPlanName(plans[0]!.plan);
    } finally {
      setLoadingPricing(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchDone(false);
    setSelectedProduct(null);
    setPricingPlans([]);
    setPlanName("");
    setSkuCode("");
    setSkuRegion("");
    setSkuBillingPeriod("monthly");
  };

  const canSubmit =
    selectedProduct &&
    planName.trim().length >= 2 &&
    skuCode.trim().length >= 3 &&
    !loading;

  const selectedPricingPlan = pricingPlans.find(
    (plan) => plan.plan === planName,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="shadow-none xl:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-muted">
              <BoxesIcon />
            </div>
            <div>
              <CardTitle>Add product to catalog</CardTitle>
              <CardDescription>
                Search for a product, then configure the plan and SKU in one
                step.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedProduct) return;
              void runAction(
                () =>
                  api.addCatalogEntry({
                    product: {
                      externalId: selectedProduct.id,
                      name: selectedProduct.name,
                      vendor: selectedProduct.vendor,
                      description: selectedProduct.description,
                      logoUrl: selectedProduct.logoUrl,
                    },
                    plan: { name: planName, planType: "standard" },
                    sku: {
                      code: skuCode,
                      billingPeriod: skuBillingPeriod as Sku["billingPeriod"],
                      region: skuRegion ? (skuRegion as Region) : undefined,
                      seatType: "seat",
                    },
                  }),
                "Product, plan, and SKU created.",
              ).then((ok) => {
                if (ok) resetForm();
              });
            }}
          >
            <div className="grid gap-6 xl:grid-cols-3">
              {/* Column 1: Product search */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <SearchIcon className="mr-1 inline-block size-3.5" />
                  Product
                </h3>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Search products</FieldLabel>
                    <div className="relative">
                      <Input
                        value={searchQuery}
                        onChange={(event) => handleSearch(event.target.value)}
                        placeholder="e.g. mailchimp, twilio, zoho"
                      />
                      {searching && (
                        <LoaderCircleIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <FieldDescription>
                      Type at least 2 characters to search.
                    </FieldDescription>
                  </Field>

                  {!selectedProduct &&
                    searchDone &&
                    searchResults.length === 0 && (
                      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                        No products found for &ldquo;{searchQuery}&rdquo;. Try a
                        different name.
                      </p>
                    )}

                  {searchResults.length > 0 && !selectedProduct && (
                    <div className="flex flex-col gap-1.5 rounded-lg border p-2">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          onClick={() => void handleSelectProduct(result)}
                        >
                          {result.logoUrl ? (
                            <img
                              src={result.logoUrl}
                              alt=""
                              className="size-8 shrink-0 rounded-md object-contain"
                            />
                          ) : (
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                              {result.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {result.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {result.vendor}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedProduct && (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-3">
                      {selectedProduct.logoUrl ? (
                        <img
                          src={selectedProduct.logoUrl}
                          alt=""
                          className="size-10 shrink-0 rounded-md object-contain"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium">
                          {selectedProduct.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {selectedProduct.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {selectedProduct.vendor}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(null);
                          setSearchQuery("");
                          setPricingPlans([]);
                          setPlanName("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </FieldGroup>
              </div>

              {/* Column 2: Plan */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Layers3Icon className="mr-1 inline-block size-3.5" />
                  Plan
                </h3>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Plan name</FieldLabel>
                    {loadingPricing ? (
                      <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Loading plans…
                      </div>
                    ) : pricingPlans.length > 0 ? (
                      <>
                        <SelectOrInput
                          key={selectedProduct?.id}
                          options={pricingPlans.map((p) => ({
                            value: p.plan,
                            label: planLabel(p),
                            description: planPricingLine(p),
                          }))}
                          value={planName}
                          onChange={setPlanName}
                          placeholder="Select a plan"
                          inputPlaceholder="e.g. Enterprise"
                        />
                        <FieldDescription>
                          {selectedPricingPlan
                            ? planPricingLine(selectedPricingPlan)
                            : "Plans fetched from the product catalog."}
                        </FieldDescription>
                      </>
                    ) : (
                      <>
                        <Input
                          value={planName}
                          onChange={(event) => setPlanName(event.target.value)}
                          placeholder="e.g. Standard"
                          disabled={!selectedProduct}
                        />
                        {selectedProduct && (
                          <FieldDescription>
                            No pricing data found — enter a plan name manually.
                          </FieldDescription>
                        )}
                      </>
                    )}
                  </Field>
                </FieldGroup>
              </div>

              {/* Column 3: SKU */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <PackageIcon className="mr-1 inline-block size-3.5" />
                  SKU
                </h3>
                <FieldGroup>
                  <Field>
                    <FieldLabel>SKU code</FieldLabel>
                    <Input
                      value={skuCode}
                      onChange={(event) => setSkuCode(event.target.value)}
                      placeholder="jira-standard-monthly-us"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Region (Optional)</FieldLabel>
                    <SelectOrInput
                      options={regions.map((r) => ({ value: r, label: r }))}
                      value={skuRegion}
                      onChange={setSkuRegion}
                      placeholder="Select a region"
                      inputPlaceholder="e.g. MENA"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Billing period</FieldLabel>
                    <SelectOrInput
                      options={billingPeriods}
                      value={skuBillingPeriod}
                      onChange={setSkuBillingPeriod}
                      placeholder="Select a billing period"
                      inputPlaceholder="e.g. quarterly"
                    />
                  </Field>
                </FieldGroup>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button disabled={!canSubmit}>
                <BoxesIcon data-icon="inline-start" />
                Add to catalog
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing catalog entries table */}
      <Card className="shadow-none xl:col-span-2">
        <CardHeader>
          <CardTitle>Catalog entries</CardTitle>
          <CardDescription>
            Products, plans, and SKUs already in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.products.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageIcon />
                </EmptyMedia>
                <EmptyTitle>No products yet</EmptyTitle>
                <EmptyDescription>
                  Search and add a product above to get started.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {snapshot.products.map((product) => {
                const plans = snapshot.plans.filter(
                  (p) => p.productId === product.id,
                );
                const skus = plans.flatMap((plan) =>
                  snapshot.skus.filter((s) => s.planId === plan.id),
                );

                return (
                  <div key={product.id} className="rounded-lg border px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.logoUrl ? (
                        <img
                          src={product.logoUrl}
                          alt=""
                          className="size-8 shrink-0 rounded-md object-contain"
                        />
                      ) : (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium">
                          {product.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.vendor}
                        </p>
                      </div>
                    </div>
                    {skus.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {skus.map((sku) => (
                          <span
                            key={sku.id}
                            className="rounded-md border bg-muted/50 px-2 py-1"
                          >
                            {formatSkuLabel(sku)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
