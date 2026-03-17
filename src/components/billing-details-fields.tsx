import type {
  BillingCycle,
  PricingDetails,
  PricingDetailsByCycle,
} from "@/types";
import {
  commonChargedPerOptions,
  commonCurrencyOptions,
  commonRegionOptions,
  orderBillingCycles,
  sharedPricingDetailsFromCycleDetails,
} from "@/lib/billing-option";
import { formatBillingCycleLabel } from "@/lib/catalog";
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
  pricingDetailsByCycle,
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
  disabled?: boolean;
  amountDescription: string;
}) {
  const unlimitedSelected = maximumUnits.length === 0;
  const selectedBillingCycles = orderBillingCycles(billingCycles);
  const sharedPricingDetails = sharedPricingDetailsFromCycleDetails({
    billingCycles: selectedBillingCycles,
    pricingDetailsByCycle,
  });

  const renderAmountField = (
    billingCycle: BillingCycle,
    label: string,
    description: string,
  ) => (
    <Field key={billingCycle}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        aria-label={label}
        value={pricingDetailsByCycle[billingCycle].amount}
        onChange={(event) =>
          onPricingDetailsChange(billingCycle, "amount", event.target.value)
        }
        placeholder="e.g. 12"
        inputMode="decimal"
        disabled={disabled}
      />
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );

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
              Use separate amounts per selected cycle, with one shared currency
              and charged-per value.
            </FieldDescription>
          </Field>

          {selectedBillingCycles.length > 0 ? (
            <>
              {selectedBillingCycles.includes("monthly")
                ? renderAmountField(
                    "monthly",
                    "Monthly price amount",
                    selectedBillingCycles.includes("yearly")
                      ? "Used to auto-fill the yearly amount as monthly x12 until you adjust the yearly value."
                      : amountDescription,
                  )
                : null}

              {selectedBillingCycles.includes("yearly")
                ? renderAmountField(
                    "yearly",
                    "Yearly price amount",
                    selectedBillingCycles.includes("monthly")
                      ? "Starts from monthly x12 and can be adjusted if the annual price differs."
                      : amountDescription,
                  )
                : null}

              {selectedBillingCycles.includes("one_time")
                ? renderAmountField(
                    "one_time",
                    `${formatBillingCycleLabel("one_time")} price amount`,
                    amountDescription,
                  )
                : null}

              <Field>
                <FieldLabel>Currency</FieldLabel>
                <SelectOrInput
                  key={`${instanceKey}-shared-currency`}
                  aria-label="Currency"
                  options={commonCurrencyOptions}
                  value={sharedPricingDetails.currency}
                  onChange={(value) =>
                    onPricingDetailsChange(
                      selectedBillingCycles[0] ?? "monthly",
                      "currency",
                      value,
                    )
                  }
                  placeholder="Select a currency"
                  inputPlaceholder="e.g. AED"
                  disabled={disabled}
                />
                <FieldDescription>
                  Applied to every selected billing cycle.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Charged per</FieldLabel>
                <SelectOrInput
                  key={`${instanceKey}-shared-charged-per`}
                  aria-label="Charged per"
                  options={commonChargedPerOptions}
                  value={sharedPricingDetails.entity}
                  onChange={(value) =>
                    onPricingDetailsChange(
                      selectedBillingCycles[0] ?? "monthly",
                      "entity",
                      value,
                    )
                  }
                  placeholder="Select what is charged"
                  inputPlaceholder="e.g. license"
                  disabled={disabled}
                />
                <FieldDescription>
                  Shared across the selected billing cycles.
                </FieldDescription>
              </Field>
            </>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground sm:col-span-2">
              Select at least one billing cycle to enter pricing.
            </p>
          )}
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
