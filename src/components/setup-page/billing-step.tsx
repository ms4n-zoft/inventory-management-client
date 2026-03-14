import { PackageIcon } from "lucide-react";

import type { ProductSearchResult } from "@/lib/api";
import { BillingDetailsFields } from "@/components/billing-details-fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import { cn } from "@/lib/utils";
import type { BillingCycle, PricingDetails, Region, Sku } from "@/types";

import { SetupStepCard } from "./setup-step-card";

export function BillingStep({
  selectedProduct,
  detailsReady,
  loadingPricing,
  selectedRegions,
  onSelectedRegionsChange,
  activeRegion,
  onActiveRegionChange,
  existingRegions,
  existingSku,
  generatedSkuCode,
  billingCycles,
  onBillingCyclesChange,
  pricingDetails,
  onPricingDetailsChange,
  minimumUnits,
  onMinimumUnitsChange,
  maximumUnits,
  onMaximumUnitsChange,
  activationTimeline,
  onActivationTimelineChange,
}: {
  selectedProduct: ProductSearchResult | null;
  detailsReady: boolean;
  loadingPricing: boolean;
  selectedRegions: Region[];
  onSelectedRegionsChange: (value: Region[]) => void;
  activeRegion?: Region;
  onActiveRegionChange: (value: Region) => void;
  existingRegions: Region[];
  existingSku?: Sku;
  generatedSkuCode: string;
  billingCycles: BillingCycle[];
  onBillingCyclesChange: (value: BillingCycle[]) => void;
  pricingDetails: PricingDetails;
  onPricingDetailsChange: (field: keyof PricingDetails, value: string) => void;
  minimumUnits: string;
  onMinimumUnitsChange: (value: string) => void;
  maximumUnits: string;
  onMaximumUnitsChange: (value: string) => void;
  activationTimeline: string;
  onActivationTimelineChange: (value: string) => void;
}) {
  return (
    <SetupStepCard
      step={2}
      icon={PackageIcon}
      title="Review offer details"
      description="Select one or more regions, then fine-tune each region tab before saving the offer set."
    >
      {selectedProduct ? (
        <FieldGroup>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Offer regions</label>
              <RegionMultiSelect
                value={selectedRegions}
                onChange={onSelectedRegionsChange}
                disabled={!detailsReady || loadingPricing}
              />
              <p className="text-sm text-muted-foreground">
                Each selected region gets its own tab. New tabs copy the active
                offer details and start with stock set to 0.
              </p>
            </div>

            {selectedRegions.length > 0 && activeRegion ? (
              <div className="space-y-4">
                <div
                  role="tablist"
                  aria-label="Region tabs"
                  className="flex flex-wrap gap-2"
                >
                  {selectedRegions.map((region) => {
                    const selected = region === activeRegion;
                    const existingRegion = existingRegions.includes(region);

                    return (
                      <Button
                        key={region}
                        type="button"
                        role="tab"
                        id={`region-tab-${region.toLowerCase()}`}
                        aria-selected={selected}
                        aria-controls={`region-panel-${region.toLowerCase()}`}
                        variant={selected ? "secondary" : "outline"}
                        className={cn(
                          "h-auto min-h-11 items-start px-4 py-2 text-left",
                          selected && "ring-3 ring-ring/30",
                        )}
                        onClick={() => onActiveRegionChange(region)}
                      >
                        <span className="flex flex-col items-start gap-0.5">
                          <span>{region}</span>
                          {existingRegion ? (
                            <span className="text-xs text-muted-foreground">
                              existing setup
                            </span>
                          ) : null}
                        </span>
                      </Button>
                    );
                  })}
                </div>

                <div
                  role="tabpanel"
                  id={`region-panel-${activeRegion.toLowerCase()}`}
                  aria-labelledby={`region-tab-${activeRegion.toLowerCase()}`}
                >
                  <BillingDetailsFields
                    instanceKey={`${selectedProduct.id}-${activeRegion}`}
                    region={activeRegion}
                    onRegionChange={() => {}}
                    regionDescription=""
                    hideRegionField
                    catalogCode={generatedSkuCode}
                    catalogCodeDescription={
                      existingSku
                        ? "This regional offer already exists. Saving will update its pricing, constraints, or activation details in place."
                        : generatedSkuCode
                          ? "Generated from the product, plan, and active region tab."
                          : "Choose a plan in step 1 and at least one region here to generate the catalog code."
                    }
                    billingCycles={billingCycles}
                    onBillingCyclesChange={onBillingCyclesChange}
                    pricingDetails={pricingDetails}
                    onPricingDetailsChange={onPricingDetailsChange}
                    minimumUnits={minimumUnits}
                    onMinimumUnitsChange={onMinimumUnitsChange}
                    maximumUnits={maximumUnits}
                    onMaximumUnitsChange={onMaximumUnitsChange}
                    activationTimeline={activationTimeline}
                    onActivationTimelineChange={onActivationTimelineChange}
                    disabled={!detailsReady || loadingPricing}
                    amountDescription="Required for every billing cycle you keep on the active region tab."
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                Choose at least one region to open its offer tab.
              </p>
            )}
          </div>
        </FieldGroup>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Choose a product and plan in step 1 to fill in the regional offer
          details here.
        </p>
      )}
    </SetupStepCard>
  );
}
