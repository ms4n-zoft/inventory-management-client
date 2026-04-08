import { Fragment, useDeferredValue, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { ShoppingCartIcon } from "lucide-react";

import { SaleActivationDialog } from "@/components/sales/sale-activation-dialog";
import { ViewSearchCard } from "@/components/view-page/view-search-card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  formatActivationTimelineValue,
  formatBillingCycleLabel,
  formatPriceLine,
} from "@/lib/catalog";
import { normalizeMoneyAmount } from "@/lib/decimal";
import type {
  ActivationStatus,
  NotificationStatus,
  PurchasedBillingCycle,
  PurchaseType,
  SaleListEntry,
  SaleFulfillmentMode,
  Sku,
} from "@/types";

function encodeBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function formatRecord(record?: Record<string, string>) {
  return record ? Object.entries(record) : [];
}

function formatMinimumUnits(value?: number) {
  return typeof value === "number" ? value.toString() : "Not set";
}

function formatMaximumUnits(value?: number) {
  return typeof value === "number" ? value.toString() : "Unlimited";
}

function getPurchaseTypeLabel(sku: Sku) {
  return sku.purchaseType === "one_time" ||
    sku.pricingOption.billingCycle === "one_time"
    ? "One-time"
    : "Subscription";
}

function getActivationStatusLabel(status?: ActivationStatus) {
  if (!status || status === "pending") {
    return "Pending activation";
  }

  if (status === "processing") {
    return "Processing";
  }

  if (status === "completed") {
    return "Completed";
  }

  return "Failed";
}

function getNotificationStatusLabel(status?: NotificationStatus) {
  if (!status || status === "not_queued") {
    return "Mail not queued";
  }

  if (status === "queued") {
    return "Mail queued";
  }

  return "Mail failed";
}

function getPurchaseTypeSummaryLabel(value?: PurchaseType) {
  if (value === "subscription") {
    return "Subscription";
  }

  if (value === "one_time") {
    return "One-time";
  }

  if (value === "unknown") {
    return "Unknown";
  }

  return "Not recorded";
}

