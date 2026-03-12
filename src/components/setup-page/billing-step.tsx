import { PackageIcon } from "lucide-react";

import type { ProductSearchResult } from "@/lib/api";
import { BillingDetailsFields } from "@/components/billing-details-fields";
import { FieldGroup } from "@/components/ui/field";
import type { PricePerUnit, Sku } from "@/types";

import { SetupStepCard } from "./setup-step-card";

export function BillingStep({
  selectedProduct,
  detailsReady,
  loadingPricing,
  existingSku,
  generatedSkuCode,
  skuBillingPeriod,
  onSkuBillingPeriodChange,
  skuRegion,
  onSkuRegionChange,
  pricePerUnit,
  onPricePerUnitChange,
}: {
  selectedProduct: ProductSearchResult | null;
  detailsReady: boolean;
  loadingPricing: boolean;
  existingSku?: Sku;
  generatedSkuCode: string;
  skuBillingPeriod: string;
  onSkuBillingPeriodChange: (value: string) => void;
  skuRegion: string;
  onSkuRegionChange: (value: string) => void;
  pricePerUnit: PricePerUnit;
  onPricePerUnitChange: (field: keyof PricePerUnit, value: string) => void;
}) {
  return (
    <SetupStepCard
      step={2}
      icon={PackageIcon}
      title="Review billing details"
      description="We generate the code automatically so operators only need to confirm the commercial details."
    >
      {selectedProduct ? (
        <FieldGroup>
          <BillingDetailsFields
            instanceKey={selectedProduct.id}
            billingPeriod={skuBillingPeriod}
            onBillingPeriodChange={onSkuBillingPeriodChange}
            billingPeriodDescription="This is the main purchase cadence for the billing option."
            region={skuRegion}
            onRegionChange={onSkuRegionChange}
            regionDescription="Leave this blank when the offer is not region-specific."
            catalogCode={generatedSkuCode}
            catalogCodeDescription={
              existingSku
                ? "This exact billing option already exists, so the code is locked to the existing record."
                : generatedSkuCode
                  ? "Generated from the product, plan, billing period, and region when present."
                  : "Choose a plan in step 1 to generate the catalog code."
            }
            pricePerUnit={pricePerUnit}
            onPricePerUnitChange={onPricePerUnitChange}
            disabled={!detailsReady || loadingPricing}
            amountDescription="Required when you are creating a new billing option."
            ratePeriodDescription="Only fill this in when the vendor quote uses a different cadence from the billing period above."
          />
        </FieldGroup>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Choose a product and plan in step 1 to fill in the billing details
          here.
        </p>
      )}
    </SetupStepCard>
  );
}
