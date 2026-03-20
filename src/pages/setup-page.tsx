import { BoxesIcon } from "lucide-react";

import type { ActionRunner } from "@/components/operations-app";
import { BillingStep } from "@/components/setup-page/billing-step";
import { ProductPlanStep } from "@/components/setup-page/product-plan-step";
import { SetupReviewDialog } from "@/components/setup-page/setup-review-dialog";
import { StockStep } from "@/components/setup-page/stock-step";
import { useSetupPage } from "@/components/setup-page/use-setup-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSnapshot } from "@/types";

export function SetupPage({
  snapshot,
  loading,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
}) {
  const setup = useSetupPage({ snapshot, loading, runAction });
  const showStockStep =
    setup.stockStep.detailsReady &&
    setup.stockStep.entries.some((entry) => entry.stockTrackingEnabled);

  return (
    <div ref={setup.formRef}>
      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border bg-muted">
              <BoxesIcon />
            </div>
            <div>
              <CardTitle>Create product setup</CardTitle>
              <CardDescription>
                Add the regional offer and starting stock together so operators
                only need one creation flow.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={setup.submit.onSubmit} className="space-y-6">
            <ProductPlanStep {...setup.productStep} />
            <BillingStep {...setup.billingStep} />

            {showStockStep ? <StockStep {...setup.stockStep} /> : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {setup.submit.saveMessage}
              </p>
              <Button
                type="button"
                disabled={!setup.submit.canSubmit}
                onClick={setup.submit.openReview}
              >
                <BoxesIcon data-icon="inline-start" />
                {setup.submit.label}
              </Button>
            </div>
          </form>

          <SetupReviewDialog
            {...setup.reviewDialog}
            canConfirm={setup.submit.canSubmit}
            onConfirm={setup.submit.confirm}
          />
        </CardContent>
      </Card>
    </div>
  );
}
