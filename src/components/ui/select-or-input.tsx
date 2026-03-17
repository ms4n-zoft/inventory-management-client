import { useEffect, useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const CUSTOM_SENTINEL = "__custom__";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface SelectOrInputProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputPlaceholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function SelectOrInput({
  options,
  value,
  onChange,
  placeholder = "Select…",
  inputPlaceholder = "Enter a custom value",
  disabled,
  "aria-label": ariaLabel,
}: SelectOrInputProps) {
  const inOptions = options.some((o) => o.value === value);
  const [mode, setMode] = useState<"select" | "custom">(
    value !== "" && !inOptions ? "custom" : "select",
  );
  const showCustomInput = value === "" ? mode === "custom" : !inOptions;

  useEffect(() => {
    if (value === "") return;

    setMode(inOptions ? "select" : "custom");
  }, [inOptions, value]);

  if (showCustomInput) {
    return (
      <div className="flex gap-2">
        <Input
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={disabled}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          title="Choose from list"
          onClick={() => {
            setMode("select");
            onChange(options[0]?.value ?? "");
          }}
        >
          <RotateCcwIcon />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === CUSTOM_SENTINEL) {
          setMode("custom");
          onChange("");
        } else {
          onChange(v);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              description={o.description}
            >
              {o.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectItem value={CUSTOM_SENTINEL}>Enter custom value…</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
