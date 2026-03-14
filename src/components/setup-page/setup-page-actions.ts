import type { ProductSearchResult } from "@/lib/api";
import { api } from "@/lib/api";
import type { Plan, Product } from "@/types";

import { defaultInventoryActor, type RegionEntry } from "./setup-page-model";

export async function submitSetupEntries(input: {
  selectedProduct: ProductSearchResult;
  normalizedPlanName: string;
  existingProduct?: Product;
  existingPlan?: Plan;
  actionableEntries: RegionEntry[];
}) {
  let nextProduct = input.existingProduct;
  let nextPlan = input.existingPlan;

  for (const entry of input.actionableEntries) {
    let nextSku = entry.existingSku;

    if (entry.offerActionNeeded) {
      if (entry.existingSku) {
        nextSku = await api.updateSku(entry.existingSku._id, {
          code: entry.generatedSkuCode,
          region: entry.region,
          seatType: entry.existingSku.seatType,
          pricingOptions: entry.normalizedPricingOptions,
          purchaseConstraints: entry.purchaseConstraints,
          activationTimeline: entry.normalizedActivationTimeline,
        });
      } else if (!nextProduct) {
        const created = await api.addCatalogEntry({
          product: {
            externalId: input.selectedProduct.id,
            name: input.selectedProduct.name,
            vendor: input.selectedProduct.vendor,
            description: input.selectedProduct.description,
            logoUrl: input.selectedProduct.logoUrl,
          },
          plan: {
            name: input.normalizedPlanName,
            planType: "standard",
          },
          sku: {
            code: entry.generatedSkuCode,
            region: entry.region,
            seatType: "seat",
            pricingOptions: entry.normalizedPricingOptions,
            purchaseConstraints: entry.purchaseConstraints,
            activationTimeline: entry.normalizedActivationTimeline,
          },
        });

        nextProduct = created.product;
        nextPlan = created.plan;
        nextSku = created.sku;
      } else {
        if (!nextPlan) {
          nextPlan = await api.createPlan({
            productId: nextProduct._id,
            name: input.normalizedPlanName,
            planType: "standard",
          });
        }

        nextSku = await api.createSku({
          planId: nextPlan._id,
          code: entry.generatedSkuCode,
          region: entry.region,
          seatType: "seat",
          pricingOptions: entry.normalizedPricingOptions,
          purchaseConstraints: entry.purchaseConstraints,
          activationTimeline: entry.normalizedActivationTimeline,
        });
      }
    }

    if (!nextSku) continue;

    if (entry.inventoryWillCreate) {
      await api.createInventoryPool({
        skuId: nextSku._id,
        totalQuantity: entry.draft.inventoryQuantity,
      });
      continue;
    }

    if (entry.inventoryWillAdjust) {
      await api.adjustInventory({
        skuId: nextSku._id,
        change: entry.inventoryDelta,
        reason: entry.inventoryDelta >= 0 ? "MANUAL_ADD" : "MANUAL_REMOVE",
        actor: entry.draft.inventoryActor.trim() || defaultInventoryActor,
      });
    }
  }
}
