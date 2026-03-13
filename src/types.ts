export type Region = "MENA" | "GLOBAL" | "US" | "EU" | "INDIA" | "APAC";

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
  amount: string;
  currency: string;
  entity?: string;
  ratePeriod?: string;
};

export type Sku = {
  _id: string;
  planId: string;
  code: string;
  billingPeriod: "monthly" | "yearly";
  region?: Region;
  seatType: "seat" | "license_key";
  pricePerUnit?: PricePerUnit;
  createdAt: string;
};

export type InventoryPool = {
  _id: string;
  skuId: string;
  region: Region;
  totalQuantity: number;
  updatedAt: string;
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
