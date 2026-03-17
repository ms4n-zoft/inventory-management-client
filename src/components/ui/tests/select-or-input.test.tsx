import { act, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelectOrInput } from "../select-or-input";

const currencyOptions = ["USD", "INR"].map((currency) => ({
  value: currency,
  label: currency,
}));

function ControlledSelectOrInput({
  initialValue = "USD",
  onChange,
  ariaLabel,
}: {
  initialValue?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <SelectOrInput
      aria-label={ariaLabel}
      options={currencyOptions}
      value={value}
      onChange={(nextValue) => {
        onChange?.(nextValue);
        setValue(nextValue);
      }}
      placeholder="Select a currency"
      inputPlaceholder="e.g. AED"
    />
  );
}

describe("SelectOrInput", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("switches to custom entry mode from the preset list", async () => {
    const onChange = vi.fn();

    render(<ControlledSelectOrInput onChange={onChange} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/enter custom value/i));
    });

    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByPlaceholderText(/e\.g\. aed/i)).toBeInTheDocument();
  });

  it("keeps the same accessible name in select and custom modes", async () => {
    render(<ControlledSelectOrInput ariaLabel="Currency" />);

    expect(
      screen.getByRole("combobox", { name: /^currency$/i }),
    ).toHaveTextContent("USD");

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: /^currency$/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/enter custom value/i));
    });

    expect(screen.getByRole("textbox", { name: /^currency$/i })).toHaveValue(
      "",
    );
  });

  it("follows external value changes between preset and custom values", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SelectOrInput
        options={currencyOptions}
        value="USD"
        onChange={onChange}
        placeholder="Select a currency"
        inputPlaceholder="e.g. AED"
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();

    rerender(
      <SelectOrInput
        options={currencyOptions}
        value="AED"
        onChange={onChange}
        placeholder="Select a currency"
        inputPlaceholder="e.g. AED"
      />,
    );

    expect(screen.getByPlaceholderText(/e\.g\. aed/i)).toHaveValue("AED");

    rerender(
      <SelectOrInput
        options={currencyOptions}
        value="INR"
        onChange={onChange}
        placeholder="Select a currency"
        inputPlaceholder="e.g. AED"
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/e\.g\. aed/i),
    ).not.toBeInTheDocument();
  });
});
