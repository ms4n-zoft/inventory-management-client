import { BoxesIcon, PencilRulerIcon } from "lucide-react";

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

import type { InventoryRowEntry } from "./types";

export function InventoryPoolsCard({
  rows,
  onEditInventory,
}: {
  rows: InventoryRowEntry[];
  onEditInventory: (input: { skuId: string; poolId?: string }) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Inventory pools</CardTitle>
        <CardDescription>
          {rows.length} matching pool{rows.length === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BoxesIcon />
              </EmptyMedia>
              <EmptyTitle>No matching pools</EmptyTitle>
              <EmptyDescription>
                Create a setup with stock or broaden the current search.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setup</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Committed</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((entry) => (
                <TableRow key={entry.pool._id}>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {entry.product?.name ?? entry.pool.skuId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[entry.plan?.name, entry.sku?.code]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{entry.pool.region}</TableCell>
                  <TableCell>{entry.pool.totalQuantity}</TableCell>
                  <TableCell>
                    {entry.pool.reservedQuantity + entry.pool.allocatedQuantity}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.available <= 0
                          ? "destructive"
                          : entry.available <= 2
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {entry.available}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onEditInventory({
                          skuId: entry.pool.skuId,
                          poolId: entry.pool._id,
                        })
                      }
                      aria-label={`Edit inventory for ${entry.product?.name ?? entry.pool.skuId} ${entry.pool.region}`}
                    >
                      <PencilRulerIcon data-icon="inline-start" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
