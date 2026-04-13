import type {
  BillingCycle,
  PricingDetails,
  SkuPurchaseType,
} from "@/types";
import {
  commonCurrencyOptions,
  commonRegionOptions,
  purchaseTypeOptions,
} from "@/lib/billing-option";
import { formatBillingCycleLabel } from "@/lib/catalog";
import { BillingCycleSelect } from "@/components/ui/billing-cycle-select";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectOrInput } from "@/components/ui/select-or-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BillingDetailsFields({
  instanceKey,
  region,
  onRegionChange,
  regionDescription,
  regionDisabled,
  hideRegionField,
  catalogCode,
  catalogCodeDescription,
  purchaseType,
  onPurchaseTypeChange,
  billingCycle,
  onBillingCycleChange,
  pricingDetails,
  onPricingDetailsChange,
  minimumUnits,
  onMinimumUnitsChange,
  maximumUnits,
  onMaximumUnitsChange,
  activationTimeline,
  onActivationTimelineChange,
  disabled,
  amountDescription,
  catalogCodeExists,
}: {
  instanceKey: string;
  region: string;
  onRegionChange: (value: string) => void;
  regionDescription: string;
  regionDisabled?: boolean;
  hideRegionField?: boolean;
  catalogCode: string;
  catalogCodeDescription: string;
  purchaseType: SkuPurchaseType;
  onPurchaseTypeChange: (value: SkuPurchaseType) => void;
  billingCycle: BillingCycle;
  onBillingCycleChange: (value: BillingCycle) => void;
  pricingDetails: PricingDetails;
  onPricingDetailsChange: (
    field: keyof PricingDetails,
    value: string,
  ) => void;
  minimumUnits: string;
  onMinimumUnitsChange: (value: string) => void;
  maximumUnits: string;
  onMaximumUnitsChange: (value: string) => void;
  activationTimeline: string;
  onActivationTimelineChange: (value: string) => void;
  disabled?: boolean;
  amountDescription: string;
  catalogCodeExists?: boolean;
}) {
  const unlimitedSelected = maximumUnits.length === 0;
  const catalogCodeDescriptionClass = catalogCodeExists ? "text-red-500/60 text-xs" : "text-xs";
  const billingCycleLabel = formatBillingCycleLabel(billingCycle);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {!hideRegionField ? (
        <Field>
          <FieldLabel>Region</FieldLabel>
          <SelectOrInput
            key={`${instanceKey}-region`}
            options={commonRegionOptions}
            value={region}
            onChange={onRegionChange}
            placeholder="Select a region"
            inputPlaceholder="GCC or INDIA"
            disabled={disabled || regionDisabled}
          />
          <FieldDescription>{regionDescription}</FieldDescription>
        </Field>
      ) : null}

      <Field className="sm:col-span-2">
        <FieldLabel>Catalog code</FieldLabel>
        <Input
          value={catalogCode}
          placeholder="Generated automatically"
          readOnly
        />
        <FieldDescription className={catalogCodeDescriptionClass}>{catalogCodeDescription}</FieldDescription>
      </Field>

      <div className="sm:col-span-2 space-y-3">
        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Purchase type</FieldLabel>
            <Select
              value={purchaseType}
              onValueChange={(value) => onPurchaseTypeChange(value as SkuPurchaseType)}
              disabled={disabled}
            >
              <SelectTrigger aria-label="Purchase type">
                <SelectValue placeholder="Select a purchase type" />
              </SelectTrigger>
              <SelectContent>
                {purchaseTypeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    description={option.description}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Each SKU is now either a subscription or a perpetual license.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Billing cycle</FieldLabel>
            <BillingCycleSelect
              value={billingCycle}
              purchaseType={purchaseType}
              onChange={onBillingCycleChange}
              disabled={disabled}
            />
            <FieldDescription>
              Exactly one billing cycle is stored per SKU. Perpetual licenses
              always use `one_time`.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Price amount</FieldLabel>
            <Input
              aria-label={`${billingCycleLabel} price amount`}
              value={pricingDetails.amount}
              onChange={(event) =>
                onPricingDetailsChange("amount", event.target.value)
              }
              placeholder="e.g. 12"
              inputMode="decimal"
              disabled={disabled}
            />
            <FieldDescription>{amountDescription}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Currency</FieldLabel>
            <SelectOrInput
              key={`${instanceKey}-currency`}
              aria-label="Currency"
              options={commonCurrencyOptions}
              value={pricingDetails.currency}
              onChange={(value) => onPricingDetailsChange("currency", value)}
              placeholder="Select a currency"
              inputPlaceholder="e.g. AED"
              disabled={disabled}
            />
            <FieldDescription>
              Stored with the selected billing cycle.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Discount percentage</FieldLabel>
            <Input
              aria-label={`${billingCycleLabel} discount percentage`}
              value={pricingDetails.discountPercentage}
              onChange={(event) =>
                onPricingDetailsChange("discountPercentage", event.target.value)
              }
              placeholder="e.g. 20"
              inputMode="decimal"
              disabled={disabled}
            />
            <FieldDescription>
              Optional. Enter the percent off for this SKU.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Discounted price</FieldLabel>
            <Input
              aria-label={`${billingCycleLabel} discounted price`}
              value={pricingDetails.discountedAmount}
              onChange={(event) =>
                onPricingDetailsChange("discountedAmount", event.target.value)
              }
              placeholder="e.g. 9.99"
              inputMode="decimal"
              disabled={disabled}
              className="font-medium"
            />
            <FieldDescription>
              Enter either this or the discount percentage. The other field
              updates automatically.
            </FieldDescription>
          </Field>
        </div>
      </div>

      <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Minimum units</FieldLabel>
          <Input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={minimumUnits}
            onChange={(event) =>
              onMinimumUnitsChange(event.target.value.replace(/[^\d]/g, ""))
            }
            placeholder="e.g. 1"
            disabled={disabled}
          />
          <FieldDescription>
            Use the smallest valid purchase quantity. When set, it must be at
            least 1.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Maximum units</FieldLabel>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={unlimitedSelected ? "secondary" : "outline"}
              aria-pressed={unlimitedSelected}
              onClick={() => onMaximumUnitsChange("")}
              disabled={disabled}
              className="min-h-11 shrink-0 px-4 aria-pressed:ring-4 aria-pressed:ring-green-500/50 aria-pressed:shadow-md aria-pressed:font-semibold transition-all"
            >
              Unlimited
            </Button>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={maximumUnits}
              onChange={(event) =>
                onMaximumUnitsChange(event.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="e.g. 500"
              disabled={disabled}
              className="flex-1"
            />
          </div>
          <FieldDescription>
            Leave Unlimited selected for no upper limit, or enter a hard cap to
            enable stock tracking.
          </FieldDescription>
        </Field>
      </div>

      <Field>
        <FieldLabel>Activation timeline (Number of days)</FieldLabel>
        <Input
          type="number"
          value={activationTimeline}
          onChange={(event) => onActivationTimelineChange(event.target.value)}
          placeholder="e.g. 7"
          disabled={disabled}
        />
        <FieldDescription>
          Capture the operator-facing SLA or provisioning expectation for this
          region.
        </FieldDescription>
      </Field>
    </div>
  );
}
