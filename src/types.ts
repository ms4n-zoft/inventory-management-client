export type Region = "GCC" | "INDIA";
export type BillingCycle = "monthly" | "yearly" | "one_time";

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
  pricingOptions: PricePerUnit[];
  purchaseConstraints?: PurchaseConstraints;
  activationTimeline?: string;
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
  quantity: number;
  partner: SalePartner;
  customer: SaleCustomer;
  payment: SalePayment;
  createdAt: string;
};

export type SaleListEntry = {
  sale: Sale;
  sku: Sku;
  plan: Plan;
  product: Product;
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
