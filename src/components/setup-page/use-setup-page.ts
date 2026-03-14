import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ProductPricingPlan, ProductSearchResult } from "@/lib/api";
import { api } from "@/lib/api";
import { orderRegions } from "@/lib/billing-option";
import { buildSkuCatalogLookup } from "@/lib/catalog";
import type { ActionRunner } from "@/components/operations-app";
import type {
  BillingCycle,
  DashboardSnapshot,
  PricingDetails,
  Region,
} from "@/types";

import { submitSetupEntries } from "./setup-page-actions";
import {
  buildSetupPageDerivedState,
  cloneRegionDraft,
  createRegionDraft,
  pricingSeedFromPlanName,
  regionDraftFromExisting,
  toSearchResult,
  type RegionDraft,
} from "./setup-page-model";

type UseSetupPageInput = {
  snapshot: DashboardSnapshot;
  loading: boolean;
  runAction: ActionRunner;
};

export function useSetupPage({
  snapshot,
  loading,
  runAction,
}: UseSetupPageInput) {
  const formRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductSearchResult | null>(null);
  const [pricingPlans, setPricingPlans] = useState<ProductPricingPlan[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [planName, setPlanName] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<Region[]>([]);
  const [activeRegion, setActiveRegion] = useState<Region | undefined>();
  const [regionDrafts, setRegionDrafts] = useState<
    Partial<Record<Region, RegionDraft>>
  >({});

  const skuCatalog = useMemo(() => buildSkuCatalogLookup(snapshot), [snapshot]);

  const derived = useMemo(
    () =>
      buildSetupPageDerivedState({
        snapshot,
        skuCatalog,
        selectedProduct,
        pricingPlans,
        planName,
        selectedRegions,
        activeRegion,
        regionDrafts,
        loadingPricing,
        loading,
      }),
    [
      activeRegion,
      loading,
      loadingPricing,
      planName,
      pricingPlans,
      regionDrafts,
      selectedProduct,
      selectedRegions,
      skuCatalog,
      snapshot,
    ],
  );

  const resetPricingSetup = useCallback(() => {
    setPricingPlans([]);
    setPlanName("");
    setSelectedRegions([]);
    setActiveRegion(undefined);
    setRegionDrafts({});
  }, []);

  const clearSelectedProduct = useCallback(() => {
    setSelectedProduct(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchDone(false);
    setSearching(false);
    setLoadingPricing(false);
    resetPricingSetup();
  }, [resetPricingSetup]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setSelectedProduct(null);
      resetPricingSetup();
      setSearchDone(false);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (query.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const results = await api.searchProducts(query.trim());
          setSearchResults(results);
          setSearchDone(true);
        } catch {
          setSearchResults([]);
          setSearchDone(true);
        } finally {
          setSearching(false);
        }
      }, 350);
    },
    [resetPricingSetup],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const loadProductPricing = useCallback(
    async (product: ProductSearchResult) => {
      setSelectedProduct(product);
      setSearchQuery(product.name);
      setSearchResults([]);
      setSearchDone(false);
      setSearching(false);
      resetPricingSetup();

      setLoadingPricing(true);
      try {
        const plans = await api.getProductPricing(product.slug);
        setPricingPlans(plans);
        if (plans.length > 0) {
          setPlanName(plans[0]!.plan);
        }
      } finally {
        setLoadingPricing(false);
      }
    },
    [resetPricingSetup],
  );

  const handleSelectProduct = useCallback(
    (product: ProductSearchResult) => {
      void loadProductPricing(product);
    },
    [loadProductPricing],
  );

  const handlePlanNameChange = useCallback(
    (nextPlanName: string) => {
      setPlanName(nextPlanName);

      const pricingSeed = pricingSeedFromPlanName(pricingPlans, nextPlanName);
      const seedDraft = createRegionDraft(pricingSeed);

      setRegionDrafts((current) => {
        const next = { ...current };

        for (const region of selectedRegions) {
          const currentDraft = next[region] ?? createRegionDraft(pricingSeed);

          next[region] = {
            ...currentDraft,
            billingCycles: [...seedDraft.billingCycles],
            pricingDetails: { ...seedDraft.pricingDetails },
          };
        }

        return next;
      });
    },
    [pricingPlans, selectedRegions],
  );

  const handleSelectedRegionsChange = useCallback(
    (nextRegions: Region[]) => {
      const orderedNextRegions = orderRegions(nextRegions);
      const addedRegion = orderedNextRegions.find(
        (region) => !selectedRegions.includes(region),
      );
      const activeDraft = activeRegion ? regionDrafts[activeRegion] : undefined;
      const pricingSeed = pricingSeedFromPlanName(pricingPlans, planName);

      setRegionDrafts((current) => {
        const next: Partial<Record<Region, RegionDraft>> = {};

        for (const region of orderedNextRegions) {
          next[region] =
            current[region] ??
            (activeDraft
              ? cloneRegionDraft(activeDraft)
              : createRegionDraft(pricingSeed));
        }

        return next;
      });

      setSelectedRegions(orderedNextRegions);

      if (addedRegion) {
        setActiveRegion(addedRegion);
        return;
      }

      if (orderedNextRegions.length === 0) {
        setActiveRegion(undefined);
        return;
      }

      if (!activeRegion || !orderedNextRegions.includes(activeRegion)) {
        setActiveRegion(orderedNextRegions[0]);
      }
    },
    [activeRegion, planName, pricingPlans, regionDrafts, selectedRegions],
  );

  useEffect(() => {
    if (selectedRegions.length === 0) {
      if (activeRegion) setActiveRegion(undefined);
      return;
    }

    if (!activeRegion || !selectedRegions.includes(activeRegion)) {
      setActiveRegion(selectedRegions[0]);
    }
  }, [activeRegion, selectedRegions]);

  const handleEditExistingSetup = useCallback(
    (skuId: string) => {
      const catalogEntry = skuCatalog.get(skuId);
      if (!catalogEntry?.product || !catalogEntry.plan) return;

      const matchingPool = snapshot.inventoryPools.find(
        (pool) => pool.skuId === skuId,
      );

      setSelectedProduct(toSearchResult(catalogEntry.product));
      setSearchQuery(catalogEntry.product.name);
      setSearchResults([]);
      setSearchDone(false);
      setSearching(false);
      setLoadingPricing(false);
      setPricingPlans([]);
      setPlanName(catalogEntry.plan.name);
      setSelectedRegions([catalogEntry.sku.region]);
      setActiveRegion(catalogEntry.sku.region);
      setRegionDrafts({
        [catalogEntry.sku.region]: regionDraftFromExisting(
          catalogEntry.sku,
          matchingPool?.totalQuantity ?? 0,
        ),
      });

      requestAnimationFrame(() => {
        if (typeof formRef.current?.scrollIntoView === "function") {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    },
    [skuCatalog, snapshot.inventoryPools],
  );

  const updateActiveRegionDraft = useCallback(
    (updater: (draft: RegionDraft) => RegionDraft) => {
      if (!activeRegion) return;

      const pricingSeed = pricingSeedFromPlanName(pricingPlans, planName);

      setRegionDrafts((current) => ({
        ...current,
        [activeRegion]: updater(
          current[activeRegion] ?? createRegionDraft(pricingSeed),
        ),
      }));
    },
    [activeRegion, planName, pricingPlans],
  );

  const updatePricingDetails = useCallback(
    (field: keyof PricingDetails, value: string) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        pricingDetails: {
          ...draft.pricingDetails,
          [field]: value,
        },
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateBillingCycles = useCallback(
    (value: BillingCycle[]) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        billingCycles: value,
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateMinimumUnits = useCallback(
    (value: string) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        minimumUnits: value,
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateMaximumUnits = useCallback(
    (value: string) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        maximumUnits: value,
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateActivationTimeline = useCallback(
    (value: string) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        activationTimeline: value,
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateInventoryQuantity = useCallback(
    (value: number) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        inventoryQuantity: value,
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateInventoryActor = useCallback(
    (value: string) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        inventoryActor: value,
      }));
    },
    [updateActiveRegionDraft],
  );

  const resetForm = useCallback(() => {
    clearSelectedProduct();
  }, [clearSelectedProduct]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedProduct || !derived.summary.canSubmit) return;

      const actionableEntries = derived.regionEntries.filter(
        (entry) => entry.offerActionNeeded || entry.inventoryActionNeeded,
      );

      if (actionableEntries.length === 0) return;

      void runAction(
        () =>
          submitSetupEntries({
            selectedProduct,
            normalizedPlanName: derived.normalizedPlanName,
            existingProduct: derived.existingProduct,
            existingPlan: derived.existingPlan,
            actionableEntries,
          }),
        derived.summary.successMessage,
      ).then((ok) => {
        if (ok) resetForm();
      });
    },
    [derived, resetForm, runAction, selectedProduct],
  );

  return {
    formRef,
    productStep: {
      searchQuery,
      onSearchChange: handleSearch,
      searching,
      searchDone,
      searchResults,
      selectedProduct,
      onSelectProduct: handleSelectProduct,
      onClearProduct: clearSelectedProduct,
      loadingPricing,
      pricingPlans,
      planName,
      onPlanNameChange: handlePlanNameChange,
      selectedPricingPlan: derived.selectedPricingPlan,
      existingProduct: derived.existingProduct,
    },
    billingStep: {
      selectedProduct,
      detailsReady: derived.productPlanReady,
      loadingPricing,
      selectedRegions,
      onSelectedRegionsChange: handleSelectedRegionsChange,
      activeRegion: derived.activeRegionEntry?.region,
      onActiveRegionChange: setActiveRegion,
      existingRegions: derived.existingRegions,
      existingSku: derived.activeRegionEntry?.existingSku,
      generatedSkuCode: derived.activeRegionEntry?.generatedSkuCode ?? "",
      billingCycles: derived.activeDraft.billingCycles,
      onBillingCyclesChange: updateBillingCycles,
      pricingDetails: derived.activeDraft.pricingDetails,
      onPricingDetailsChange: updatePricingDetails,
      minimumUnits: derived.activeDraft.minimumUnits,
      onMinimumUnitsChange: updateMinimumUnits,
      maximumUnits: derived.activeDraft.maximumUnits,
      onMaximumUnitsChange: updateMaximumUnits,
      activationTimeline: derived.activeDraft.activationTimeline,
      onActivationTimelineChange: updateActivationTimeline,
    },
    stockStep: {
      detailsReady:
        derived.productPlanReady && Boolean(derived.activeRegionEntry),
      existingInventoryPool: derived.activeRegionEntry?.existingInventoryPool,
      inventoryQuantity: derived.activeDraft.inventoryQuantity,
      onInventoryQuantityChange: updateInventoryQuantity,
      inventoryRegion: derived.activeRegionEntry?.region ?? "Choose region",
      inventoryActor: derived.activeDraft.inventoryActor,
      onInventoryActorChange: updateInventoryActor,
    },
    reviewPanel: {
      selectedProductName: selectedProduct?.name,
      planName: derived.normalizedPlanName,
      selectedRegions,
      activeRegion: derived.activeRegionEntry?.region,
      pricingOptions: derived.reviewPricingOptions,
      existingSku: derived.activeRegionEntry?.existingSku,
      generatedSkuCode: derived.activeRegionEntry?.generatedSkuCode ?? "",
      saveMessage: derived.summary.saveMessage,
    },
    submit: {
      canSubmit: derived.summary.canSubmit,
      showEditIcon: derived.summary.showEditIcon,
      label: derived.summary.submitLabel,
      saveMessage: derived.summary.saveMessage,
      onSubmit: handleSubmit,
    },
    recentSetupsPanel: {
      entries: derived.recentSetups,
      editingSkuId: derived.activeRegionEntry?.existingSku?._id,
      onEditSetup: handleEditExistingSetup,
    },
  };
}
