import { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxesIcon,
  PencilRulerIcon,
} from "lucide-react";

import type { DashboardSnapshot, Sku } from "@/types";
import { api } from "@/lib/api";
import type { ActionRunner } from "@/components/operations-app";
import { FixedChoiceField } from "@/components/fixed-choice-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function InventoryPage({
  snapshot,
  loading,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
}) {
  const [inventorySkuId, setInventorySkuId] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState(10);
  const [adjustmentChange, setAdjustmentChange] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState<
    | "MANUAL_ADD"
    | "MANUAL_REMOVE"
    | "EXTERNAL_VENDOR_SALE"
    | "REFUND"
    | "CORRECTION"
  >("MANUAL_ADD");
  const [actor, setActor] = useState("operations");

  useEffect(() => {
    setInventorySkuId((current) => current || snapshot.skus[0]?.id || "");
  }, [snapshot]);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Create inventory pool</CardTitle>
            <CardDescription>
              Start tracking available stock for a specific sku.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.skus.length === 0 ? (
              <InlineInventoryEmpty text="Create a sku first to create an inventory pool." />
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const sku = snapshot.skus.find(
                    (item) => item.id === inventorySkuId,
                  );
                  void runAction(
                    () =>
                      api.createInventoryPool({
                        skuId: inventorySkuId,
                        region: sku?.region ?? "US",
                        totalQuantity: inventoryQuantity,
                      }),
                    "Inventory pool created.",
                  );
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel>Sku</FieldLabel>
                    {snapshot.skus.length === 1 ? (
                      <FixedChoiceField
                        value={formatSkuLabel(snapshot.skus[0]!)}
                        hint="Only sku available right now"
                      />
                    ) : (
                      <Select
                        value={inventorySkuId}
                        onValueChange={setInventorySkuId}
                      >
                        <SelectTrigger aria-label="Select sku">
                          <SelectValue placeholder="Select a sku" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {snapshot.skus.map((sku) => (
                              <SelectItem key={sku.id} value={sku.id}>
                                {formatSkuLabel(sku)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel>Total quantity</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      value={inventoryQuantity}
                      onChange={(event) =>
                        setInventoryQuantity(Number(event.target.value))
                      }
                    />
                    <FieldDescription>
                      The current full stock available for this sku.
                    </FieldDescription>
                  </Field>
                  <div className="flex justify-end">
                    <Button disabled={!inventorySkuId || loading}>
                      <BoxesIcon data-icon="inline-start" />
                      Create inventory pool
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Apply adjustment</CardTitle>
            <CardDescription>
              Use explicit reasons so audit and webhooks remain readable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.skus.length === 0 ? (
              <InlineInventoryEmpty text="Create a sku first to apply inventory adjustments." />
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const sku = snapshot.skus.find(
                    (item) => item.id === inventorySkuId,
                  );
                  void runAction(
                    () =>
                      api.adjustInventory({
                        skuId: inventorySkuId,
                        region: sku?.region ?? "US",
                        change:
                          adjustmentReason === "MANUAL_REMOVE"
                            ? -Math.abs(adjustmentChange)
                            : adjustmentChange,
                        reason: adjustmentReason,
                        actor,
                      }),
                    "Inventory adjusted.",
                  );
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel>Adjustment amount</FieldLabel>
                    <Input
                      type="number"
                      value={adjustmentChange}
                      onChange={(event) =>
                        setAdjustmentChange(Number(event.target.value))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Adjustment reason</FieldLabel>
                    <Select
                      value={adjustmentReason}
                      onValueChange={(value) =>
                        setAdjustmentReason(value as typeof adjustmentReason)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an adjustment reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="MANUAL_ADD">manual add</SelectItem>
                          <SelectItem value="MANUAL_REMOVE">
                            manual remove
                          </SelectItem>
                          <SelectItem value="EXTERNAL_VENDOR_SALE">
                            vendor sale
                          </SelectItem>
                          <SelectItem value="REFUND">refund</SelectItem>
                          <SelectItem value="CORRECTION">correction</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Actor</FieldLabel>
                    <Input
                      value={actor}
                      onChange={(event) => setActor(event.target.value)}
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button disabled={!inventorySkuId || loading}>
                      <PencilRulerIcon data-icon="inline-start" />
                      Apply inventory adjustment
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Inventory table</CardTitle>
          <CardDescription>
            Total, reserved, allocated, and available counts by pool.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.inventoryPools.length === 0 ? (
            <InlineInventoryEmpty text="No inventory pools yet. Create one from the card above." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sku</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.inventoryPools.map((pool) => {
                  const available =
                    pool.totalQuantity -
                    pool.reservedQuantity -
                    pool.allocatedQuantity;
                  return (
                    <TableRow key={pool.id}>
                      <TableCell className="font-medium">
                        {pool.skuId}
                      </TableCell>
                      <TableCell>{pool.region}</TableCell>
                      <TableCell>{pool.totalQuantity}</TableCell>
                      <TableCell>{pool.reservedQuantity}</TableCell>
                      <TableCell>{pool.allocatedQuantity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={available <= 0 ? "destructive" : "outline"}
                        >
                          {available}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function formatSkuLabel(sku: Sku) {
  return [sku.code, sku.region, sku.billingPeriod].filter(Boolean).join(" · ");
}

function InlineInventoryEmpty({ text }: { text: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BoxesIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing to show yet</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
