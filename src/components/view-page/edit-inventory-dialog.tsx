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
  canSave: boolean;
  loading: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {entry && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{pool ? "Edit inventory" : "Track stock"}</DialogTitle>
            <DialogDescription>
              {pool
                ? `Adjust the tracked stock for ${entry.product.name} · ${entry.plan.name}.`
                : `Start tracking stock for ${entry.product.name} · ${entry.plan.name}.`}
            </DialogDescription>
          </DialogHeader>

          <InventoryStockFields
            quantityLabel={pool ? "Stock total" : "Starting stock"}
            quantityDescription={
              pool
                ? "Enter the total stock you want on hand. We will add or remove the difference automatically."
                : "Enter the stock you want to start tracking for this billing option."
            }
            quantity={quantity}
            onQuantityChange={onQuantityChange}
            region={region}
            regionDescription="Stock follows the billing region when one is set, or falls back to GLOBAL."
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

          <DialogFooter showCloseButton>
            <Button disabled={!canSave || loading} onClick={onSave}>
              <BoxesIcon data-icon="inline-start" />
              {pool ? "Save inventory" : "Track stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
