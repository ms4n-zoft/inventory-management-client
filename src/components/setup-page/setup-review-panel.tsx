import { Badge } from "@/components/ui/badge";
import { formatBillingCycles } from "@/lib/catalog";
import type { PricePerUnit, Sku } from "@/types";

export function SetupReviewPanel({
  selectedProductName,
  planName,
  selectedRegions,
  activeRegion,
  pricingOptions,
  existingSku,
  generatedSkuCode,
  saveMessage,
}: {
  selectedProductName?: string;
  planName: string;
  selectedRegions: string[];
  activeRegion?: string;
  pricingOptions: PricePerUnit[];
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
          <Badge variant="outline">
            {pricingOptions.length > 0
              ? formatBillingCycles(pricingOptions)
              : "billing cycles"}
          </Badge>
          {selectedRegions.length > 0 ? (
            selectedRegions.map((region) => (
              <Badge
                key={region}
                variant={region === activeRegion ? "secondary" : "outline"}
              >
                {region}
              </Badge>
            ))
          ) : (
            <Badge variant="outline">region</Badge>
          )}
          {existingSku && <Badge variant="secondary">existing setup</Badge>}
        </div>

        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {activeRegion ? `Code (${activeRegion})` : "Code"}
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
