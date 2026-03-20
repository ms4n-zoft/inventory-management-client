import { CheckIcon, LoaderCircleIcon, SearchIcon } from "lucide-react";

import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import { formatPriceLine } from "@/lib/catalog";
import { sameLabel } from "@/lib/billing-option";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types";

import { SetupStepCard } from "./setup-step-card";

function planLabel(plan: { plan: string }): string {
  return plan.plan;
}

export function ProductPlanStep({
  searchQuery,
  onSearchChange,
  searching,
  searchDone,
  searchResults,
  selectedProduct,
  onSelectProduct,
  onClearProduct,
  loadingPricing,
  pricingPlans,
  planName,
  onPlanNameChange,
  selectedPricingPlan,
  existingProduct,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searching: boolean;
  searchDone: boolean;
  searchResults: ProductSearchResult[];
  selectedProduct: ProductSearchResult | null;
  onSelectProduct: (product: ProductSearchResult) => void;
  onClearProduct: () => void;
  loadingPricing: boolean;
  pricingPlans: ProductPricingPlan[];
  planName: string;
  onPlanNameChange: (value: string) => void;
  selectedPricingPlan?: ProductPricingPlan;
  existingProduct?: Product;
}) {
  return (
    <SetupStepCard
      step={1}
      icon={SearchIcon}
      title="Pick product and plan"
      description="Search for the product first, then pick a suggested plan or type a new one."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel>Search products</FieldLabel>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
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

          {!selectedProduct && searchDone && searchResults.length === 0 && (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              No products found for &ldquo;{searchQuery}&rdquo;. Try a different
              name.
            </p>
          )}

          {searchResults.length > 0 && !selectedProduct && (
            <div className="flex flex-col gap-1.5 rounded-lg border p-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => onSelectProduct(result)}
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
                    <p className="truncate font-medium">{result.name}</p>
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
                <p className="truncate font-medium">{selectedProduct.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedProduct.vendor}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearProduct}
              >
                Change
              </Button>
            </div>
          )}

          {existingProduct && (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              This product already exists in your catalog. We will reuse it
              automatically instead of creating a duplicate.
            </p>
          )}
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel>Plan</FieldLabel>
            {loadingPricing ? (
              <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" />
                Loading plans…
              </div>
            ) : pricingPlans.length > 0 ? (
              <div className="space-y-3">
                <div
                  role="radiogroup"
                  aria-label="Plan options"
                  className="grid gap-3 md:grid-cols-2"
                >
                  {pricingPlans.map((plan) => {
                    const checked = sameLabel(plan.plan, planName);

                    return (
                      <label
                        key={plan.plan}
                        className={[
                          "flex cursor-pointer rounded-xl border p-4 transition-colors",
                          checked
                            ? "border-foreground bg-muted/40"
                            : "hover:bg-muted/20",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="plan-option"
                          className="sr-only"
                          checked={checked}
                          onChange={() => onPlanNameChange(plan.plan)}
                        />
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {planLabel(plan)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatPriceLine(plan)}
                            </p>
                          </div>
                          <span
                            aria-hidden="true"
                            className={[
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                              checked
                                ? "border-[#0A6C31] bg-[#0A6C31]"
                                : "border-muted-foreground/40",
                            ].join(" ")}
                          >
                            {checked && (
                              <CheckIcon
                                strokeWidth={3}
                                className="size-3.5 text-white"
                              />
                            )}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <Input
                  value={selectedPricingPlan ? "" : planName}
                  onChange={(event) => onPlanNameChange(event.target.value)}
                  placeholder="Or type a different plan name"
                  disabled={!selectedProduct}
                />
              </div>
            ) : (
              <Input
                value={planName}
                onChange={(event) => onPlanNameChange(event.target.value)}
                placeholder="e.g. Standard"
                disabled={!selectedProduct}
              />
            )}
            <FieldDescription>
              {selectedPricingPlan
                ? `Selected quote: ${formatPriceLine(selectedPricingPlan)}. You can still adjust it before saving.`
                : selectedProduct
                  ? pricingPlans.length > 0
                    ? "Pick one of the plan cards above or type a different plan name below."
                    : "Type a new plan name to unlock the next steps."
                  : "Choose a product first to fetch plan suggestions."}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>
    </SetupStepCard>
  );
}
