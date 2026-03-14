import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BillingDetailsFields } from "@/components/billing-details-fields";

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
        pricingDetails={{
          amount: "18",
          currency: "USD",
          entity: "user",
        }}
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
        pricingDetails={{
          amount: "18",
          currency: "USD",
          entity: "user",
        }}
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
});
