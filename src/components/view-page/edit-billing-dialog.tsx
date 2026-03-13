import { PencilRulerIcon } from "lucide-react";

import { BillingDetailsFields } from "@/components/billing-details-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PricePerUnit, Sku } from "@/types";

import type { ViewSetupEntry } from "./types";

export function EditBillingDialog({
  entry,
  open,
  onOpenChange,
  billingPeriod,
  onBillingPeriodChange,
  region,
  onRegionChange,
  generatedCode,
  pricePerUnit,
  onPricePerUnitChange,
  canSave,
  loading,
  onSave,
}: {
  entry: ViewSetupEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingPeriod: Sku["billingPeriod"];
  onBillingPeriodChange: (value: Sku["billingPeriod"]) => void;
  region: string;
  onRegionChange: (value: string) => void;
  generatedCode: string;
  pricePerUnit: PricePerUnit;
  onPricePerUnitChange: (field: keyof PricePerUnit, value: string) => void;
  canSave: boolean;
  loading: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {entry && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit billing</DialogTitle>
            <DialogDescription>
              Update the billing option for {entry.product.name} ·{" "}
              {entry.plan.name} using the same fields operators see in the
              create flow.
            </DialogDescription>
          </DialogHeader>

          <BillingDetailsFields
            instanceKey={entry.sku._id}
            billingPeriod={billingPeriod}
            onBillingPeriodChange={(value) =>
              onBillingPeriodChange(value as Sku["billingPeriod"])
            }
            billingPeriodDescription="This is the main purchase cadence for the billing option."
            region={region}
            onRegionChange={onRegionChange}
            regionDescription={
              entry.hasLockedRegion
                ? "Region is locked after stock exists for this billing option."
                : "Leave this blank when the offer is not region-specific."
            }
            regionDisabled={entry.hasLockedRegion}
            catalogCode={generatedCode}
            catalogCodeDescription="The code updates automatically from the product, plan, billing period, and region."
            pricePerUnit={pricePerUnit}
            onPricePerUnitChange={onPricePerUnitChange}
            disabled={loading}
            amountDescription="Keep this in sync with the vendor quote operators should use."
            ratePeriodDescription="Only fill this in when the vendor quote uses a different cadence from the billing period above."
          />

          <DialogFooter showCloseButton>
            <Button disabled={!canSave || loading} onClick={onSave}>
              <PencilRulerIcon data-icon="inline-start" />
              Save billing
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
