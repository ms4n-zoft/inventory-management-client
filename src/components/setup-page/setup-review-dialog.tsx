import { useEffect, useState } from "react";

import {
  formatBillingCycle,
  formatBillingCycleLabel,
  formatPriceLine,
  formatSkuPurchaseTypeLabel,
} from "@/lib/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Region } from "@/types";

import type { RegionEntry } from "./setup-page-model";

function formatUnits(value?: string, fallback = "Not set") {
  const normalizedValue = value?.trim();

  return normalizedValue?.length ? normalizedValue : fallback;
}

function formatMaximumUnits(value?: string) {
  const normalizedValue = value?.trim();

  return normalizedValue?.length ? normalizedValue : "Unlimited";
}

function formatActivationTimeline(value?: string) {
  const normalizedValue = value?.trim();

  return normalizedValue?.length ? normalizedValue : "Not set";
}

function formatStockSummary(entry: RegionEntry) {
  if (!entry.stockTrackingEnabled) {
    return "Stock is not tracked because maximum units is Unlimited.";
  }

  const existingQuantity = entry.existingInventoryPool?.totalQuantity;

  if (existingQuantity === undefined) {
    return entry.draft.inventoryQuantity > 0
      ? `Starting stock: ${entry.draft.inventoryQuantity}`
      : "No starting stock will be created.";
  }

  if (existingQuantity === entry.draft.inventoryQuantity) {
    return `Current stock stays at ${existingQuantity}.`;
  }

  return `Current stock: ${existingQuantity} -> ${entry.draft.inventoryQuantity}`;
}

export function SetupReviewDialog({
  open,
  onOpenChange,
  selectedProductName,
  planName,
  entries,
  saveMessage,
  canConfirm,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductName?: string;
  planName: string;
  entries: RegionEntry[];
  saveMessage: string;
  canConfirm: boolean;
  onConfirm: () => void;
}) {
  const [activeRegion, setActiveRegion] = useState<Region | undefined>(
    entries[0]?.region,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveRegion(entries[0]?.region);
  }, [entries, open]);

  useEffect(() => {
    if (
      activeRegion &&
      entries.some((entry) => entry.region === activeRegion)
    ) {
      return;
    }

    setActiveRegion(entries[0]?.region);
  }, [activeRegion, entries]);

  const activeEntry =
    entries.find((entry) => entry.region === activeRegion) ?? entries[0];
  const activeRegionValue = activeEntry?.region ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Review selected offers</DialogTitle>
            <DialogDescription>
              Confirm each region before the offers are created.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Product
              </p>
              <p className="mt-1 font-medium">
                {selectedProductName ?? "Choose a product"}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Plan
              </p>
              <p className="mt-1 font-medium">
                {planName || "Plan not selected yet"}
              </p>
            </div>
          </div>

          {entries.length > 0 ? (
            <Tabs
              value={activeRegionValue}
              onValueChange={(value) => setActiveRegion(value as Region)}
              className="mt-6"
            >
              <TabsList variant="line" aria-label="Review regions">
                {entries.map((entry) => (
                  <TabsTrigger key={entry.region} value={entry.region}>
                    {entry.region}
                  </TabsTrigger>
                ))}
              </TabsList>

              {entries.map((entry) => (
                <TabsContent
                  key={entry.region}
                  value={entry.region}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge
                      variant={entry.existingSku ? "secondary" : "outline"}
                    >
                      {entry.existingSku ? "Existing offer" : "New offer"}
                    </Badge>
                    <Badge variant="outline">
                      {formatBillingCycle(entry.pricingOption)}
                    </Badge>
                    <Badge variant="outline">
                      {formatSkuPurchaseTypeLabel(entry.draft.purchaseType)}
                    </Badge>
                    <Badge variant="outline">
                      {entry.stockTrackingEnabled
                        ? "Stock tracked"
                        : "Stock skipped"}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Catalog code
                      </p>
                      <p className="mt-2 font-medium text-foreground">
                        {entry.generatedSkuCode || "Generated automatically"}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Inventory
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {formatStockSummary(entry)}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Purchase constraints
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-foreground">
                        <p>
                          Minimum units: {formatUnits(entry.draft.minimumUnits)}
                        </p>
                        <p>
                          Maximum units:{" "}
                          {formatMaximumUnits(entry.draft.maximumUnits)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Activation timeline
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {formatActivationTimeline(
                          entry.draft.activationTimeline,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Pricing
                    </p>
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-col gap-1 rounded-lg border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-foreground">
                          {formatBillingCycleLabel(entry.pricingOption.billingCycle)}
                        </p>
                        <p className="text-sm text-muted-foreground sm:text-right">
                          {formatPriceLine(entry.pricingOption)}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 items-start gap-3 rounded-none px-6 py-5 sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm text-muted-foreground">
            {saveMessage}
          </p>
          <Button type="button" onClick={onConfirm} disabled={!canConfirm}>
            Create offers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
