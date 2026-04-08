export type Region = "GCC" | "INDIA";
export type BillingCycle =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly"
  | "one_time";
export type PurchasedBillingCycle =
  | BillingCycle
  | "custom"
  | "unknown";
export type SkuPurchaseType = "subscription" | "one_time";
export type PurchaseType = "subscription" | "one_time" | "unknown";
export type SaleFulfillmentMode = "license_key" | "email_based";
export type ActivationStatus = "pending" | "processing" | "completed" | "failed";
export type NotificationStatus = "not_queued" | "queued" | "failed";

export type Product = {
  _id: string;
  externalId: string;
  name: string;
  vendor: string;
  description: string;
  logoUrl: string;
  createdAt: string;
};

export type Plan = {
  _id: string;
  productId: string;
  name: string;
  planType: "standard" | "enterprise";
  createdAt: string;
};

export type PricePerUnit = {
  billingCycle: BillingCycle;
  amount: string;
  currency: string;
  entity?: string;
  ratePeriod?: string;
  discountPercentage?: string;
  discountedAmount?: string;
};

export type PricingDetails = {
  amount: string;
  currency: string;
  entity: string;
  ratePeriod: string;
  discountPercentage: string;
  discountedAmount: string;
};

export type PricingDetailsByCycle = Record<BillingCycle, PricingDetails>;

export type PurchaseConstraints = {
  minUnits?: number;
  maxUnits?: number;
};

export type Sku = {
  _id: string;
  planId: string;
  code: string;
  region: Region;
  seatType: "seat" | "license_key";
  purchaseType: SkuPurchaseType;
  pricingOption: PricePerUnit;
  purchaseConstraints?: PurchaseConstraints;
  activationTimeline?: string;
  isBillingDisabled?: boolean;
  createdAt: string;
};

export type InventoryPool = {
  _id: string;
  skuId: string;
  totalQuantity: number;
  updatedAt: string;
};

export type SalePartner = {
  name: string;
  saleReference: string;
};

export type SaleCustomer = {
  name: string;
  email: string;
  phone: string;
  additionalInfo?: Record<string, string>;
};

export type SalePayment = {
  provider: string;
  transactionId: string;
  amount: string;
  currency: string;
  status: string;
  metadata?: Record<string, string>;
};

export type Sale = {
  _id: string;
  skuId: string;
  skuCode: string;
  billingCyclePurchased?: PurchasedBillingCycle;
  purchaseType?: PurchaseType;
  quantity: number;
  partner: SalePartner;
  customer: SaleCustomer;
  payment: SalePayment;
  createdAt: string;
};

export type LicenseDocumentMetadata = {
  fileName: string;
  uploadedAt?: string;
};

export type SaleActivation = {
  _id: string;
  saleId: string;
  skuId: string;
  customerEmail: string;
  purchaseType: PurchaseType;
  billingCyclePurchased: PurchasedBillingCycle;
  fulfillmentMode: SaleFulfillmentMode;
  accessStartDate?: string;
  accessEndDate?: string;
  nextRenewalDate?: string;
  licenseKeyEncrypted?: string;
  licenseKeyMasked?: string;
  licenseDocument?: LicenseDocumentMetadata;
  activationStatus: ActivationStatus;
  notificationStatus: NotificationStatus;
  activatedAt: string;
  activatedBy: string;
  notificationQueuedAt?: string;
  notificationError?: string;
  notificationJobId?: string;
  notificationIdempotencyKey?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type SaleListEntry = {
  sale: Sale;
  sku: Sku;
  plan: Plan;
  product: Product;
  activation?: SaleActivation;
};

export type AuditLog = {
  _id: string;
  action: string;
  actor: string;
  timestamp: string;
};

export type DashboardSnapshot = {
  products: Product[];
  plans: Plan[];
  skus: Sku[];
  inventoryPools: InventoryPool[];
  auditLogs: AuditLog[];
};

export type SkuCatalogEntry = {
  sku: Sku;
  plan: Plan;
  product: Product;
};

export type AuthUser = {
  _id: string;
  emailId: string;
  firstName: string;
  lastName: string;
  userAccess: string;
  company?: string;
  companyId?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};
