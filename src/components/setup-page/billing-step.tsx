import { useCallback, useRef } from "react";
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
import type {
  BillingCycle,
  PricingDetails,
  PricingDetailsByCycle,
  Region,
  Sku,
} from "@/types";

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
  pricingDetailsByCycle,
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
  pricingDetailsByCycle: PricingDetailsByCycle;
  onPricingDetailsChange: (
    billingCycle: BillingCycle,
    field: keyof PricingDetails,
    value: string,
  ) => void;
  minimumUnits: string;
  onMinimumUnitsChange: (value: string) => void;
  maximumUnits: string;
  onMaximumUnitsChange: (value: string) => void;
  activationTimeline: string;
  onActivationTimelineChange: (value: string) => void;
}) {
  const stepRef = useRef<HTMLDivElement | null>(null);

  const handleSelectedRegionsChange = useCallback(
    (value: Region[]) => {
      const topBeforeUpdate = stepRef.current?.getBoundingClientRect().top;

      onSelectedRegionsChange(value);

      if (topBeforeUpdate === undefined) {
        return;
      }

      requestAnimationFrame(() => {
        const topAfterUpdate = stepRef.current?.getBoundingClientRect().top;

        if (
          topAfterUpdate === undefined ||
          typeof window.scrollBy !== "function"
        ) {
          return;
        }

        const topDelta = topAfterUpdate - topBeforeUpdate;

        if (Math.abs(topDelta) > 1) {
          window.scrollBy({ top: topDelta });
        }
      });
    },
    [onSelectedRegionsChange],
  );

  return (
    <div ref={stepRef}>
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
                  onChange={handleSelectedRegionsChange}
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
                  onValueChange={(value) =>
                    onActiveRegionChange(value as Region)
                  }
                >
                  <TabsList variant="line" aria-label="Region tabs">
                    {selectedRegions.map((region) => {
                      return (
                        <TabsTrigger
                          key={region}
                          value={region}
                          className="group/region-tab h-auto items-start gap-0 text-left"
                        >
                          <span className="leading-none">{region}</span>
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
                      pricingDetailsByCycle={pricingDetailsByCycle}
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
    </div>
  );
}