function getPurchasedBillingCycleLabel(value?: PurchasedBillingCycle) {
  if (value === "one_time") {
    return "One-time";
  }

  if (value === "custom") {
    return "Custom";
  }

  if (value === "unknown") {
    return "Unknown";
  }

  if (value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return "Not recorded";
}

function getFulfillmentModeLabel(value?: SaleFulfillmentMode) {
  if (value === "license_key") {
    return "License key";
  }

  if (value === "email_based") {
    return "Email based";
  }

  return "Not recorded";
}

function formatOptionalDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function formatOptionalTimestamp(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export function SalesPage({
  sales,
  loading,
  runAction,
}: {
  sales: SaleListEntry[];
  loading: boolean;
  runAction?: (
    work: () => Promise<unknown>,
    message: string,
  ) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState<"work_queue" | "activated">(
    "work_queue",
  );
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>(
    {},
  );
  const [activationDialogSaleId, setActivationDialogSaleId] = useState<
    string | null
  >(null);
  const [activationSaving, setActivationSaving] = useState(false);
  const [skuDetailsById, setSkuDetailsById] = useState<Record<string, Sku>>({});
  const [skuLoadStateById, setSkuLoadStateById] = useState<
    Record<string, boolean>
  >({});
  const [skuErrorById, setSkuErrorById] = useState<Record<string, string>>({});
  const deferredQuery = useDeferredValue(query);

  const search = useMemo(
    () =>
      new Fuse(sales, {
        ignoreLocation: true,
        threshold: 0.3,
        keys: [
          { name: "product.name", weight: 0.22 },
          { name: "product.vendor", weight: 0.08 },
          { name: "plan.name", weight: 0.08 },
          { name: "sku.code", weight: 0.12 },
          { name: "sku.region", weight: 0.04 },
          { name: "sale.partner.name", weight: 0.14 },
          { name: "sale.partner.saleReference", weight: 0.12 },
          { name: "sale.customer.name", weight: 0.08 },
          { name: "sale.customer.email", weight: 0.06 },
          { name: "sale.payment.provider", weight: 0.03 },
          { name: "sale.payment.transactionId", weight: 0.03 },
        ],
      }),
    [sales],
  );

  const filteredSales = useMemo(() => {
    const normalizedQuery = deferredQuery.trim();
    if (!normalizedQuery) return sales;

    return search.search(normalizedQuery).map((result) => result.item);
  }, [deferredQuery, sales, search]);
  const workQueueSales = useMemo(
    () =>
      filteredSales.filter(
        (entry) => entry.activation?.activationStatus !== "completed",
      ),
    [filteredSales],
  );
  const activatedSales = useMemo(
    () =>
      filteredSales.filter(
        (entry) => entry.activation?.activationStatus === "completed",
      ),
    [filteredSales],
  );
  const totalWorkQueueSales = useMemo(
    () =>
      sales.filter(
        (entry) => entry.activation?.activationStatus !== "completed",
      ).length,
    [sales],
  );
  const totalActivatedSales = useMemo(
    () =>
      sales.filter(
        (entry) => entry.activation?.activationStatus === "completed",
      ).length,
    [sales],
  );
  const visibleSales =
    activeView === "activated" ? activatedSales : workQueueSales;
  const currentTotalCount =
    activeView === "activated" ? totalActivatedSales : totalWorkQueueSales;

  const activeActivationEntry =
    sales.find((entry) => entry.sale._id === activationDialogSaleId) ?? null;

  const loadSkuDetails = async (skuId: string) => {
    if (skuDetailsById[skuId] || skuLoadStateById[skuId]) {
      return;
    }

    setSkuLoadStateById((current) => ({ ...current, [skuId]: true }));
    setSkuErrorById((current) => {
      const next = { ...current };
      delete next[skuId];
      return next;
    });

    try {
      const sku = await api.getSku(skuId);
      setSkuDetailsById((current) =>
        current[skuId] ? current : { ...current, [skuId]: sku },
      );
    } catch (error) {
      setSkuErrorById((current) => ({
        ...current,
        [skuId]:
          error instanceof Error ? error.message : "Failed to load sku details",
      }));
    } finally {
      setSkuLoadStateById((current) => {
        const next = { ...current };
        delete next[skuId];
        return next;
      });
    }
  };

  const toggleExpandedSale = (saleId: string, skuId: string) => {
    const isExpanded = Boolean(expandedSales[saleId]);

    setExpandedSales((current) => {
      if (isExpanded) {
        const next = { ...current };
        delete next[saleId];
        return next;
      }

      return { ...current, [saleId]: true };
    });

    if (!isExpanded) {
      void loadSkuDetails(skuId);
    }
  };

  const saveSaleActivation = async (
    saleId: string,
    payload: Parameters<typeof api.upsertSaleActivation>[1] & {
      licenseDocumentFile?: File;
    },
  ) => {
    setActivationSaving(true);

    try {
      const work = async () => {
        const { licenseDocumentFile, ...activationPayload } = payload;
        let licenseDocument = activationPayload.licenseDocument;

        if (licenseDocumentFile) {
          licenseDocument = {
            fileName: licenseDocumentFile.name,
            uploadedAt: activationPayload.licenseDocument?.uploadedAt,
            contentType: licenseDocumentFile.type || undefined,
            contentBase64: encodeBase64(
              await licenseDocumentFile.arrayBuffer(),
            ),
          };
        }

        await api.upsertSaleActivation(saleId, {
          ...activationPayload,
          licenseDocument,
        });
      };

      if (runAction) {
        return await runAction(work, "Sale activation saved.");
      }

      await work();
      return true;
    } finally {
      setActivationSaving(false);
    }
  };

  return (
    <>
      <ViewSearchCard
        title="Browse sales"
        description="Search partner-reported sales by product, SKU code, partner reference, customer, or payment details."
        placeholder="Search by product, sku code, partner, customer, or transaction"
        query={query}
        onQueryChange={setQuery}
        resultCount={visibleSales.length}
        totalCount={currentTotalCount}
        noun="sale record"
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Recorded sales</CardTitle>
          <CardDescription>
            Keep active fulfillment work separate from sales that are already
            completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeView}
            onValueChange={(value) =>
              setActiveView(value as "work_queue" | "activated")
            }
            className="mb-4"
          >
            <TabsList variant="line" aria-label="Sales views">
              <TabsTrigger value="work_queue">
                Work queue ({totalWorkQueueSales})
              </TabsTrigger>
              <TabsTrigger value="activated">
                Activated sales ({totalActivatedSales})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : visibleSales.length === 0 ? (
            <Empty className="rounded-xl border bg-card px-6 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingCartIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {sales.length === 0 && !query.trim()
                    ? "No sales recorded"
                    : activeView === "activated"
                      ? "No activated sales matched"
                      : "No work-queue sales matched"}
                </EmptyTitle>
                <EmptyDescription>
                  {sales.length === 0 && !query.trim()
                    ? "Seed or record a partner sale and it will appear here."
                    : activeView === "activated"
                      ? "Complete an activation or broaden the search to see processed sales here."
                      : "Try a broader search term or clear the current filter."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Sold at</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSales.map((entry) => {
                  const additionalInfo = formatRecord(
                    entry.sale.customer.additionalInfo,
                  );
                  const paymentMetadata = formatRecord(
                    entry.sale.payment.metadata,
                  );
                  const isExpanded = Boolean(expandedSales[entry.sale._id]);
                  const skuDetails = skuDetailsById[entry.sale.skuId];
                  const purchaseTypeLabel = skuDetails
                    ? getPurchaseTypeLabel(skuDetails)
                    : undefined;
                  const activationStatusLabel = getActivationStatusLabel(
                    entry.activation?.activationStatus,
                  );
                  const notificationStatusLabel = getNotificationStatusLabel(
                    entry.activation?.notificationStatus,
                  );
                  const isCompletedActivation =
                    entry.activation?.activationStatus === "completed";
                  const isSkuLoading = Boolean(
                    skuLoadStateById[entry.sale.skuId],
                  );
                  const skuError = skuErrorById[entry.sale.skuId];

                  return (
                    <Fragment key={entry.sale._id}>
                      <TableRow
                        data-state={isExpanded ? "expanded" : undefined}
                      >
                        <TableCell className="align-top">
                          <div className="flex min-w-52 flex-col gap-1.5">
                            <span className="font-medium">
                              {entry.product.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {entry.plan.name}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{entry.sku.code}</Badge>
                              <Badge variant="secondary">
                                {entry.sku.region}
                              </Badge>
                              <Badge
                                variant={
                                  entry.activation?.activationStatus ===
                                  "failed"
                                    ? "destructive"
                                    : entry.activation?.activationStatus ===
                                        "completed"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {activationStatusLabel}
                              </Badge>
                              <Badge
                                variant={
                                  entry.activation?.notificationStatus ===
                                  "failed"
                                    ? "destructive"
                                    : "outline"
                                }
                              >
                                {notificationStatusLabel}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex min-w-44 flex-col gap-1">
                            <span className="font-medium">
                              {entry.sale.partner.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Ref: {entry.sale.partner.saleReference}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex min-w-56 flex-col gap-1">
                            <span className="font-medium">
                              {entry.sale.customer.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {entry.sale.customer.email}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {entry.sale.customer.phone}
                            </span>
                            {additionalInfo.length > 0 ? (
                              <div className="pt-1 text-xs text-muted-foreground">
                                {additionalInfo.map(([key, value]) => (
                                  <div key={key}>
                                    {key}: {value}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex min-w-52 flex-col gap-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">
                                {normalizeMoneyAmount(
                                  entry.sale.payment.amount,
                                ) ?? entry.sale.payment.amount}{" "}
                                {entry.sale.payment.currency}
                              </span>
                              <Badge variant="outline">
                                {entry.sale.payment.status}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {entry.sale.payment.provider} /{" "}
                              {entry.sale.payment.transactionId}
                            </span>
                            {paymentMetadata.length > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                {paymentMetadata.map(([key, value]) => (
                                  <div key={key}>
                                    {key}: {value}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top font-medium">
                          {entry.sale.quantity}
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          {new Date(entry.sale.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            aria-expanded={isExpanded}
                            aria-controls={`sale-details-${entry.sale._id}`}
                            className="mb-1 w-full"
                            aria-label={`${isExpanded ? "Hide" : "Show"} SKU details for ${entry.product.name}`}
                            onClick={() =>
                              toggleExpandedSale(
                                entry.sale._id,
                                entry.sale.skuId,
                              )
                            }
                          >
                            {isExpanded ? "Hide details" : "Show details"}
                          </Button>
                          <br />
                          {!isCompletedActivation ? (
                            <Button
                              type="button"
                              variant="default"
                              className="mt-1 w-full"
                              onClick={() =>
                                setActivationDialogSaleId(entry.sale._id)
                              }
                            >
                              Update
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {isExpanded ? (
                        <TableRow id={`sale-details-${entry.sale._id}`}>
                          <TableCell
                            colSpan={7}
                            className="bg-muted py-0 border-l border-r border-b"
                          >
                            <div>
                              {isSkuLoading && !skuDetails ? (
                                <div className="flex flex-col gap-3">
                                  <span className="text-sm font-medium">
                                    Loading SKU details...
                                  </span>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                  </div>
                                  <Skeleton className="h-16 w-full" />
                                </div>
                              ) : skuError && !skuDetails ? (
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="font-medium">
                                      SKU details could not be loaded
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {skuError}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      void loadSkuDetails(entry.sale.skuId)
                                    }
                                  >
                                    Retry
                                  </Button>
                                </div>
                              ) : skuDetails ? (
                                <>
                                  <div className="mx-2 my-3 rounded-xl border bg-background/80 p-4">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        SKU details
                                      </p>
                                      <Badge variant="outline">
                                        {skuDetails.code}
                                      </Badge>
                                      <Badge variant="outline">
                                        {skuDetails.region}
                                      </Badge>
                                      <Badge
                                        variant={
                                          skuDetails.isBillingDisabled
                                            ? "secondary"
                                            : "outline"
                                        }
                                      >
                                        {skuDetails.isBillingDisabled
                                          ? "Billing disabled"
                                          : "Billing enabled"}
                                      </Badge>
                                      {purchaseTypeLabel ? (
                                        <Badge variant="secondary">
                                          {purchaseTypeLabel}
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <p>
                                        <span className="font-medium capitalize">
                                          Minimum units:
                                        </span>{" "}
                                        <span className="text-sm text-muted-foreground sm:text-right">
                                          {formatMinimumUnits(
                                            skuDetails.purchaseConstraints
                                              ?.minUnits,
                                          )}
                                        </span>
                                      </p>
                                      <p>
                                        <span className="font-medium capitalize">
                                          Maximum units:
                                        </span>{" "}
                                        <span className="text-sm text-muted-foreground sm:text-right">
                                          {formatMaximumUnits(
                                            skuDetails.purchaseConstraints
                                              ?.maxUnits,
                                          )}
                                        </span>
                                      </p>
                                      <p>
                                        <span className="font-medium capitalize">
                                          Activation Timeline:
                                        </span>{" "}
                                        <span className="text-sm text-muted-foreground sm:text-right">
                                          {formatActivationTimelineValue(
                                            skuDetails.activationTimeline,
                                          ) ?? "Not set"}
                                        </span>
                                      </p>
                                      <p>
                                        <span className="font-medium capitalize">
                                          {formatBillingCycleLabel(
                                            skuDetails.pricingOption
                                              .billingCycle,
                                          )}{" "}
                                        </span>
                                        <span className="text-sm text-muted-foreground sm:text-right">
                                          {formatPriceLine(
                                            skuDetails.pricingOption,
                                          )}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  {entry.activation ? (
                                    <div className="mx-2 my-3 rounded-xl border bg-background/80 p-4">
                                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Activation details
                                      </p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-lg border bg-muted/20 p-3">
                                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Fulfillment
                                          </p>
                                          <div className="mt-2 space-y-1 text-sm">
                                            <p>
                                              Method:{" "}
                                              {getFulfillmentModeLabel(
                                                entry.activation
                                                  .fulfillmentMode,
                                              )}
                                            </p>
                                            <p>
                                              Purchase type:{" "}
                                              {getPurchaseTypeSummaryLabel(
                                                entry.activation.purchaseType,
                                              )}
                                            </p>
                                            <p>
                                              Billing cycle:{" "}
                                              {getPurchasedBillingCycleLabel(
                                                entry.activation
                                                  .billingCyclePurchased,
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="rounded-lg border bg-muted/20 p-3">
                                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Access window
                                          </p>
                                          <div className="mt-2 space-y-1 text-sm">
                                            <p>
                                              Start:{" "}
                                              {formatOptionalDate(
                                                entry.activation
                                                  .accessStartDate,
                                              )}
                                            </p>
                                            <p>
                                              End:{" "}
                                              {formatOptionalDate(
                                                entry.activation.accessEndDate,
                                              )}
                                            </p>
                                            <p>
                                              Renewal:{" "}
                                              {formatOptionalDate(
                                                entry.activation
                                                  .nextRenewalDate,
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="rounded-lg border bg-muted/20 p-3">
                                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Completion
                                          </p>
                                          <div className="mt-2 space-y-1 text-sm">
                                            <p>
                                              Status:{" "}
                                              {getActivationStatusLabel(
                                                entry.activation
                                                  .activationStatus,
                                              )}
                                            </p>
                                            <p>
                                              Activated at:{" "}
                                              {formatOptionalTimestamp(
                                                entry.activation.activatedAt,
                                              )}
                                            </p>
                                            <p>
                                              Last updated:{" "}
                                              {formatOptionalTimestamp(
                                                entry.activation.updatedAt,
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        {entry.activation.fulfillmentMode ===
                                        "license_key" ? (
                                          <div className="rounded-lg border bg-muted/20 p-3">
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                              License details
                                            </p>
                                            <div className="mt-2 space-y-1 text-sm">
                                              <p>
                                                Key:{" "}
                                                {entry.activation
                                                  .licenseKeyMasked ??
                                                  "Stored securely"}
                                              </p>
                                              <p>
                                                Document:{" "}
                                                {entry.activation
                                                  .licenseDocument?.fileName ??
                                                  "Not attached"}
                                              </p>
                                              <p>
                                                Uploaded at:{" "}
                                                {formatOptionalTimestamp(
                                                  entry.activation
                                                    .licenseDocument
                                                    ?.uploadedAt,
                                                )}
                                              </p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="rounded-lg border bg-muted/20 p-3">
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                              Delivery
                                            </p>
                                            <div className="mt-2 space-y-1 text-sm">
                                              <p>
                                                Access is delivered without a
                                                license key.
                                              </p>
                                              <p>
                                                Mail status:{" "}
                                                {notificationStatusLabel}
                                              </p>
                                              <p>
                                                Queued at:{" "}
                                                {formatOptionalTimestamp(
                                                  entry.activation
                                                    .notificationQueuedAt,
                                                )}
                                              </p>
                                            </div>
                                          </div>
                                        )}

                                        <div className="rounded-lg border bg-muted/20 p-3">
                                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                            Mail tracking
                                          </p>
                                          <div className="mt-2 space-y-1 text-sm">
                                            <p>
                                              Status: {notificationStatusLabel}
                                            </p>
                                            <p>
                                              Queued at:{" "}
                                              {formatOptionalTimestamp(
                                                entry.activation
                                                  .notificationQueuedAt,
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        {entry.activation.notes ? (
                                          <div className="rounded-lg border bg-muted/20 p-3 md:col-span-2 xl:col-span-3">
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                              Ops notes
                                            </p>
                                            <p className="mt-2 text-sm">
                                              {entry.activation.notes}
                                            </p>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SaleActivationDialog
        entry={activeActivationEntry}
        open={Boolean(activeActivationEntry)}
        loading={activationSaving}
        onOpenChange={(open) => {
          if (!open) {
            setActivationDialogSaleId(null);
          }
        }}
        onSave={(payload) =>
          activeActivationEntry
            ? saveSaleActivation(activeActivationEntry.sale._id, payload)
            : Promise.resolve(false)
        }
      />
    </>
  );
}

