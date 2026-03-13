import { BoxesIcon } from "lucide-react";

import { InventoryStockFields } from "@/components/inventory-stock-fields";
import { FieldGroup } from "@/components/ui/field";
import type { InventoryPool } from "@/types";

import { SetupStepCard } from "./setup-step-card";

export function StockStep({
  detailsReady,
  existingInventoryPool,
  inventoryQuantity,
  onInventoryQuantityChange,
  inventoryRegion,
  inventoryActor,
  onInventoryActorChange,
}: {
  detailsReady: boolean;
  existingInventoryPool?: InventoryPool;
  inventoryQuantity: number;
  onInventoryQuantityChange: (value: number) => void;
  inventoryRegion: string;
  inventoryActor: string;
  onInventoryActorChange: (value: string) => void;
}) {
  return (
    <SetupStepCard
      step={3}
      icon={BoxesIcon}
      title="Set starting stock"
      description="You can track inventory immediately here, or leave stock at 0 and come back later."
    >
      {detailsReady ? (
        <FieldGroup>
          <InventoryStockFields
            quantityLabel={
              existingInventoryPool ? "Stock total" : "Starting stock"
            }
            quantityDescription={
              existingInventoryPool
                ? "Enter the total stock you want on hand. We will add or remove the difference automatically."
                : "Leave 0 if you want to save the billing option first and track stock later."
            }
            quantity={inventoryQuantity}
            onQuantityChange={onInventoryQuantityChange}
            region={inventoryRegion}
            regionDescription="Stock follows the billing region when one is set, or falls back to GLOBAL."
            actor={existingInventoryPool ? inventoryActor : undefined}
            onActorChange={
              existingInventoryPool ? onInventoryActorChange : undefined
            }
            actorDescription="Used only when the stock total changes."
            existingInventory={
              existingInventoryPool
                ? {
                    totalQuantity: existingInventoryPool.totalQuantity,
                  }
                : undefined
            }
          />
        </FieldGroup>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Choose the billing option first, then decide whether you want to start
          tracking stock immediately.
        </p>
      )}
    </SetupStepCard>
  );
}
