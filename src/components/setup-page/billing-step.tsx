import { PackageIcon } from "lucide-react";

import type { ProductSearchResult } from "@/lib/api";
import { BillingDetailsFields } from "@/components/billing-details-fields";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            <Field>
              <FieldLabel>Offer regions</FieldLabel>
              <RegionMultiSelect
                value={selectedRegions}
                onChange={onSelectedRegionsChange}
                disabled={!detailsReady || loadingPricing}
              />
              <FieldDescription>
                Pick one or both regions. You can keep multiple selected at
                once, and each selected region opens its own offer tab.
              </FieldDescription>
            </Field>

            {selectedRegions.length > 0 && activeRegion ? (
              <Tabs
                value={activeRegion}
                onValueChange={(value) => onActiveRegionChange(value as Region)}
              >
                <TabsList variant="line" aria-label="Region tabs">
                  {selectedRegions.map((region) => {
                    const existingRegion = existingRegions.includes(region);

                    return (
                      <TabsTrigger
                        key={region}
                        value={region}
                        className="group/region-tab h-auto items-start gap-0 text-left"
                      >
                        <span className="flex flex-col items-start gap-1">
                          <span className="leading-none">{region}</span>
                          {existingRegion ? (
                            <span className="text-xs text-muted-foreground transition-colors group-data-[state=active]/region-tab:text-muted-foreground">
                              existing setup
                            </span>
                          ) : null}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent key={activeRegion} value={activeRegion}>
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
                </TabsContent>
              </Tabs>
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
