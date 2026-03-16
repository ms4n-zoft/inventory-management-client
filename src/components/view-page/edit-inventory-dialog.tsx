import { BoxesIcon } from "lucide-react";

import { InventoryStockFields } from "@/components/inventory-stock-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ViewSetupEntry } from "./types";
import type { InventoryPool } from "@/types";

export function EditInventoryDialog({
  entry,
  pool,
  open,
  onOpenChange,
  quantity,
  onQuantityChange,
  region,
  actor,
  onActorChange,
  stockTrackingEnabled,
  canSave,
  loading,
  onSave,
}: {
  entry: ViewSetupEntry | null;
  pool: InventoryPool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  region: string;
  actor: string;
  onActorChange: (value: string) => void;
  stockTrackingEnabled: boolean;
  canSave: boolean;
  loading: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {entry && (
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {stockTrackingEnabled
                ? pool
                  ? "Edit inventory"
                  : "Track stock"
                : "Stock tracking unavailable"}
            </DialogTitle>
            <DialogDescription>
              {stockTrackingEnabled
                ? pool
                  ? `Adjust the tracked stock for ${entry.product.name} · ${entry.plan.name}.`
                  : `Start tracking stock for ${entry.product.name} · ${entry.plan.name}.`
                : `Maximum units is set to Unlimited for ${entry.product.name} · ${entry.plan.name}. Add a hard cap in billing before editing stock.`}
            </DialogDescription>
          </DialogHeader>

            <div className="min-h-0 overflow-y-auto pr-1">
              {stockTrackingEnabled ? (
                <InventoryStockFields
                  quantityLabel={pool ? "Stock total" : "Starting stock"}
                  quantityDescription={
                    pool
                      ? "Enter the total stock you want on hand. We will add or remove the difference automatically."
                      : "Enter the stock you want to start tracking for this regional offer."
                  }
                  quantity={quantity}
                  onQuantityChange={onQuantityChange}
                  region={region}
                  regionDescription="Stock is attached directly to the regional offer."
                  actor={pool ? actor : undefined}
                  onActorChange={pool ? onActorChange : undefined}
                  actorDescription="Used only when the stock total changes."
                  existingInventory={
                    pool
                      ? {
                          totalQuantity: pool.totalQuantity,
                        }
                      : undefined
                  }
                  disabled={loading}
                />
              ) : (
                <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  This offer is Unlimited, so stock is not tracked. Save a maximum
                  units cap in billing first if you need inventory for this region.
                </p>
              )}
            </div>

          <DialogFooter showCloseButton>
            {stockTrackingEnabled ? (
              <Button disabled={!canSave || loading} onClick={onSave}>
                <BoxesIcon data-icon="inline-start" />
                {pool ? "Save inventory" : "Track stock"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
