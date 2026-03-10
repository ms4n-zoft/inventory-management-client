import { useState } from "react";
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
}

export function SelectOrInput({
  options,
  value,
  onChange,
  placeholder = "Select…",
  inputPlaceholder = "Enter a custom value",
  disabled,
}: SelectOrInputProps) {
  const inOptions = options.some((o) => o.value === value);
  const [mode, setMode] = useState<"select" | "custom">(
    value !== "" && !inOptions ? "custom" : "select",
  );

  if (mode === "custom") {
    return (
      <div className="flex gap-2">
        <Input
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
          className="shrink-0"
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
      <SelectTrigger>
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
