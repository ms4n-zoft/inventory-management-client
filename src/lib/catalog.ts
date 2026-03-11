import type { DashboardSnapshot, Plan, Product, Sku } from "@/types";

type CatalogSnapshot = Pick<DashboardSnapshot, "products" | "plans" | "skus">;

export type SkuCatalogLookupEntry = {
  sku: Sku;
  plan?: Plan;
  product?: Product;
};

export function buildSkuCatalogLookup(snapshot: CatalogSnapshot) {
  const productById = new Map(
    snapshot.products.map((product) => [product._id, product]),
  );
  const planById = new Map(snapshot.plans.map((plan) => [plan._id, plan]));

  return new Map<string, SkuCatalogLookupEntry>(
    snapshot.skus.map((sku) => {
      const plan = planById.get(sku.planId);
      const product = plan ? productById.get(plan.productId) : undefined;

      return [
        sku._id,
        {
          sku,
          plan,
          product,
        },
      ];
    }),
  );
}

export function formatSkuLabel(
  sku: Pick<Sku, "code" | "region" | "billingPeriod">,
) {
  return [sku.code, sku.region, sku.billingPeriod].filter(Boolean).join(" · ");
}

export function formatSeatType(seatType: Sku["seatType"]) {
  return seatType === "license_key" ? "license key" : "seat";
}
