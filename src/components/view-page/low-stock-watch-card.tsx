import { AlertCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import type { InventoryRowEntry } from "./types";

export function LowStockWatchCard({
  entries,
}: {
  entries: InventoryRowEntry[];
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Watch list</CardTitle>
        <CardDescription>
          Quick attention points before you leave the view page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertCircleIcon />
              </EmptyMedia>
              <EmptyTitle>No low-stock pools</EmptyTitle>
              <EmptyDescription>
                Every tracked pool currently has more than two seats left.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.pool._id}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {entry.product?.name ?? entry.pool.skuId}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[entry.plan?.name, entry.pool.region]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Badge
                variant={entry.available === 0 ? "destructive" : "outline"}
              >
                {entry.available} left
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
