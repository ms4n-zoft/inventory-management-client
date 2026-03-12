import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function InventoryStockFields({
  quantityLabel,
  quantityDescription,
  quantity,
  onQuantityChange,
  region,
  regionDescription,
  actor,
  onActorChange,
  actorDescription,
  existingInventory,
  disabled,
}: {
  quantityLabel: string;
  quantityDescription: string;
  quantity: number;
  onQuantityChange: (value: number) => void;
  region: string;
  regionDescription: string;
  actor?: string;
  onActorChange?: (value: string) => void;
  actorDescription?: string;
  existingInventory?: {
    totalQuantity: number;
    reservedQuantity: number;
    allocatedQuantity: number;
  };
  disabled?: boolean;
}) {
  const currentAvailable = existingInventory
    ? existingInventory.totalQuantity -
      existingInventory.reservedQuantity -
      existingInventory.allocatedQuantity
    : 0;

  return (
    <div className="space-y-4">
      {existingInventory && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current stock
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {existingInventory.totalQuantity}
            </p>
          </div>
          <div className="rounded-lg border px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Reserved + allocated
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {existingInventory.reservedQuantity +
                existingInventory.allocatedQuantity}
            </p>
          </div>
          <div className="rounded-lg border px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Available now
            </p>
            <p className="mt-1 text-2xl font-semibold">{currentAvailable}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>{quantityLabel}</FieldLabel>
          <Input
            type="number"
            min={0}
            value={quantity}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
            disabled={disabled}
          />
          <FieldDescription>{quantityDescription}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Inventory region</FieldLabel>
          <Input value={region} readOnly />
          <FieldDescription>{regionDescription}</FieldDescription>
        </Field>

        {onActorChange && actor !== undefined && (
          <Field className="sm:col-span-2">
            <FieldLabel>Updated by</FieldLabel>
            <Input
              value={actor}
              onChange={(event) => onActorChange(event.target.value)}
              placeholder="operations"
              disabled={disabled}
            />
            <FieldDescription>{actorDescription}</FieldDescription>
          </Field>
        )}
      </div>
    </div>
  );
}
