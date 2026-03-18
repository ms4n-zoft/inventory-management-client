import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BillingDetailsFields } from "@/components/billing-details-fields";
import { applyPricingDetailsChange } from "@/lib/billing-option";
import type { BillingCycle, PricingDetailsByCycle } from "@/types";

function buildPricingDetailsByCycle(): PricingDetailsByCycle {
  return {
    monthly: {
      amount: "18",
      currency: "USD",
      entity: "user",
      ratePeriod: "month",
      discountPercentage: "",
      discountedAmount: "",
    },
    yearly: {
      amount: "180",
      currency: "USD",
      entity: "user",
      ratePeriod: "year",
      discountPercentage: "",
      discountedAmount: "",
    },
    one_time: {
      amount: "300",
      currency: "USD",
      entity: "user",
      ratePeriod: "one time",
      discountPercentage: "",
      discountedAmount: "",
    },
  };
}

function ControlledBillingDetailsFields({
  initialBillingCycles = ["monthly", "yearly"],
  initialPricingDetailsByCycle = buildPricingDetailsByCycle(),
}: {
  initialBillingCycles?: BillingCycle[];
  initialPricingDetailsByCycle?: PricingDetailsByCycle;
}) {
  const [billingCycles, setBillingCycles] =
    useState<BillingCycle[]>(initialBillingCycles);
  const [pricingDetailsByCycle, setPricingDetailsByCycle] =
    useState<PricingDetailsByCycle>(initialPricingDetailsByCycle);

  return (
    <BillingDetailsFields
      instanceKey="jira-standard"
      region="GCC"
      onRegionChange={vi.fn()}
      regionDescription="Choose a region"
      catalogCode="jira-standard-gcc"
      catalogCodeDescription="Generated from the product, plan, and region."
      billingCycles={billingCycles}
      onBillingCyclesChange={setBillingCycles}
      pricingDetailsByCycle={pricingDetailsByCycle}
      onPricingDetailsChange={(billingCycle, field, value) => {
        setPricingDetailsByCycle((current) =>
          applyPricingDetailsChange({
            billingCycles,
            pricingDetailsByCycle: current,
            billingCycle,
            field,
            value,
          }),
        );
      }}
      minimumUnits="1"
      onMinimumUnitsChange={vi.fn()}
      maximumUnits="500"
      onMaximumUnitsChange={vi.fn()}
      activationTimeline="5 Days"
      onActivationTimelineChange={vi.fn()}
      amountDescription="Required for every billing cycle you keep on the offer."
    />
  );
}

describe("BillingDetailsFields", () => {
  it("shows Unlimited as the active maximum-units option and keeps it input-sized", () => {
    const onMaximumUnitsChange = vi.fn();

    render(
      <BillingDetailsFields
        instanceKey="jira-standard"
        region="GCC"
        onRegionChange={vi.fn()}
        regionDescription="Choose a region"
        catalogCode="jira-standard-gcc"
        catalogCodeDescription="Generated from the product, plan, and region."
        billingCycles={["monthly"]}
        onBillingCyclesChange={vi.fn()}
        pricingDetailsByCycle={buildPricingDetailsByCycle()}
        onPricingDetailsChange={vi.fn()}
        minimumUnits="1"
        onMinimumUnitsChange={vi.fn()}
        maximumUnits=""
        onMaximumUnitsChange={onMaximumUnitsChange}
        activationTimeline="5 Days"
        onActivationTimelineChange={vi.fn()}
        amountDescription="Required for every billing cycle you keep on the offer."
      />,
    );

    const unlimitedButton = screen.getByRole("button", {
      name: /unlimited/i,
    });

    expect(unlimitedButton).toHaveAttribute("aria-pressed", "true");
    expect(unlimitedButton).toHaveClass("min-h-11");

    fireEvent.click(unlimitedButton);

    expect(onMaximumUnitsChange).toHaveBeenCalledWith("");
  });

  it("clears the active state when operators enter a maximum unit cap", () => {
    render(
      <BillingDetailsFields
        instanceKey="jira-standard"
        region="GCC"
        onRegionChange={vi.fn()}
        regionDescription="Choose a region"
        catalogCode="jira-standard-gcc"
        catalogCodeDescription="Generated from the product, plan, and region."
        billingCycles={["monthly"]}
        onBillingCyclesChange={vi.fn()}
        pricingDetailsByCycle={buildPricingDetailsByCycle()}
        onPricingDetailsChange={vi.fn()}
        minimumUnits="1"
        onMinimumUnitsChange={vi.fn()}
        maximumUnits="500"
        onMaximumUnitsChange={vi.fn()}
        activationTimeline="5 Days"
        onActivationTimelineChange={vi.fn()}
        amountDescription="Required for every billing cycle you keep on the offer."
      />,
    );

    expect(screen.getByRole("button", { name: /unlimited/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByDisplayValue("500")).toBeInTheDocument();
  });

  it("shows shared currency and charged-per fields while auto-filling yearly from monthly", () => {
    const initialPricingDetailsByCycle = buildPricingDetailsByCycle();
    initialPricingDetailsByCycle.yearly.amount = "";

    render(
      <ControlledBillingDetailsFields
        initialPricingDetailsByCycle={initialPricingDetailsByCycle}
      />,
    );

    expect(
      screen.getByRole("textbox", { name: /monthly price amount/i }),
    ).toHaveValue("18");
    expect(
      screen.getByRole("textbox", { name: /yearly price amount/i }),
    ).toHaveValue("");
    expect(
      screen.queryByRole("textbox", { name: /monthly charged per/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /^charged per$/i }),
    ).toHaveTextContent("user");

    fireEvent.change(
      screen.getByRole("textbox", { name: /monthly price amount/i }),
      {
        target: { value: "12" },
      },
    );

    expect(
      screen.getByRole("textbox", { name: /yearly price amount/i }),
    ).toHaveValue("144");
  });

  it("calculates the discounted price from the entered discount percentage", () => {
    render(
      <ControlledBillingDetailsFields initialBillingCycles={["monthly"]} />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: /monthly discount percentage/i }),
      {
        target: { value: "20.125" },
      },
    );

    expect(
      screen.getByRole("textbox", { name: /monthly discounted price/i }),
    ).toHaveValue("14.38");
  });

  it("calculates the discount percentage from the entered discounted price", () => {
    render(
      <ControlledBillingDetailsFields initialBillingCycles={["monthly"]} />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: /monthly discounted price/i }),
      {
        target: { value: "14.395" },
      },
    );

    expect(
      screen.getByRole("textbox", { name: /monthly discounted price/i }),
    ).toHaveValue("14.4");
    expect(
      screen.getByRole("textbox", { name: /monthly discount percentage/i }),
    ).toHaveValue("20");
  });
});
