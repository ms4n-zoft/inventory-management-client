import type { PricePerUnit } from "@/types";
import {
  commonRegionOptions,
  billingPeriodOptions,
} from "@/lib/billing-option";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectOrInput } from "@/components/ui/select-or-input";

export function BillingDetailsFields({
  instanceKey,
  billingPeriod,
  onBillingPeriodChange,
  billingPeriodDescription,
  region,
  onRegionChange,
  regionDescription,
  regionDisabled,
  catalogCode,
  catalogCodeDescription,
  pricePerUnit,
  onPricePerUnitChange,
  disabled,
  amountDescription,
  ratePeriodDescription,
}: {
  instanceKey: string;
  billingPeriod: string;
  onBillingPeriodChange: (value: string) => void;
  billingPeriodDescription: string;
  region: string;
  onRegionChange: (value: string) => void;
  regionDescription: string;
  regionDisabled?: boolean;
  catalogCode: string;
  catalogCodeDescription: string;
  pricePerUnit: PricePerUnit;
  onPricePerUnitChange: (field: keyof PricePerUnit, value: string) => void;
  disabled?: boolean;
  amountDescription: string;
  ratePeriodDescription: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel>Billing period</FieldLabel>
        <SelectOrInput
          key={`${instanceKey}-billing-period`}
          options={billingPeriodOptions}
          value={billingPeriod}
          onChange={onBillingPeriodChange}
          placeholder="Select a billing period"
          inputPlaceholder="e.g. quarterly"
          disabled={disabled}
        />
        <FieldDescription>{billingPeriodDescription}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Region (Optional)</FieldLabel>
        <SelectOrInput
          key={`${instanceKey}-region`}
          options={commonRegionOptions}
          value={region}
          onChange={onRegionChange}
          placeholder="Select a region"
          inputPlaceholder="e.g. MENA"
          disabled={disabled || regionDisabled}
        />
        <FieldDescription>{regionDescription}</FieldDescription>
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel>Catalog code</FieldLabel>
        <Input
          value={catalogCode}
          placeholder="Generated automatically"
          readOnly
        />
        <FieldDescription>{catalogCodeDescription}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Price amount</FieldLabel>
        <Input
          value={pricePerUnit.amount}
          onChange={(event) =>
            onPricePerUnitChange("amount", event.target.value)
          }
          placeholder="e.g. 12"
          inputMode="decimal"
          disabled={disabled}
        />
        <FieldDescription>{amountDescription}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Currency</FieldLabel>
        <Input
          value={pricePerUnit.currency ?? ""}
          onChange={(event) =>
            onPricePerUnitChange("currency", event.target.value)
          }
          placeholder="USD"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel>Charged per</FieldLabel>
        <Input
          value={pricePerUnit.entity ?? ""}
          onChange={(event) =>
            onPricePerUnitChange("entity", event.target.value)
          }
          placeholder="e.g. user"
          disabled={disabled}
        />
      </Field>

      <Field>
        <FieldLabel>Rate period</FieldLabel>
        <Input
          value={pricePerUnit.ratePeriod ?? ""}
          onChange={(event) =>
            onPricePerUnitChange("ratePeriod", event.target.value)
          }
          placeholder="e.g. month"
          disabled={disabled}
        />
        <FieldDescription>{ratePeriodDescription}</FieldDescription>
      </Field>
    </div>
  );
}
