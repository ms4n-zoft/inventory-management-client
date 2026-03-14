import { useMemo } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import {
  commonRegionOptions,
  orderRegions,
  toggleRegionSelection,
} from "@/lib/billing-option";
import { cn } from "@/lib/utils";
import type { Region } from "@/types";

import { Badge } from "./badge";

export function RegionMultiSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select regions",
}: {
  value: Region[];
  onChange: (value: Region[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const selectedRegions = useMemo(() => orderRegions(value), [value]);

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Regions"
          aria-haspopup="listbox"
          data-slot="region-trigger"
          disabled={disabled}
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-left text-sm transition-[border-color,background-color,color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring data-[state=open]:bg-accent/40",
            selectedRegions.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selectedRegions.length > 0 ? (
              selectedRegions.map((region) => (
                <Badge key={region} variant="outline">
                  {region}
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border bg-popover p-1 text-popover-foreground ring-1 ring-foreground/10 outline-none duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="px-2 py-1 text-xs text-muted-foreground">
            Each selected region gets its own offer tab with independent pricing
            and stock.
          </div>

          <div role="listbox" aria-label="Region options">
            {commonRegionOptions.map((option) => {
              const region = option.value as Region;
              const selected = selectedRegions.includes(region);

              return (
                <button
                  key={region}
                  type="button"
                  role="option"
                  aria-label={option.label}
                  aria-selected={selected}
                  data-slot="region-option"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                    selected && "bg-accent/60",
                  )}
                  onClick={() => {
                    onChange(toggleRegionSelection(selectedRegions, region));
                  }}
                >
                  <span className="flex size-4 items-center justify-center">
                    <CheckIcon
                      className={cn(
                        "size-4",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
