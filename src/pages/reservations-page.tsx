import { useEffect, useState } from "react";
import { CircleCheckIcon, Clock3Icon, OctagonXIcon } from "lucide-react";

import type { DashboardSnapshot, Reservation } from "@/types";
import { api } from "@/lib/api";
import { buildSkuCatalogLookup, formatSkuLabel } from "@/lib/catalog";
import type { ActionRunner } from "@/components/operations-app";
import { FixedChoiceField } from "@/components/fixed-choice-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ReservationsPage({
  snapshot,
  loading,
  runAction,
}: {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
}) {
  const [reservationSkuId, setReservationSkuId] = useState("");
  const [reservationQuantity, setReservationQuantity] = useState(1);
  const [reservationActor, setReservationActor] = useState("operations");
  const [reservationCustomerId, setReservationCustomerId] =
    useState("customer-001");
  const skuCatalog = buildSkuCatalogLookup(snapshot);

  useEffect(() => {
    setReservationSkuId((current) => current || snapshot.skus[0]?._id || "");
  }, [snapshot]);

  return (
    <>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Create reservation</CardTitle>
          <CardDescription>
            Create a temporary hold before final allocation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.skus.length === 0 ? (
            <InlineReservationEmpty text="Create a sku and inventory pool first to reserve stock." />
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const sku = snapshot.skus.find(
                  (item) => item._id === reservationSkuId,
                );
                void runAction(
                  () =>
                    api.createReservation({
                      skuId: reservationSkuId,
                      region: sku?.region ?? "US",
                      quantity: reservationQuantity,
                      actor: reservationActor,
                    }),
                  "Reservation created.",
                );
              }}
            >
              <FieldGroup className="lg:grid lg:grid-cols-2">
                <Field className="lg:col-span-2">
                  <FieldLabel>Sku</FieldLabel>
                  {snapshot.skus.length === 1 ? (
                    <FixedChoiceField
                      value={formatSkuLabel(snapshot.skus[0]!)}
                      hint="Only sku available right now"
                    />
                  ) : (
                    <Select
                      value={reservationSkuId}
                      onValueChange={setReservationSkuId}
                    >
                      <SelectTrigger aria-label="Select sku">
                        <SelectValue placeholder="Select a sku" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {snapshot.skus.map((sku) => (
                            <SelectItem key={sku._id} value={sku._id}>
                              {formatSkuLabel(sku)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Quantity</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={reservationQuantity}
                    onChange={(event) =>
                      setReservationQuantity(Number(event.target.value))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Operator id</FieldLabel>
                  <Input
                    value={reservationActor}
                    onChange={(event) =>
                      setReservationActor(event.target.value)
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Customer id</FieldLabel>
                  <Input
                    value={reservationCustomerId}
                    onChange={(event) =>
                      setReservationCustomerId(event.target.value)
                    }
                  />
                  <FieldDescription>
                    Used when the hold is confirmed into an entitlement.
                  </FieldDescription>
                </Field>
                <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void runAction(
                        () => api.processExpiredReservations(),
                        "Expiry sweep completed.",
                      )
                    }
                  >
                    <Clock3Icon data-icon="inline-start" />
                    Run expiry sweep
                  </Button>
                  <Button disabled={!reservationSkuId || loading}>
                    <Clock3Icon data-icon="inline-start" />
                    Create reservation
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Reservation queue</CardTitle>
          <CardDescription>
            Confirm a hold when the deal closes or cancel it to release stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.reservations.length === 0 ? (
            <InlineReservationEmpty text="No reservations have been created yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reservation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.reservations.map((reservation) => {
                  const catalogEntry = skuCatalog.get(reservation.skuId);

                  return (
                    <TableRow key={reservation._id}>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {catalogEntry?.sku.code ?? reservation.skuId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {catalogEntry?.sku
                              ? [
                                  catalogEntry.product?.name,
                                  catalogEntry.plan?.name,
                                  reservation.region,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : reservation.region}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            reservation.status === "RESERVED"
                              ? "outline"
                              : reservation.status === "CONFIRMED"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {reservation.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{reservation.quantity}</TableCell>
                      <TableCell>
                        {new Date(reservation.expiresAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={
                              reservation.status !== "RESERVED" || loading
                            }
                            onClick={() =>
                              void runAction(
                                () =>
                                  api.confirmReservation(reservation._id, {
                                    customerId: reservationCustomerId,
                                    actor: reservationActor,
                                  }),
                                "Reservation confirmed.",
                              )
                            }
                          >
                            <CircleCheckIcon data-icon="inline-start" />
                            Confirm
                          </Button>
                          <CancelReservationButton
                            reservation={reservation}
                            loading={loading}
                            runAction={runAction}
                            actor={reservationActor}
                          />
                        </div>
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

function CancelReservationButton({
  reservation,
  loading,
  runAction,
  actor,
}: {
  reservation: Reservation;
  loading: boolean;
  runAction: ActionRunner;
  actor: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="destructive"
          disabled={reservation.status !== "RESERVED" || loading}
        >
          <OctagonXIcon data-icon="inline-start" />
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="shadow-none">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
          <AlertDialogDescription>
            This will release the reserved quantity back into available
            inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep reservation</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void runAction(
                () => api.cancelReservation(reservation._id, { actor }),
                "Reservation cancelled.",
              );
            }}
          >
            Release reserved stock
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InlineReservationEmpty({ text }: { text: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Clock3Icon />
        </EmptyMedia>
        <EmptyTitle>No reservations yet</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
