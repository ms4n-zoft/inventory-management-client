import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyPricingDetailsChange,
  createPricingDetails,
  normalizeBillingCycleForPurchaseType,
  syncPricingDetailsForBillingCycle,
} from "@/lib/billing-option";
import type { BillingCycle, PricingDetails, SkuPurchaseType } from "@/types";

import { BillingDetailsFields } from "../billing-details-fields";

function ControlledBillingDetailsFields({
  initialPurchaseType = "subscription",
  initialBillingCycle = "monthly",
}: {
  initialPurchaseType?: SkuPurchaseType;
  initialBillingCycle?: BillingCycle;
}) {
  const [purchaseType, setPurchaseType] =
    useState<SkuPurchaseType>(initialPurchaseType);
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>(initialBillingCycle);
  const [pricingDetails, setPricingDetails] = useState(
    createPricingDetails({
      billingCycle: initialBillingCycle,
      amount: "18",
      currency: "USD",
    }),
  );

  const handlePurchaseTypeChange = (nextPurchaseType: SkuPurchaseType) => {
    setPurchaseType(nextPurchaseType);
    setBillingCycle((currentBillingCycle) => {
      const nextBillingCycle = normalizeBillingCycleForPurchaseType(
        nextPurchaseType,
        currentBillingCycle,
      );

      setPricingDetails((currentPricingDetails) =>
        syncPricingDetailsForBillingCycle({
          pricingDetails: currentPricingDetails,
          nextBillingCycle,
        }),
      );

      return nextBillingCycle;
    });
  };

  const handleBillingCycleChange = (nextBillingCycle: BillingCycle) => {
    setBillingCycle(nextBillingCycle);
    setPricingDetails((currentPricingDetails) =>
      syncPricingDetailsForBillingCycle({
        pricingDetails: currentPricingDetails,
        nextBillingCycle,
      }),
    );
  };

  return (
    <>
      <BillingDetailsFields
        instanceKey="test"
        region="GCC"
        onRegionChange={vi.fn()}
        regionDescription="Region help"
        catalogCode="jira-standard-gcc-monthly"
        catalogCodeDescription="Generated automatically"
        purchaseType={purchaseType}
        onPurchaseTypeChange={handlePurchaseTypeChange}
        billingCycle={billingCycle}
        onBillingCycleChange={handleBillingCycleChange}
        pricingDetails={pricingDetails}
        onPricingDetailsChange={(field: keyof PricingDetails, value: string) => {
          setPricingDetails((current) =>
            applyPricingDetailsChange({
              pricingDetails: current,
              field,
              value,
            }),
          );
        }}
        minimumUnits="1"
        onMinimumUnitsChange={vi.fn()}
        maximumUnits=""
        onMaximumUnitsChange={vi.fn()}
        activationTimeline="7"
        onActivationTimelineChange={vi.fn()}
        amountDescription="Price help"
      />
      <dl>
        <div>
          <dt>Purchase type</dt>
          <dd data-testid="purchase-type-value">{purchaseType}</dd>
        </div>
        <div>
          <dt>Billing cycle</dt>
          <dd data-testid="billing-cycle-value">{billingCycle}</dd>
        </div>
        <div>
          <dt>Charged per</dt>
          <dd data-testid="charged-per-value">{pricingDetails.entity}</dd>
        </div>
        <div>
          <dt>Rate period</dt>
          <dd data-testid="rate-period-value">{pricingDetails.ratePeriod}</dd>
        </div>
      </dl>
    </>
  );
}

function selectOption(label: RegExp, optionLabel: RegExp) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: optionLabel }));
}

describe("BillingDetailsFields", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("renders the single purchase-type and billing-cycle flow", () => {
    render(<ControlledBillingDetailsFields />);

    expect(
      screen.getByRole("combobox", { name: /purchase type/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /billing cycle/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /monthly price amount/i }),
    ).toHaveValue("18");
    expect(screen.getByDisplayValue("jira-standard-gcc-monthly")).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: /charged per/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /rate period/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps discount fields synchronized for the selected billing cycle", () => {
    render(<ControlledBillingDetailsFields />);

    fireEvent.change(
      screen.getByRole("textbox", { name: /monthly discount percentage/i }),
      {
        target: { value: "10" },
      },
    );

    expect(
      screen.getByRole("textbox", { name: /monthly discounted price/i }),
    ).toHaveValue("16.2");
  });

  it("locks perpetual licenses to one_time defaults", () => {
    render(<ControlledBillingDetailsFields />);

    selectOption(/purchase type/i, /perpetual license/i);

    expect(screen.getByTestId("purchase-type-value")).toHaveTextContent(
      "one_time",
    );
    expect(screen.getByTestId("billing-cycle-value")).toHaveTextContent(
      "one_time",
    );
    expect(screen.getByTestId("charged-per-value")).toHaveTextContent("user");
    expect(screen.getByTestId("rate-period-value")).toHaveTextContent(
      "one_time",
    );
    expect(
      screen.getByRole("combobox", { name: /billing cycle/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: /one time price amount/i }),
    ).toBeInTheDocument();
  });

  it("updates the derived rate period when the billing cycle changes", () => {
    render(<ControlledBillingDetailsFields />);

    selectOption(/billing cycle/i, /^yearly$/i);

    expect(screen.getByTestId("billing-cycle-value")).toHaveTextContent(
      "yearly",
    );
    expect(screen.getByTestId("charged-per-value")).toHaveTextContent("user");
    expect(screen.getByTestId("rate-period-value")).toHaveTextContent(
      "yearly",
    );
  });
});
