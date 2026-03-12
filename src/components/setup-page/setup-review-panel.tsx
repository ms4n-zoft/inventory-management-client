import { Badge } from "@/components/ui/badge";
import type { Sku } from "@/types";

export function SetupReviewPanel({
  selectedProductName,
  planName,
  billingPeriod,
  inventoryRegion,
  existingSku,
  generatedSkuCode,
  saveMessage,
}: {
  selectedProductName?: string;
  planName: string;
  billingPeriod: string;
  inventoryRegion: string;
  existingSku?: Sku;
  generatedSkuCode: string;
  saveMessage: string;
}) {
  return (
    <aside className="rounded-xl border bg-muted/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Review
      </h3>
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Setup
          </p>
          <p className="mt-1 font-medium">
            {selectedProductName ?? "Choose a product"}
          </p>
          <p className="text-sm text-muted-foreground">
            {planName || "Plan not selected yet"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{billingPeriod || "billing period"}</Badge>
          <Badge variant="outline">{inventoryRegion}</Badge>
          {existingSku && <Badge variant="secondary">existing setup</Badge>}
        </div>

        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Code
          </p>
          <p className="mt-1 font-medium text-foreground">
            {generatedSkuCode || "Generated automatically"}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">{saveMessage}</p>
      </div>
    </aside>
  );
}
