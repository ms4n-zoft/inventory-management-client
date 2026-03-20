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
import {
  applyPricingDetailsChange,
  orderRegions,
  syncPricingDetailsByBillingCycles,
} from "@/lib/billing-option";
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [regionDrafts, setRegionDrafts] = useState<
    Partial<Record<Region, RegionDraft>>
  >({});

  const derived = useMemo(
    () =>
      buildSetupPageDerivedState({
        snapshot,
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
            pricingDetailsByCycle: {
              monthly: { ...seedDraft.pricingDetailsByCycle.monthly },
              yearly: { ...seedDraft.pricingDetailsByCycle.yearly },
              one_time: { ...seedDraft.pricingDetailsByCycle.one_time },
            },
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

      setActiveRegion(orderedNextRegions[0]);
    },
    [activeRegion, planName, pricingPlans, regionDrafts],
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

  const updateRegionDraft = useCallback(
    (region: Region, updater: (draft: RegionDraft) => RegionDraft) => {
      const pricingSeed = pricingSeedFromPlanName(pricingPlans, planName);

      setRegionDrafts((current) => ({
        ...current,
        [region]: updater(current[region] ?? createRegionDraft(pricingSeed)),
      }));
    },
    [planName, pricingPlans],
  );

  const updateActiveRegionDraft = useCallback(
    (updater: (draft: RegionDraft) => RegionDraft) => {
      if (!activeRegion) return;

      updateRegionDraft(activeRegion, updater);
    },
    [activeRegion, updateRegionDraft],
  );

  const updatePricingDetails = useCallback(
    (
      billingCycle: BillingCycle,
      field: keyof PricingDetails,
      value: string,
    ) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        pricingDetailsByCycle: applyPricingDetailsChange({
          billingCycles: draft.billingCycles,
          pricingDetailsByCycle: draft.pricingDetailsByCycle,
          billingCycle,
          field,
          value,
        }),
      }));
    },
    [updateActiveRegionDraft],
  );

  const updateBillingCycles = useCallback(
    (value: BillingCycle[]) => {
      updateActiveRegionDraft((draft) => ({
        ...draft,
        billingCycles: value,
        pricingDetailsByCycle: syncPricingDetailsByBillingCycles({
          billingCycles: value,
          pricingDetailsByCycle: draft.pricingDetailsByCycle,
        }),
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
    (region: Region, value: number) => {
      updateRegionDraft(region, (draft) => ({
        ...draft,
        inventoryQuantity: value,
      }));
    },
    [updateRegionDraft],
  );

  const updateInventoryActor = useCallback(
    (region: Region, value: string) => {
      updateRegionDraft(region, (draft) => ({
        ...draft,
        inventoryActor: value,
      }));
    },
    [updateRegionDraft],
  );

  const resetForm = useCallback(() => {
    setReviewOpen(false);
    clearSelectedProduct();
  }, [clearSelectedProduct]);

  const submitEntries = useCallback(async () => {
    if (!selectedProduct || !derived.summary.canSubmit) return;

    const actionableEntries = derived.regionEntries.filter(
      (entry) => entry.offerActionNeeded || entry.inventoryActionNeeded,
    );

    if (actionableEntries.length === 0) return false;

    const ok = await runAction(
      () =>
        submitSetupEntries({
          selectedProduct,
          normalizedPlanName: derived.normalizedPlanName,
          existingProduct: derived.existingProduct,
          existingPlan: derived.existingPlan,
          actionableEntries,
        }),
      derived.summary.successMessage,
    );

    if (ok) resetForm();

    return ok;
  }, [derived, resetForm, runAction, selectedProduct]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  const openReview = useCallback(() => {
    if (!derived.summary.canSubmit) return;

    setReviewOpen(true);
  }, [derived.summary.canSubmit]);

  const handleConfirmSubmit = useCallback(() => {
    void submitEntries();
  }, [submitEntries]);

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
      pricingDetailsByCycle: derived.activeDraft.pricingDetailsByCycle,
      onPricingDetailsChange: updatePricingDetails,
      minimumUnits: derived.activeDraft.minimumUnits,
      onMinimumUnitsChange: updateMinimumUnits,
      maximumUnits: derived.activeDraft.maximumUnits,
      onMaximumUnitsChange: updateMaximumUnits,
      activationTimeline: derived.activeDraft.activationTimeline,
      onActivationTimelineChange: updateActivationTimeline,
    },
    stockStep: {
      detailsReady: derived.productPlanReady && selectedRegions.length > 0,
      entries: derived.regionEntries.map((entry) => ({
        region: entry.region,
        stockTrackingEnabled: entry.stockTrackingEnabled,
        existingInventoryPool: entry.existingInventoryPool,
        inventoryQuantity: entry.draft.inventoryQuantity,
        inventoryActor: entry.draft.inventoryActor,
      })),
      onInventoryQuantityChange: updateInventoryQuantity,
      onInventoryActorChange: updateInventoryActor,
    },
    reviewDialog: {
      open: reviewOpen,
      onOpenChange: setReviewOpen,
      selectedProductName: selectedProduct?.name,
      planName: derived.normalizedPlanName,
      entries: derived.regionEntries,
      saveMessage: derived.summary.saveMessage,
    },
    submit: {
      canSubmit: derived.summary.canSubmit,
      label: "Review and create offers",
      saveMessage: derived.summary.saveMessage,
      onSubmit: handleSubmit,
      openReview,
      confirm: handleConfirmSubmit,
    },
  };
}
