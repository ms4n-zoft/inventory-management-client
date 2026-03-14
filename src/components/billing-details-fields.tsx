import type { BillingCycle, PricingDetails } from "@/types";
import {
  commonCurrencyOptions,
  commonRegionOptions,
} from "@/lib/billing-option";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { BillingCycleMultiSelect } from "@/components/ui/billing-cycle-multi-select";
import { Input } from "@/components/ui/input";
import { SelectOrInput } from "@/components/ui/select-or-input";

export function BillingDetailsFields({
  instanceKey,
  region,
  onRegionChange,
  regionDescription,
  regionDisabled,
  hideRegionField,
  catalogCode,
  catalogCodeDescription,
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
  disabled,
  amountDescription,
}: {
  instanceKey: string;
  region: string;
  onRegionChange: (value: string) => void;
  regionDescription: string;
  regionDisabled?: boolean;
  hideRegionField?: boolean;
  catalogCode: string;
  catalogCodeDescription: string;
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
  disabled?: boolean;
  amountDescription: string;
}) {
  const unlimitedSelected = maximumUnits.length === 0;

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
        <FieldDescription>{catalogCodeDescription}</FieldDescription>
      </Field>

      <div className="sm:col-span-2 space-y-3">
        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>Billing cycles</FieldLabel>
            <BillingCycleMultiSelect
              value={billingCycles}
              onChange={onBillingCyclesChange}
              disabled={disabled}
            />
            <FieldDescription>
              Use one shared pricing setup across the selected billing cycles.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Price amount</FieldLabel>
            <Input
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
              options={commonCurrencyOptions}
              value={pricingDetails.currency}
              onChange={(value) => onPricingDetailsChange("currency", value)}
              placeholder="Select a currency"
              inputPlaceholder="e.g. AED"
              disabled={disabled}
            />
          </Field>

          <Field>
            <FieldLabel>Charged per</FieldLabel>
            <Input
              value={pricingDetails.entity}
              onChange={(event) =>
                onPricingDetailsChange("entity", event.target.value)
              }
              placeholder="e.g. user"
              disabled={disabled}
            />
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
            Leave Unlimited selected for no upper limit, or enter a hard cap.
          </FieldDescription>
        </Field>
      </div>

      <Field>
        <FieldLabel>Activation timeline</FieldLabel>
        <Input
          value={activationTimeline}
          onChange={(event) => onActivationTimelineChange(event.target.value)}
          placeholder="e.g. 7 Working Days"
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
