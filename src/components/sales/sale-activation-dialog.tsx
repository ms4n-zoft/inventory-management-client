import { useEffect, useState } from "react";
import { CalendarCheckIcon, MailIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
  LicenseDocumentMetadata,
  PurchasedBillingCycle,
  PurchaseType,
  SaleFulfillmentMode,
  SaleListEntry,
} from "@/types";

function inferPurchaseType(entry: SaleListEntry): PurchaseType {
  if (entry.activation) {
    return entry.activation.purchaseType;
  }

  if (entry.sale.purchaseType) {
    return entry.sale.purchaseType;
  }

  return entry.sku.pricingOption.billingCycle === "one_time"
    ? "one_time"
    : "subscription";
}

function inferBillingCyclePurchased(entry: SaleListEntry): PurchasedBillingCycle {
  if (entry.activation) {
    return entry.activation.billingCyclePurchased;
  }

  if (entry.sale.billingCyclePurchased) {
    return entry.sale.billingCyclePurchased;
  }

  return entry.sku.pricingOption.billingCycle;
}

function toDateInputValue(value?: string) {
  return value ? value.slice(0, 10) : "";
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

const subscriptionMonthsByBillingCycle: Partial<
  Record<PurchasedBillingCycle, number>
> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

function suggestedRenewalDate(
  purchaseType: PurchaseType,
  billingCyclePurchased: PurchasedBillingCycle,
  accessStartDate: string,
) {
  if (!accessStartDate || purchaseType !== "subscription") {
    return "";
  }

  const months = subscriptionMonthsByBillingCycle[billingCyclePurchased];
  return months ? addMonths(accessStartDate, months) : "";
}

function maskLicenseKeyPreview(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const visibleSuffix = trimmed.slice(-4);
  const maskedLength = Math.max(trimmed.length - visibleSuffix.length, 4);
  return `${"*".repeat(maskedLength)}${visibleSuffix}`;
}

type SaleActivationSavePayload = {
  purchaseType: PurchaseType;
  billingCyclePurchased: PurchasedBillingCycle;
  fulfillmentMode: SaleFulfillmentMode;
  accessStartDate?: string;
  accessEndDate?: string;
  nextRenewalDate?: string;
  licenseKey?: string;
  licenseDocumentFile?: File;
  licenseDocument?: LicenseDocumentMetadata;
  activationStatus?: "pending" | "processing" | "completed" | "failed";
  notificationStatus?: "not_queued" | "queued" | "failed";
  notes?: string;
};

export function SaleActivationDialog({
  entry,
  open,
  loading,
  onOpenChange,
  onSave,
}: {
  entry: SaleListEntry | null;
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: SaleActivationSavePayload) => Promise<boolean>;
}) {
  const [accessStartDate, setAccessStartDate] = useState("");
  const [manualAccessEndDate, setManualAccessEndDate] = useState<string | null>(
    null,
  );
  const [licenseKey, setLicenseKey] = useState("");
  const [notes, setNotes] = useState("");
  const [licenseDocumentFile, setLicenseDocumentFile] = useState<File | null>(
    null,
  );
  const [licenseDocument, setLicenseDocument] =
    useState<LicenseDocumentMetadata>();
  const [step, setStep] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (!entry || !open) {
      return;
    }

    const activation = entry.activation;
    const purchaseType = inferPurchaseType(entry);
    const billingCyclePurchased = inferBillingCyclePurchased(entry);
    const initialAccessStartDate = toDateInputValue(activation?.accessStartDate);
    const initialSuggestedAccessEndDate = suggestedRenewalDate(
      purchaseType,
      billingCyclePurchased,
      initialAccessStartDate,
    );
    const savedAccessEndDate = toDateInputValue(
      activation?.accessEndDate ?? activation?.nextRenewalDate,
    );

    setAccessStartDate(initialAccessStartDate);
    setManualAccessEndDate(
      savedAccessEndDate && savedAccessEndDate !== initialSuggestedAccessEndDate
        ? savedAccessEndDate
        : null,
    );
    setLicenseKey("");
    setNotes(activation?.notes ?? "");
    setLicenseDocumentFile(null);
    setLicenseDocument(activation?.licenseDocument);
    setStep("edit");
  }, [entry, open]);

  if (!entry) {
    return null;
  }

  const purchaseType = inferPurchaseType(entry);
  const billingCyclePurchased = inferBillingCyclePurchased(entry);
  const isOneTimeSku =
    purchaseType === "one_time" || billingCyclePurchased === "one_time";
  const fulfillmentMode: SaleFulfillmentMode = "email_based";
  const suggestedAccessEndDate = suggestedRenewalDate(
    purchaseType,
    billingCyclePurchased,
    accessStartDate,
  );
  const accessEndDate = manualAccessEndDate ?? suggestedAccessEndDate;
  const canPreview =
    purchaseType !== "unknown" &&
    billingCyclePurchased !== "unknown" &&
    Boolean(accessStartDate);
  const licenseKeyValue = licenseKey.trim();
  const previewLicenseKey = licenseKeyValue
    ? maskLicenseKeyPreview(licenseKeyValue)
    : entry.activation?.licenseKeyMasked ?? "";
  const previewLicenseDocument =
    licenseDocumentFile?.name ?? licenseDocument?.fileName ?? "";
  const accessStartDateDescription = isOneTimeSku
    ? "This is the only editable date in this step."
    : "The access end date will be auto-suggested and you can adjust it if needed.";
  const accessEndDateDescription = !accessStartDate
    ? "Set the access start date to auto-suggest the access end date, or enter it manually."
    : accessEndDate
      ? `This will be saved as ${accessEndDate} for both the next renewal date and the access end date.`
      : "Enter the access end date manually for this SKU.";

  const handleConfirm = async () => {
    const didSave = await onSave({
      purchaseType,
      billingCyclePurchased,
      fulfillmentMode,
      accessStartDate: accessStartDate || undefined,
      accessEndDate: !isOneTimeSku ? accessEndDate || undefined : undefined,
      nextRenewalDate: !isOneTimeSku ? accessEndDate || undefined : undefined,
      licenseKey: licenseKeyValue || undefined,
      licenseDocumentFile: licenseDocumentFile ?? undefined,
      licenseDocument: licenseDocument ?? undefined,
      activationStatus: "completed",
      notificationStatus: "not_queued",
      notes: notes.trim() || undefined,
    });

    if (didSave) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "preview" ? "Preview completion" : "Complete sale"}
          </DialogTitle>
          <DialogDescription>
            {step === "preview"
              ? `Review the completion details for ${entry.product.name} / ${entry.plan.name} before saving.`
              : `Complete the sale for ${entry.product.name} / ${entry.plan.name}. Purchase and billing details will be pulled from the SKU automatically.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-1">
          {step === "preview" ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-medium">
                  <MailIcon className="size-4" />
                  Completion preview
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  The completion email will be sent to {entry.sale.customer.email}.
                </p>
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/10 p-4 text-sm">
                <p>Access start date: {accessStartDate || "Not set"}</p>
                {!isOneTimeSku ? (
                  <p className="flex items-center gap-2">
                    <CalendarCheckIcon className="size-4" />
                    Renewal / access end date: {accessEndDate || "Not set"}
                  </p>
                ) : null}
                <p>License key: {previewLicenseKey || "Not included"}</p>
                <p>License document: {previewLicenseDocument || "Not included"}</p>
                <p>Notes: {notes.trim() || "No ops notes"}</p>
              </div>
            </div>
          ) : (
            <FieldGroup>
              <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                Completion emails are always sent through the customer email flow.
                The message will go to {entry.sale.customer.email}.
              </div>

              <Field>
                <FieldLabel htmlFor="activation-access-start-date">
                  Access start date
                </FieldLabel>
                <Input
                  id="activation-access-start-date"
                  type="date"
                  value={accessStartDate}
                  onChange={(event) => setAccessStartDate(event.target.value)}
                  disabled={loading}
                />
                <FieldDescription>
                  {accessStartDateDescription}
                </FieldDescription>
              </Field>

              {!isOneTimeSku ? (
                <Field>
                  <FieldLabel htmlFor="activation-access-end-date">
                    Renewal / access end date
                  </FieldLabel>
                  <Input
                    id="activation-access-end-date"
                    type="date"
                    value={accessEndDate}
                    onChange={(event) =>
                      setManualAccessEndDate(event.target.value || null)
                    }
                    disabled={loading}
                  />
                  <FieldDescription>{accessEndDateDescription}</FieldDescription>
                </Field>
              ) : null}

              <Field>
                <FieldLabel htmlFor="activation-license-key">
                  License key
                </FieldLabel>
                <Input
                  id="activation-license-key"
                  type="text"
                  value={licenseKey}
                  placeholder={
                    entry.activation?.licenseKeyMasked
                      ? `Saved key: ${entry.activation.licenseKeyMasked}`
                      : "Optional"
                  }
                  onChange={(event) => setLicenseKey(event.target.value)}
                  disabled={loading}
                />
                <FieldDescription>
                  Leave blank to keep the saved key or complete without one.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="activation-license-document">
                  License document
                </FieldLabel>
                <Input
                  id="activation-license-document"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setLicenseDocumentFile(file ?? null);
                    setLicenseDocument(
                      file
                        ? {
                            fileName: file.name,
                          }
                        : entry.activation?.licenseDocument,
                    );
                  }}
                  disabled={loading}
                />
                <FieldDescription>
                  {licenseDocumentFile
                    ? `${licenseDocumentFile.name} (${licenseDocumentFile.size} bytes)`
                    : licenseDocument
                      ? licenseDocument.fileName
                      : "Optional. Upload a file if the completion email should include the stored document link."}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="activation-notes">Notes</FieldLabel>
                <textarea
                  id="activation-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  disabled={loading}
                  className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="Optional activation notes for the operator team"
                />
              </Field>
            </FieldGroup>
          )}
        </div>

        <DialogFooter showCloseButton>
          {step === "preview" ? (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("edit")}
                disabled={loading}
              >
                Back to edit
              </Button>
              <Button disabled={!canPreview || loading} onClick={handleConfirm}>
                Complete sale
              </Button>
            </>
          ) : (
            <Button
              disabled={!canPreview || loading}
              onClick={() => setStep("preview")}
            >
              Preview completion
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

