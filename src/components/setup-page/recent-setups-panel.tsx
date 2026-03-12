import { PackageIcon, PencilRulerIcon } from "lucide-react";

import { formatPriceLine, formatSkuLabel } from "@/lib/catalog";
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

import type { RecentSetupEntry } from "./types";

export function RecentSetupsPanel({
  entries,
  editingSkuId,
  onEditSetup,
}: {
  entries: RecentSetupEntry[];
  editingSkuId?: string;
  onEditSetup: (skuId: string) => void;
}) {
  return (
    <Card className="shadow-none xl:col-span-2">
      <CardHeader>
        <CardTitle>Continue from an existing setup</CardTitle>
        <CardDescription>
          Load a recent billing option back into the create flow to top up stock
          or branch a new variant without retyping everything.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>No setups yet</EmptyTitle>
              <EmptyDescription>
                Your first billing option will appear here once you save it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <div key={entry.sku._id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.product.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {entry.plan.name}
                    </p>
                  </div>
                  <Badge variant="outline">{entry.sku.billingPeriod}</Badge>
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{formatSkuLabel(entry.sku)}</p>
                  <p>
                    {formatPriceLine({
                      ...entry.sku.pricePerUnit,
                      fallbackText: "Pricing unavailable",
                    })}
                  </p>
                  <p>
                    {entry.pools.length > 0
                      ? `${entry.trackedQuantity} tracked across ${entry.pools.length} pool${entry.pools.length === 1 ? "" : "s"}`
                      : "No stock tracked yet"}
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant={
                      editingSkuId === entry.sku._id ? "secondary" : "outline"
                    }
                    onClick={() => onEditSetup(entry.sku._id)}
                  >
                    <PencilRulerIcon data-icon="inline-start" />
                    {editingSkuId === entry.sku._id ? "Editing" : "Edit setup"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
