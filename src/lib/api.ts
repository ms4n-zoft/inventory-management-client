import type { DashboardSnapshot } from "../types";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "content-type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: "request failed" }))) as { message?: string };
    throw new Error(payload.message ?? "request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<DashboardSnapshot>("/api/dashboard"),
  createVendor: (payload: { name: string }) =>
    request("/api/vendors", { method: "POST", body: JSON.stringify(payload) }),
  createProduct: (payload: { vendorId: string; name: string; description: string }) =>
    request("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  createPlan: (payload: { productId: string; name: string; planType: "standard" | "enterprise" }) =>
    request("/api/plans", { method: "POST", body: JSON.stringify(payload) }),
  createSku: (payload: {
    planId: string;
    code: string;
    billingPeriod: "monthly" | "yearly";
    region: "GLOBAL" | "US" | "EU" | "INDIA" | "APAC";
    seatType: "seat" | "license_key";
  }) => request("/api/skus", { method: "POST", body: JSON.stringify(payload) }),
  createInventoryPool: (payload: { skuId: string; region: string; totalQuantity: number }) =>
    request("/api/inventory-pools", { method: "POST", body: JSON.stringify(payload) }),
  adjustInventory: (payload: {
    skuId: string;
    region: string;
    change: number;
    reason: "MANUAL_ADD" | "MANUAL_REMOVE" | "EXTERNAL_VENDOR_SALE" | "REFUND" | "CORRECTION";
    actor: string;
  }) => request("/api/inventory-adjustments", { method: "POST", body: JSON.stringify(payload) }),
  createReservation: (payload: { skuId: string; region: string; quantity: number; actor: string }) =>
    request("/api/reservations", { method: "POST", body: JSON.stringify(payload) }),
  confirmReservation: (reservationId: string, payload: { customerId: string; actor: string }) =>
    request(`/api/reservations/${reservationId}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  cancelReservation: (reservationId: string, payload: { actor: string }) =>
    request(`/api/reservations/${reservationId}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  processExpiredReservations: () =>
    request("/api/system/process-expired-reservations", {
      method: "POST",
      body: JSON.stringify({})
    })
};
