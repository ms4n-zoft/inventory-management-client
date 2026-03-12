import { BoxesIcon, PackagePlusIcon, PencilRulerIcon } from "lucide-react";

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

import type { ViewSetupEntry } from "./types";

export function BillingOptionsCard({
  entries,
  onEditBilling,
  onEditInventory,
}: {
  entries: ViewSetupEntry[];
  onEditBilling: (skuId: string) => void;
  onEditInventory: (input: { skuId: string; poolId?: string }) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Billing options</CardTitle>
        <CardDescription>
          {entries.length} matching setup{entries.length === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackagePlusIcon />
              </EmptyMedia>
              <EmptyTitle>No matching billing options</EmptyTitle>
              <EmptyDescription>
                Adjust the search or create a new setup from the create page.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div key={entry.sku._id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.product.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[entry.plan.name, entry.product.vendor]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Badge variant="outline">{entry.sku.billingPeriod}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md border bg-muted/40 px-2 py-1">
                    {formatSkuLabel(entry.sku)}
                  </span>
                  <span className="rounded-md border bg-muted/40 px-2 py-1">
                    {formatPriceLine({
                      ...entry.sku.pricePerUnit,
                      fallbackText: "Pricing unavailable",
                    })}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border px-3 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Stock tracking
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {entry.pools.length > 0
                        ? `${entry.trackedQuantity} tracked`
                        : "Not tracked yet"}
                    </p>
                  </div>
                  <div className="rounded-lg border px-3 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Available now
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {entry.pools.length > 0
                        ? `${entry.availableQuantity} available`
                        : "No pool yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditBilling(entry.sku._id)}
                    aria-label={`Edit billing for ${entry.product.name} ${entry.plan.name}`}
                  >
                    <PencilRulerIcon data-icon="inline-start" />
                    Edit billing
                  </Button>
                  {entry.pools.length <= 1 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onEditInventory({
                          skuId: entry.sku._id,
                          poolId: entry.pools[0]?._id,
                        })
                      }
                      aria-label={`${entry.pools.length > 0 ? "Edit" : "Track"} inventory for ${entry.product.name} ${entry.plan.name}`}
                    >
                      <BoxesIcon data-icon="inline-start" />
                      {entry.pools.length > 0
                        ? "Edit inventory"
                        : "Track stock"}
                    </Button>
                  ) : (
                    <p className="self-center text-xs text-muted-foreground">
                      Use the pool table below to edit each regional stock pool.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
