export type Region = "MENA" | "GLOBAL" | "US" | "EU" | "INDIA" | "APAC";

export type Product = {
  id: string;
  externalId: string;
  name: string;
  vendor: string;
  description: string;
  logoUrl: string;
  createdAt: string;
};

export type Plan = {
  id: string;
  productId: string;
  name: string;
  planType: "standard" | "enterprise";
  createdAt: string;
};

export type Sku = {
  id: string;
  planId: string;
  code: string;
  billingPeriod: "monthly" | "yearly";
  region?: Region;
  seatType: "seat" | "license_key";
  createdAt: string;
};

export type InventoryPool = {
  id: string;
  skuId: string;
  region: Region;
  totalQuantity: number;
  reservedQuantity: number;
  allocatedQuantity: number;
  updatedAt: string;
};

export type Reservation = {
  id: string;
  skuId: string;
  region: Region;
  quantity: number;
  status: "RESERVED" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
};

export type Entitlement = {
  id: string;
  reservationId: string;
  customerId: string;
  skuId: string;
  region: Region;
  quantity: number;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  createdAt: string;
};

export type AuditLog = {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
};

export type DashboardSnapshot = {
  products: Product[];
  plans: Plan[];
  skus: Sku[];
  inventoryPools: InventoryPool[];
  reservations: Reservation[];
  entitlements: Entitlement[];
  auditLogs: AuditLog[];
};
