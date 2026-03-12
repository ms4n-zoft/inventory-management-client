import type { InventoryPool, Plan, Product, Sku } from "@/types";

export type RecentSetupEntry = {
  sku: Sku;
  plan: Plan;
  product: Product;
  pools: InventoryPool[];
  trackedQuantity: number;
};
