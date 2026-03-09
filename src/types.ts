export type Vendor = {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type Product = {
  id: string;
  vendorId: string;
  name: string;
  description: string;
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
  region: "GLOBAL" | "US" | "EU" | "INDIA" | "APAC";
  seatType: "seat" | "license_key";
  createdAt: string;
};

export type InventoryPool = {
  id: string;
  skuId: string;
  region: Sku["region"];
  totalQuantity: number;
  reservedQuantity: number;
  allocatedQuantity: number;
  updatedAt: string;
};

export type Reservation = {
  id: string;
  skuId: string;
  region: Sku["region"];
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
  region: Sku["region"];
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
  vendors: Vendor[];
  products: Product[];
  plans: Plan[];
  skus: Sku[];
  inventoryPools: InventoryPool[];
  reservations: Reservation[];
  entitlements: Entitlement[];
  auditLogs: AuditLog[];
};
