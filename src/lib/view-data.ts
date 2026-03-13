import type {
  DashboardSnapshot,
  InventoryPool,
  Plan,
  Product,
  Sku,
} from "@/types";
import { buildSkuCatalogLookup } from "@/lib/catalog";
import type {
  InventoryRowEntry,
  ViewSetupEntry,
} from "@/components/view-page/types";

export function buildViewSetupEntries(
  snapshot: DashboardSnapshot,
): ViewSetupEntry[] {
  const skuCatalog = buildSkuCatalogLookup(snapshot);

  return [...snapshot.skus]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((sku) => {
      const catalogEntry = skuCatalog.get(sku._id);
      const pools = snapshot.inventoryPools.filter(
        (pool) => pool.skuId === sku._id,
      );
      const trackedQuantity = pools.reduce(
        (sum, pool) => sum + pool.totalQuantity,
        0,
      );
      const availableQuantity = pools.reduce(
        (sum, pool) => sum + pool.totalQuantity,
        0,
      );

      return {
        sku,
        plan: catalogEntry?.plan,
        product: catalogEntry?.product,
        pools,
        trackedQuantity,
        availableQuantity,
        hasLockedRegion: pools.length > 0,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        sku: Sku;
        plan: Plan;
        product: Product;
        pools: InventoryPool[];
        trackedQuantity: number;
        availableQuantity: number;
        hasLockedRegion: boolean;
      } => Boolean(entry.plan && entry.product),
    );
}

export function buildInventoryRows(
  snapshot: DashboardSnapshot,
): InventoryRowEntry[] {
  const skuCatalog = buildSkuCatalogLookup(snapshot);

  return [...snapshot.inventoryPools]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((pool) => {
      const catalogEntry = skuCatalog.get(pool.skuId);
      const available = pool.totalQuantity;

      return {
        pool,
        product: catalogEntry?.product,
        plan: catalogEntry?.plan,
        sku:
          catalogEntry?.sku ??
          snapshot.skus.find((sku) => sku._id === pool.skuId),
        available,
      };
    });
}
