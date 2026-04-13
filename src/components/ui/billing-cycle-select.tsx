import {
  billingCycleOptionsForPurchaseType,
  normalizeBillingCycleForPurchaseType,
} from "@/lib/billing-option";
import type { BillingCycle, SkuPurchaseType } from "@/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export function BillingCycleSelect({
  value,
  purchaseType,
  onChange,
  disabled,
}: {
  value: BillingCycle;
  purchaseType: SkuPurchaseType;
  onChange: (value: BillingCycle) => void;
  disabled?: boolean;
}) {
  const options = billingCycleOptionsForPurchaseType(purchaseType);
  const normalizedValue = normalizeBillingCycleForPurchaseType(
    purchaseType,
    value,
  );

  return (
    <Select
      value={normalizedValue}
      onValueChange={(nextValue) =>
        onChange(
          normalizeBillingCycleForPurchaseType(
            purchaseType,
            nextValue as BillingCycle,
          ),
        )
      }
      disabled={disabled || purchaseType === "one_time"}
    >
      <SelectTrigger aria-label="Billing cycle">
        <SelectValue placeholder="Select a billing cycle" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
