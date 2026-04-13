import type { InventoryPool, Plan, PricePerUnit, Product, Sku } from "@/types";

export type ViewSetupEntry = {
  sku: Sku;
  plan: Plan;
  product: Product;
  pools: InventoryPool[];
  trackedQuantity: number;
  availableQuantity: number;
  hasLockedRegion: boolean;
};

export type InventoryRowEntry = {
  pool: InventoryPool;
  product?: Product;
  plan?: Plan;
  sku?: Sku;
  available: number;
};

export type BillingDialogState = {
  entry: ViewSetupEntry | null;
  region: string;
  pricingOption?: PricePerUnit;
  minimumUnits: string;
  maximumUnits: string;
  activationTimeline: string;
  generatedCode: string;
  canSave: boolean;
};

export type InventoryDialogState = {
  entry: ViewSetupEntry | null;
  pool: InventoryPool | null;
  quantity: number;
  actor: string;
  region: string;
  canSave: boolean;
};
