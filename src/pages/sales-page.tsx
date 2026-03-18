import { useDeferredValue, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { ShoppingCartIcon } from "lucide-react";

import { ViewSearchCard } from "@/components/view-page/view-search-card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { normalizeMoneyAmount } from "@/lib/decimal";
import type { SaleListEntry } from "@/types";

function formatRecord(record?: Record<string, string>) {
  return record ? Object.entries(record) : [];
}

export function SalesPage({
  sales,
  loading,
}: {
  sales: SaleListEntry[];
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
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

  return (
    <>
      <ViewSearchCard
        title="Browse sales"
        description="Search partner-reported sales by product, SKU code, partner reference, customer, or payment details."
        placeholder="Search by product, sku code, partner, customer, or transaction"
        query={query}
        onQueryChange={setQuery}
        resultCount={filteredSales.length}
        totalCount={sales.length}
        noun="sale record"
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Recorded sales</CardTitle>
          <CardDescription>
            Newest partner-reported sales appear first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredSales.length === 0 ? (
            <Empty className="rounded-xl border bg-card px-6 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingCartIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {sales.length === 0 && !query.trim()
                    ? "No sales recorded"
                    : "No sales matched"}
                </EmptyTitle>
                <EmptyDescription>
                  {sales.length === 0 && !query.trim()
                    ? "Seed or record a partner sale and it will appear here."
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((entry) => {
                  const additionalInfo = formatRecord(
                    entry.sale.customer.additionalInfo,
                  );
                  const paymentMetadata = formatRecord(
                    entry.sale.payment.metadata,
                  );

                  return (
                    <TableRow key={entry.sale._id}>
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
                            {entry.sale.payment.provider} ·{" "}
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
