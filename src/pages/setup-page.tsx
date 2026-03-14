import { BoxesIcon, PencilRulerIcon } from "lucide-react";

import type { ActionRunner } from "@/components/operations-app";
import { BillingStep } from "@/components/setup-page/billing-step";
import { ProductPlanStep } from "@/components/setup-page/product-plan-step";
import { RecentSetupsPanel } from "@/components/setup-page/recent-setups-panel";
import { SetupReviewPanel } from "@/components/setup-page/setup-review-panel";
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

  return (
    <div ref={setup.formRef} className="grid gap-4 xl:grid-cols-2">
      <Card className="shadow-none xl:col-span-2">
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
          <form onSubmit={setup.submit.onSubmit}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <ProductPlanStep {...setup.productStep} />
              <BillingStep {...setup.billingStep} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
              <StockStep {...setup.stockStep} />
              <SetupReviewPanel {...setup.reviewPanel} />
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {setup.submit.saveMessage}
              </p>
              <Button disabled={!setup.submit.canSubmit}>
                {setup.submit.showEditIcon ? (
                  <PencilRulerIcon data-icon="inline-start" />
                ) : (
                  <BoxesIcon data-icon="inline-start" />
                )}
                {setup.submit.label}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <RecentSetupsPanel {...setup.recentSetupsPanel} />
    </div>
  );
}
